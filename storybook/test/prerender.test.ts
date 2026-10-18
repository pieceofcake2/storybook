import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { main } from '../src/prerender/cli.js';
import {
    addMarker,
    isRenderErrorPage,
    parseRenderRequest,
    PRERENDERED_META,
    removeMarker,
    storedRender,
    storiesOf,
    storyFileName,
} from '../src/prerender/output.js';
import { checkServer, launchOptions, PrerenderError, type PrerenderOptions, type PrerenderResult } from '../src/prerender/prerender.js';
import { PROXY_ERROR_HEADER, resolveBuildFile, startBuildServer } from '../src/prerender/server.js';

const IFRAME = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n  </head>\n  <body></body>\n</html>\n';

describe('storiesOf', () => {
    it('returns the stories of index.json', () => {
        const index = {
            v: 5,
            entries: {
                'a--docs': { id: 'a--docs', type: 'docs' },
                'a--one': { id: 'a--one', type: 'story', tags: ['test'] },
            },
        };

        expect(storiesOf(index).map((entry) => entry.id)).toEqual(['a--one']);
    });

    it('throws for a file that is not the index of a build', () => {
        expect(() => storiesOf({})).toThrow('index.json has no entries');
    });
});

describe('addMarker and removeMarker', () => {
    it('adds the marker to the head of iframe.html once', () => {
        const html = addMarker(addMarker(IFRAME, 'cakephp-prerendered/'), 'cakephp-prerendered/');

        expect(html).toContain(`<head>\n    <meta name="${PRERENDERED_META}" content="cakephp-prerendered/">\n    <meta charset`);
        expect(html.split(PRERENDERED_META)).toHaveLength(2);
        expect(removeMarker(html)).toBe(IFRAME);
    });

    it('escapes the directory', () => {
        expect(addMarker(IFRAME, 'a"b/')).toContain('content="a&#34;b/"');
    });

    it('requires a head', () => {
        expect(() => addMarker('<p></p>')).toThrow('no <head>');
    });
});

describe('parseRenderRequest', () => {
    it('accepts the body of a render request', () => {
        expect(parseRenderRequest('POST', '{"element":"components/button","args":{"a":1}}')).toEqual({
            element: 'components/button',
            args: { a: 1 },
        });
        expect(parseRenderRequest('POST', '{"template":"alert_list"}')).toEqual({ template: 'alert_list' });
    });

    it.each([
        ['GET', '{"element":"components/button"}'],
        ['POST', null],
        ['POST', 'not json'],
        ['POST', '[]'],
        ['POST', '{"args":{}}'],
        ['POST', '{"element":"x","other":1}'],
        ['POST', '{"element":1}'],
    ])('rejects other requests (%s %s)', (method, body) => {
        expect(parseRenderRequest(method, body)).toBeNull();
    });
});

describe('isRenderErrorPage', () => {
    it('recognizes the error pages of the render endpoint', () => {
        expect(isRenderErrorPage('<!-- Not found -->\n<div class="storybook-cakephp-error"></div>')).toBe(true);
        expect(isRenderErrorPage('<!DOCTYPE html>\n<h1>Not Found</h1>')).toBe(false);
        expect(isRenderErrorPage('<!-- comment -->\n<h1>Not Found</h1>')).toBe(false);
    });
});

describe('storedRender', () => {
    it('replaces the URL of the Storybook served for the pre-rendering', () => {
        const base = 'http://127.0.0.1:4567/';

        expect(storedRender(`{"element":"c","args":{"src":"${base}assets/a.jpg"}}`, 200, `<img src="${base}assets/a.jpg">`, base)).toEqual({
            request: '{"element":"c","args":{"src":"{{storybook-cakephp-base}}/assets/a.jpg"}}',
            status: 200,
            html: '<img src="{{storybook-cakephp-base}}/assets/a.jpg">',
        });
    });
});

describe('storyFileName', () => {
    it('is the story ID', () => {
        expect(storyFileName('components-button--primary')).toBe('components-button--primary.json');
    });
});

describe('launchOptions', () => {
    it.each([
        ['chrome', { channel: 'chrome' }],
        ['msedge', { channel: 'msedge' }],
        ['chromium', {}],
        ['/usr/bin/chromium', { executablePath: '/usr/bin/chromium' }],
        ['C:\\Chrome\\chrome.exe', { executablePath: 'C:\\Chrome\\chrome.exe' }],
    ])('%s', (browser, expected) => {
        expect(launchOptions(browser)).toEqual(expected);
    });
});

describe('checkServer', () => {
    const listen = async (handler: Parameters<typeof createServer>[1]): Promise<{ url: string; close: () => Promise<void> }> => {
        const server = createServer(handler);
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

        return {
            url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/`,
            close: () => new Promise((resolve) => server.close(() => resolve())),
        };
    };

    it('does not follow redirects (e.g. to App.fullBaseUrl that cannot be reached)', async () => {
        const app = await listen((req, res) => {
            res.writeHead(302, { Location: 'https://127.0.0.1:9/users/login' }).end();
        });
        try {
            await expect(checkServer(app.url)).resolves.toBeUndefined();
        } finally {
            await app.close();
        }
    });

    it('accepts error responses', async () => {
        const app = await listen((req, res) => res.writeHead(500).end());
        try {
            await expect(checkServer(app.url)).resolves.toBeUndefined();
        } finally {
            await app.close();
        }
    });

    it('fails when the application cannot be reached', async () => {
        const error = await checkServer('http://127.0.0.1:9/').catch((e: unknown) => e);

        expect(error).toBeInstanceOf(PrerenderError);
        expect(String(error)).toContain('Failed to connect to the CakePHP application at http://127.0.0.1:9/');
    });
});

describe('resolveBuildFile', () => {
    it('resolves paths inside the build only', () => {
        expect(resolveBuildFile('/build', '/iframe.html')).toBe(join('/build', 'iframe.html'));
        expect(resolveBuildFile('/build', '/assets/a%20b.js')).toBe(join('/build', 'assets', 'a b.js'));
        expect(resolveBuildFile('/build', '/../etc/passwd')).toBe(join('/build', 'etc', 'passwd'));
        expect(resolveBuildFile('/build', '/%2e%2e/%2e%2e/etc/passwd')).toBe(join('/build', 'etc', 'passwd'));
        expect(resolveBuildFile('/build', '/%E0%A4%A')).toBeNull();
        expect(resolveBuildFile('/build', '/a%00b')).toBeNull();
    });
});

describe('startBuildServer', () => {
    let dir: string;
    let app: Server;
    let appUrl: string;
    const received: { method?: string; url?: string; proxy?: string; host?: string; body: string }[] = [];

    beforeAll(async () => {
        dir = await mkdtemp(join(tmpdir(), 'storybook-cakephp-'));
        await mkdir(join(dir, 'assets'));
        await writeFile(join(dir, 'iframe.html'), addMarker(IFRAME));
        await writeFile(join(dir, 'index.html'), '<p>manager</p>');
        await writeFile(join(dir, 'assets', 'a.js'), 'export {};');
        app = createServer((req, res) => {
            let body = '';
            req.on('data', (chunk) => (body += chunk));
            req.on('end', () => {
                received.push({ method: req.method, url: req.url, proxy: req.headers['x-storybook-proxy'] as string, host: req.headers.host, body });
                if (req.url === '/redirect') {
                    res.writeHead(302, { location: 'https://127.0.0.1:9/users/login' }).end();

                    return;
                }
                res.writeHead(200, { 'content-type': 'text/html' }).end('<p>from the app</p>');
            });
        });
        await new Promise<void>((resolve) => app.listen(0, '127.0.0.1', resolve));
        appUrl = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
    });

    afterAll(async () => {
        await new Promise((resolve) => app.close(resolve));
        await rm(dir, { recursive: true, force: true });
    });

    it('serves the build, iframe.html without the marker, and forwards the other requests to the application', async () => {
        const server = await startBuildServer(dir, appUrl);
        try {
            const iframe = await fetch(`${server.url}iframe.html?id=x`);
            expect(iframe.headers.get('content-type')).toBe('text/html; charset=utf-8');
            expect(await iframe.text()).toBe(IFRAME);

            expect(await (await fetch(server.url)).text()).toBe('<p>manager</p>');
            const script = await fetch(`${server.url}assets/a.js`);
            expect(script.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
            expect(await script.text()).toBe('export {};');

            const render = await fetch(`${server.url}_storybook/render/x`, { method: 'POST', body: '{"element":"c"}' });
            expect(await render.text()).toBe('<p>from the app</p>');
            expect(received.at(-1)).toEqual({
                method: 'POST',
                url: '/_storybook/render/x',
                proxy: 'true',
                host: new URL(appUrl).host,
                body: '{"element":"c"}',
            });

            await fetch(`${server.url}img/logo.svg`);
            expect(received.at(-1)?.url).toBe('/img/logo.svg');

            // Redirects of the application are passed to the browser, not followed
            const redirect = await fetch(`${server.url}redirect`, { redirect: 'manual' });
            expect(redirect.status).toBe(302);
            expect(redirect.headers.get('location')).toBe('https://127.0.0.1:9/users/login');
        } finally {
            await server.close();
        }
    });

    it('marks the responses when the application cannot be reached', async () => {
        const server = await startBuildServer(dir, 'http://127.0.0.1:9');
        try {
            const response = await fetch(`${server.url}_storybook/render/x`, { method: 'POST', body: '{}' });

            expect(response.status).toBe(502);
            expect(response.headers.get(PROXY_ERROR_HEADER)).toBe('true');
        } finally {
            await server.close();
        }
    });
});

describe('main', () => {
    const run = async (argv: string[], result?: PrerenderResult | Error) => {
        const output = { stdout: '', stderr: '' };
        const prerender = vi.fn(async (options: PrerenderOptions) => {
            options.log('ok - a--one');
            if (result instanceof Error) {
                throw result;
            }

            return result ?? { stories: 1, renders: 1, failures: [], warnings: [] };
        });
        const code = await main(argv, {
            stdout: (text) => (output.stdout += text),
            stderr: (text) => (output.stderr += text),
            env: {},
            prerender,
        });

        return { code, ...output, prerender };
    };

    it('pre-renders with the options', async () => {
        const { code, stdout, prerender } = await run([
            'prerender',
            '--server',
            'http://127.0.0.1:8765',
            '--dir',
            'webroot/storybook',
            '--browser',
            'chromium',
            '--concurrency',
            '2',
        ]);

        expect(code).toBe(0);
        expect(prerender).toHaveBeenCalledWith(
            expect.objectContaining({
                server: 'http://127.0.0.1:8765',
                dir: 'webroot/storybook',
                browser: 'chromium',
                concurrency: 2,
                timeout: 30000,
            })
        );
        expect(stdout).toContain('ok - a--one\n');
        expect(stdout).toContain('Pre-rendered 1 stories (1 renders) into webroot/storybook/cakephp-prerendered/');
    });

    it('uses the defaults', async () => {
        const { prerender } = await run(['prerender', '--server', 'http://localhost:8765']);

        expect(prerender).toHaveBeenCalledWith(expect.objectContaining({ dir: 'storybook-static', browser: 'chrome', concurrency: 4 }));
    });

    it('fails when stories could not be pre-rendered, and shows the warnings', async () => {
        const { code, stdout, stderr } = await run(['prerender', '--server', 'http://localhost:8765'], {
            stories: 1,
            renders: 1,
            failures: [{ id: 'a--two', message: 'Timeout' }],
            warnings: [{ id: 'a--one', message: 'storyErrored: Server failed' }],
        });

        expect(code).toBe(1);
        expect(stdout).toContain('warning - a--one: storyErrored: Server failed');
        expect(stderr).toContain('a--two: Timeout');
    });

    it('fails on a fatal error', async () => {
        const { code, stderr } = await run(['prerender', '--server', 'http://localhost:8765'], new Error('Boom'));

        expect(code).toBe(1);
        expect(stderr).toContain('Boom');
    });

    it.each([
        [[], 'A command is required.'],
        [['build'], 'Unknown command "build".'],
        [['prerender'], '--server must be the URL'],
        [['prerender', '--server', 'localhost:8765'], '--server must be the URL'],
        [['prerender', '--server', 'http://localhost', '--concurrency', '0'], '--concurrency must be a positive integer.'],
        [['prerender', '--unknown'], "Unknown option '--unknown'"],
    ])('rejects invalid arguments: %j', async (argv, message) => {
        const { code, stderr, prerender } = await run(argv);

        expect(code).toBe(2);
        expect(stderr).toContain(message);
        expect(stderr).toContain('Usage: storybook-cakephp prerender');
        expect(prerender).not.toHaveBeenCalled();
    });

    it('shows the help', async () => {
        const { code, stdout } = await run(['--help']);

        expect(code).toBe(0);
        expect(stdout).toContain('Usage: storybook-cakephp prerender');
    });
});
