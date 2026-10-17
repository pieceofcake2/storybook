import { resolve } from 'node:path';

import type { Plugin, ViteDevServer } from 'vite';
import { describe, expect, it, vi } from 'vitest';

import { cakephpViteFinal, createProxyConfig, RENDER_PATH, watchPathsPlugin } from '../src/vite.js';

const plugin = (name: string): Plugin => ({ name });

describe('createProxyConfig', () => {
    it('is empty without the server', () => {
        expect(createProxyConfig({ proxyPaths: ['/img'] })).toEqual({});
    });

    it('proxies the render endpoint to the server with the X-Storybook-Proxy header', () => {
        expect(createProxyConfig({ server: 'http://localhost:8765' })).toEqual({
            [RENDER_PATH]: {
                target: 'http://localhost:8765',
                changeOrigin: true,
                secure: false,
                headers: { 'X-Storybook-Proxy': 'true' },
            },
        });
    });

    it('proxies the proxy paths, without duplicates', () => {
        const proxy = createProxyConfig({ server: 'https://localhost:8000', proxyPaths: ['/img', '/build', RENDER_PATH] }, 'PRODUCTION');

        expect(Object.keys(proxy)).toEqual([RENDER_PATH, '/img', '/build']);
        expect(proxy['/img']).toMatchObject({ target: 'https://localhost:8000', secure: true });
        expect(Object.keys(createProxyConfig({ server: 'http://x', proxyPaths: '/img' }))).toEqual([RENDER_PATH, '/img']);
    });
});

describe('cakephpViteFinal', () => {
    it('removes the hot-file plugin by default, including nested and async plugins', async () => {
        const config = await cakephpViteFinal(
            { plugins: [plugin('hot-file'), [plugin('sass'), Promise.resolve(plugin('hot-file'))], plugin('app')] },
            { server: 'http://localhost:8765' }
        );

        const names = (config.plugins as unknown[]).flat(2).map((p) => (p as Plugin).name);
        expect(names).toEqual(['sass', 'app']);
    });

    it('removes the configured plugins only', async () => {
        const config = await cakephpViteFinal({ plugins: [plugin('hot-file'), plugin('legacy')] }, { excludeVitePlugins: ['legacy'] });

        expect((config.plugins ?? []).map((p) => (p as Plugin).name)).toEqual(['hot-file']);
    });

    it('keeps the plugins with an empty list', async () => {
        const plugins = [plugin('hot-file')];

        expect((await cakephpViteFinal({ plugins }, { excludeVitePlugins: [] })).plugins).toEqual(plugins);
    });

    it('adds the plugin of the watched paths', async () => {
        const config = await cakephpViteFinal({ root: '/app', plugins: [plugin('app')] }, { watchPaths: ['templates'] });

        expect((config.plugins as Plugin[]).map((p) => p.name)).toEqual(['app', 'storybook-cakephp-watch-paths']);
    });

    it('adds the proxy to the existing server settings', async () => {
        const config = await cakephpViteFinal(
            { server: { middlewareMode: true, proxy: { '/api': 'http://api' } } },
            { server: 'http://localhost:8765', proxyPaths: ['/img'] }
        );

        expect(config.server?.middlewareMode).toBe(true);
        expect(Object.keys(config.server?.proxy ?? {})).toEqual(['/api', RENDER_PATH, '/img']);
    });
});

describe('watchPathsPlugin', () => {
    const server = () => {
        const handlers: Record<string, (file: string) => void> = {};
        const mock = {
            watcher: { add: vi.fn(), on: vi.fn((event: string, handler: (file: string) => void) => (handlers[event] = handler)) },
            ws: { send: vi.fn() },
        };

        return { mock, handlers };
    };

    it('reloads the page when a watched file changes', () => {
        const { mock, handlers } = server();
        const configureServer = watchPathsPlugin(['templates', 'config/app.php'], '/app').configureServer as (server: ViteDevServer) => void;
        configureServer(mock as unknown as ViteDevServer);

        expect(mock.watcher.add).toHaveBeenCalledWith([resolve('/app/templates'), resolve('/app/config/app.php')]);

        handlers.change?.(resolve('/app/templates/Elements/components/button.php'));
        handlers.add?.(resolve('/app/config/app.php'));
        handlers.change?.(resolve('/app/templates-other/x.php'));
        handlers.unlink?.(resolve('/app/assets/app.ts'));

        expect(mock.ws.send).toHaveBeenCalledTimes(2);
        expect(mock.ws.send).toHaveBeenCalledWith({ type: 'full-reload' });
    });

    it('applies to storybook dev only', () => {
        expect(watchPathsPlugin([]).apply).toBe('serve');
    });
});
