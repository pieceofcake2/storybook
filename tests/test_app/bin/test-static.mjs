// Checks a static build of Storybook: opens each story in Chromium and fails if it does not render,
// or if its play function fails. The stories tagged expect-error must show the error returned by
// the application instead.
//
// node bin/test-static.mjs http://127.0.0.1:8765/storybook/
//     The build served on the same origin as the application, which renders the stories
//
// node bin/test-static.mjs --prerendered webroot http://127.0.0.1:8766/storybook/
//     The pre-rendered build (storybook-cakephp prerender) with the application stopped: the
//     directory is served as static files, and no render request must be made. Changed args must
//     show the notice of a static Storybook.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { prerendered: { type: 'string' } },
});
const base = new URL(positionals[0] ?? 'http://127.0.0.1:8765/storybook/');
const prerendered = values.prerendered !== undefined;

// A static file server (no PHP), as the storage or CDN of a deployed Storybook
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
let server;
if (prerendered) {
    const root = resolve(values.prerendered);
    server = createServer(async (req, res) => {
        const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        let file = join(root, normalize(`/${path}`));
        if (path.endsWith('/')) {
            file = join(file, 'index.html');
        }
        const found = req.method === 'GET' && !file.endsWith('.php') && (await stat(file).catch(() => null))?.isFile();
        if (!found) {
            res.writeHead(404).end();

            return;
        }
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
        createReadStream(file).pipe(res);
    });
    await new Promise((done) => server.listen(Number(base.port), base.hostname, done));
}

const index = await (await fetch(new URL('index.json', base))).json();
const stories = Object.values(index.entries).filter(
    (entry) => entry.type === 'story' && (entry.tags.includes('test') || entry.tags.includes('expect-error'))
);

const browser = await chromium.launch();
const failures = [];

const openStory = async (id, query = '') => {
    const page = await browser.newPage();
    const renderRequests = [];
    page.on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/_storybook/render')) {
            renderRequests.push(request.url());
        }
    });
    // Record the events of the Storybook channel as soon as it is created
    await page.addInitScript(() => {
        window.__storybookEvents = [];
        let channel;
        Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
            configurable: true,
            get: () => channel,
            set: (value) => {
                channel = value;
                const emit = value.emit.bind(value);
                value.emit = (name, ...args) => {
                    window.__storybookEvents.push({ name, payload: args[0] });

                    return emit(name, ...args);
                };
            },
        });
    });
    await page.goto(String(new URL(`iframe.html?id=${encodeURIComponent(id)}&viewMode=story${query}`, base)));
    const event = await page.waitForFunction(
        () =>
            window.__storybookEvents?.find((event) =>
                ['storyFinished', 'storyErrored', 'storyThrewException', 'playFunctionThrewException'].includes(event.name)
            ),
        undefined,
        { timeout: 15000 }
    );

    return { page, renderRequests, ...(await event.jsonValue()) };
};

const check = async (name, test) => {
    let page;
    try {
        page = await test((opened) => (page = opened));
        console.log(`ok - ${name}`);
    } catch (error) {
        failures.push(name);
        console.log(`not ok - ${name}\n  ${String(error).split('\n').join('\n  ')}`);
    } finally {
        await page?.close();
    }
};

const assertNoRenderRequests = (renderRequests) => {
    if (prerendered && renderRequests.length > 0) {
        throw new Error(`Render requests were made by a pre-rendered build: ${renderRequests.join(', ')}`);
    }
};

for (const story of stories) {
    await check(story.id, async (keep) => {
        const { page, renderRequests, name, payload } = await openStory(story.id);
        keep(page);
        if (story.tags.includes('expect-error')) {
            const errorShown = await page.locator('#storybook-root .storybook-cakephp-error').count();
            if (name !== 'storyErrored' || errorShown !== 1) {
                throw new Error(`The error is not shown: ${name}: ${JSON.stringify(payload)}`);
            }
        } else if (name !== 'storyFinished' || payload.status !== 'success') {
            throw new Error(`${name}: ${JSON.stringify(payload)}`);
        }
        assertNoRenderRequests(renderRequests);

        return page;
    });
}

if (prerendered) {
    await check('changed args show the notice of a static Storybook', async (keep) => {
        const { page, renderRequests } = await openStory('components-button--primary', '&args=label:Changed');
        keep(page);
        await page.locator('#storybook-root .storybook-cakephp-static-notice').waitFor({ timeout: 5000 });
        assertNoRenderRequests(renderRequests);

        return page;
    });
}

await browser.close();
server?.close();
const total = stories.length + (prerendered ? 1 : 0);
console.log(`\n${total - failures.length}/${total} checks passed with ${prerendered ? 'the pre-rendered build' : 'the build'} at ${base}`);
process.exit(failures.length === 0 && stories.length > 0 ? 0 : 1);
