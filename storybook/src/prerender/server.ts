import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer, request as httpRequest, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve, sep } from 'node:path';

import { removeMarker } from './output.js';

const CONTENT_TYPES: Record<string, string> = {
    '.avif': 'image/avif',
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.wasm': 'application/wasm',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

/**
 * Header of the responses of the server when the application cannot be reached.
 */
export const PROXY_ERROR_HEADER = 'x-storybook-cakephp-proxy-error';

/**
 * Returns the file of the build for the path of a request, or null if the path is outside the
 * build.
 */
export const resolveBuildFile = (dir: string, pathname: string): string | null => {
    let path: string;
    try {
        path = decodeURIComponent(pathname);
    } catch {
        return null;
    }
    if (path.includes('\0')) {
        return null;
    }
    const root = resolve(dir);
    const file = resolve(root, `.${normalize(`/${path}`)}`);

    return file === root || file.startsWith(`${root}${sep}`) ? file : null;
};

const isFile = async (file: string): Promise<boolean> => (await stat(file).catch(() => null))?.isFile() ?? false;

/**
 * Forwards a request to the application, as the proxy of `storybook dev` does (with the
 * `X-Storybook-Proxy: true` header).
 */
const proxy = (req: IncomingMessage, res: ServerResponse, server: URL): void => {
    const target = new URL(req.url ?? '/', server);
    const headers = { ...req.headers, host: target.host, 'x-storybook-proxy': 'true' };
    delete headers.origin;
    delete headers.referer;
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const upstream = send(target, { method: req.method, headers }, (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
    });
    upstream.on('error', (error) => {
        if (!res.headersSent) {
            res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', [PROXY_ERROR_HEADER]: 'true' });
        }
        res.end(`Failed to connect to the CakePHP application at ${server.origin}: ${error.message}`);
    });
    req.pipe(upstream);
};

/**
 * Serves a Storybook build for the pre-rendering, at the root of a local HTTP server.
 *
 * The files of the build are served (`iframe.html` without the marker of a pre-rendered Storybook,
 * so that the preview requests the application). Other requests (the render requests, and the
 * images and assets of the application referred to by the HTML) are forwarded to the application.
 */
export const startBuildServer = async (dir: string, server: string, port = 0): Promise<{ url: string; close: () => Promise<void> }> => {
    const serverUrl = new URL(server);
    const root = resolve(dir);
    const iframe = join(root, 'iframe.html');

    const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        let file = resolveBuildFile(root, pathname);
        if (file !== null && pathname.endsWith('/')) {
            file = join(file, 'index.html');
        }
        if ((req.method === 'GET' || req.method === 'HEAD') && file !== null && (await isFile(file))) {
            const headers = {
                'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
                'cache-control': 'no-store',
            };
            if (file === iframe) {
                res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : removeMarker(await readFile(file, 'utf8')));

                return;
            }
            res.writeHead(200, headers);
            if (req.method === 'HEAD') {
                res.end();

                return;
            }
            createReadStream(file).pipe(res);

            return;
        }
        proxy(req, res, serverUrl);
    };

    const httpServer: Server = createServer((req, res) => {
        handler(req, res).catch((error: unknown) => {
            if (!res.headersSent) {
                res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
            }
            res.end(String(error));
        });
    });
    await new Promise<void>((resolveListen, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, '127.0.0.1', () => resolveListen());
    });
    const address = httpServer.address() as AddressInfo;

    return {
        url: `http://127.0.0.1:${address.port}/`,
        close: () =>
            new Promise<void>((resolveClose) => {
                httpServer.closeAllConnections();
                httpServer.close(() => resolveClose());
            }),
    };
};
