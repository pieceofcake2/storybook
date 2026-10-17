import type { Plugin } from 'vite';
import { describe, expect, it } from 'vitest';

import { cakephpViteFinal, createProxyConfig, RENDER_PATH } from '../src/vite.js';

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

        expect((await cakephpViteFinal({ plugins }, { excludeVitePlugins: [] })).plugins).toBe(plugins);
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
