import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { addMarker, isRenderErrorPage, parseRenderRequest, PRERENDERED_DIR, storedRender, storiesOf, storyFileName, } from './output.js';
import { PROXY_ERROR_HEADER, startBuildServer } from './server.js';
/**
 * Fatal error: the pre-rendering stops (e.g. the render endpoint is not available).
 */
export class PrerenderError extends Error {
    name = 'PrerenderError';
}
/**
 * Returns the launch options of Playwright for the `--browser` option.
 */
export const launchOptions = (browser) => {
    if (browser === 'chromium') {
        return {};
    }
    if (/[\\/]/.test(browser) || /\.exe$/i.test(browser)) {
        return { executablePath: browser };
    }
    return { channel: browser };
};
const loadChromium = async () => {
    // Resolve playwright-core from the project first (the framework may be a symlink)
    let specifier = 'playwright-core';
    try {
        specifier = pathToFileURL(createRequire(join(process.cwd(), 'package.json')).resolve('playwright-core')).href;
    }
    catch {
        // Resolved from the framework below
    }
    try {
        const module = (await import(specifier));
        const chromium = module.chromium ?? module.default?.chromium;
        if (chromium !== undefined) {
            return chromium;
        }
    }
    catch {
        // Not installed
    }
    throw new PrerenderError('playwright-core is required to pre-render the stories: npm install --save-dev playwright-core');
};
/**
 * Records the events of the Storybook channel in `window.__storybookCakephpEvents`.
 */
function recordChannelEvents() {
    const target = window;
    target.__storybookCakephpEvents = [];
    let channel;
    Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
        configurable: true,
        get: () => channel,
        set: (value) => {
            channel = value;
            const emit = value.emit.bind(value);
            value.emit = (name, ...args) => {
                target.__storybookCakephpEvents.push({ name, payload: args[0] });
                return emit(name, ...args);
            };
        },
    });
}
/**
 * Pre-renders a story: opens it in the browser, and records its render requests and the
 * responses of the application.
 */
const prerenderStory = async (page, base, story, timeout) => {
    const renders = [];
    const pending = [];
    let fatal = null;
    const record = async (request) => {
        const postData = request.postData();
        if (parseRenderRequest(request.method(), postData) === null || postData === null) {
            return;
        }
        const response = await request.response();
        if (response === null) {
            return;
        }
        const html = await response.text();
        const status = response.status();
        if (response.headers()[PROXY_ERROR_HEADER] !== undefined) {
            fatal = new PrerenderError(html);
            return;
        }
        if ((status < 200 || status >= 300) && !isRenderErrorPage(html)) {
            fatal = new PrerenderError(`${request.url()} returned ${status} without the error page of the render endpoint. Is the ` +
                `application running in debug mode (debug >= 1) with the Storybook plugin loaded with its routes?`);
            return;
        }
        const render = storedRender(postData, status, html, base);
        if (!renders.some((item) => item.request === render.request)) {
            renders.push(render);
        }
    };
    page.on('requestfinished', (request) => pending.push(record(request)));
    page.on('requestfailed', (request) => {
        if (parseRenderRequest(request.method(), request.postData()) !== null) {
            fatal = new PrerenderError(`The render request ${request.url()} failed.`);
        }
    });
    await page.goto(`${base}iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`);
    const handle = await page.waitForFunction(() => window.__storybookCakephpEvents?.find((event) => [
        'storyFinished',
        'storyErrored',
        'storyThrewException',
        'playFunctionThrewException',
        'storyMissing',
    ].includes(event.name)), undefined, { timeout });
    const event = (await handle.jsonValue());
    await Promise.all(pending);
    if (fatal !== null) {
        throw fatal;
    }
    return { renders, event };
};
const describeEvent = (event) => {
    const payload = event.payload;
    if (event.name === 'storyFinished') {
        return payload?.status === 'success' ? null : `the story finished with the status "${payload?.status}"`;
    }
    const detail = payload?.description ?? payload?.message;
    return detail === undefined ? event.name : `${event.name}: ${detail}`;
};
/**
 * Checks that the CakePHP application can be reached: any HTTP response (including a redirect or
 * an error) means that it is running. Redirects are not followed, since they can point to another
 * URL (e.g. a login page on `App.fullBaseUrl`) that cannot be reached from here.
 *
 * @throws PrerenderError When the application cannot be reached
 */
export const checkServer = async (server) => {
    try {
        await fetch(server, { method: 'HEAD', redirect: 'manual' });
    }
    catch (error) {
        const cause = error instanceof Error && error.cause !== undefined ? ` (${String(error.cause)})` : '';
        throw new PrerenderError(`Failed to connect to the CakePHP application at ${server}: ${String(error)}${cause}`);
    }
};
/**
 * Pre-renders all the stories of a Storybook build with the CakePHP application, so that the build
 * is static: it loads the HTML of the stories from `<dir>/cakephp-prerendered/` instead of
 * requesting the application.
 *
 * The build is opened in a headless browser, so that the args are computed by the built preview
 * (the args of the meta and of the story, the render functions, and the URLs of the imported
 * assets), and the render requests are forwarded to the application.
 */
export const prerender = async (options) => {
    const dir = resolve(options.dir);
    const index = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8').catch(() => {
        throw new PrerenderError(`${join(dir, 'index.json')} was not found. Run "storybook build" first.`);
    }));
    const stories = storiesOf(index);
    const iframeHtml = await readFile(join(dir, 'iframe.html'), 'utf8');
    await checkServer(options.server);
    const chromium = await loadChromium();
    const buildServer = await startBuildServer(dir, options.server);
    const result = { stories: 0, renders: 0, failures: [], warnings: [] };
    const outDir = join(dir, PRERENDERED_DIR);
    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });
    let browser = null;
    try {
        browser = await chromium.launch({ ...launchOptions(options.browser), headless: true });
        const context = await browser.newContext();
        const queue = [...stories];
        const worker = async () => {
            for (let story = queue.shift(); story !== undefined; story = queue.shift()) {
                const page = await context.newPage();
                await page.addInitScript(recordChannelEvents);
                try {
                    const { renders, event } = await prerenderStory(page, buildServer.url, story, options.timeout);
                    if (renders.length === 0) {
                        result.failures.push({ id: story.id, message: describeEvent(event) ?? 'no render request' });
                        options.log(`not ok - ${story.id}: ${describeEvent(event) ?? 'no render request'}`);
                        continue;
                    }
                    const file = { version: 1, renders };
                    await writeFile(join(outDir, storyFileName(story.id)), `${JSON.stringify(file)}\n`);
                    result.stories += 1;
                    result.renders += renders.length;
                    const warning = describeEvent(event);
                    if (warning !== null) {
                        result.warnings.push({ id: story.id, message: warning });
                    }
                    options.log(`${warning === null ? 'ok' : 'ok (with an error)'} - ${story.id}`);
                }
                catch (error) {
                    if (error instanceof PrerenderError) {
                        queue.length = 0;
                        throw error;
                    }
                    result.failures.push({ id: story.id, message: String(error).split('\n', 1)[0] ?? '' });
                    options.log(`not ok - ${story.id}: ${String(error).split('\n', 1)[0]}`);
                }
                finally {
                    await page.close();
                }
            }
        };
        await Promise.all(Array.from({ length: Math.max(1, Math.min(options.concurrency, stories.length)) }, worker));
        await context.close();
    }
    finally {
        await browser?.close();
        await buildServer.close();
    }
    await writeFile(join(dir, 'iframe.html'), addMarker(iframeHtml, PRERENDERED_DIR));
    return result;
};
