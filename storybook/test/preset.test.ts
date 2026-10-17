import { fileURLToPath } from 'node:url';

import type { Options } from 'storybook/internal/types';
import type { Plugin } from 'vite';
import { describe, expect, it, vi } from 'vitest';

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock('storybook/internal/node-logger', () => ({ logger: { warn } }));

import { core, previewAnnotations, viteFinal } from '../src/preset.js';

const options = (framework: unknown, docs: object = {}, configType = 'DEVELOPMENT'): Options =>
    ({
        configType,
        presets: {
            apply: vi.fn(async (name: string) => (name === 'framework' ? framework : name === 'docs' ? docs : undefined)),
        },
    }) as unknown as Options;

type Fn = (...args: unknown[]) => Promise<unknown>;

describe('core', () => {
    it('uses @storybook/builder-vite with the builder options', async () => {
        const config = (await (core as Fn)({ disableTelemetry: true }, options({ name: 'x', options: { builder: { viteConfigPath: 'vite.storybook.ts' } } }))) as {
            builder: { name: string; options: object };
            disableTelemetry: boolean;
        };

        expect(config.disableTelemetry).toBe(true);
        expect(config.builder.name).toBe(fileURLToPath(import.meta.resolve('@storybook/builder-vite')));
        expect(config.builder.options).toEqual({ viteConfigPath: 'vite.storybook.ts' });
    });

    it('accepts the framework as a string', async () => {
        const config = (await (core as Fn)({}, options('@pieceofcake2/storybook'))) as { builder: { options: object } };

        expect(config.builder.options).toEqual({});
    });
});

describe('previewAnnotations', () => {
    it('adds the preview entry, and the docs entry when docs are enabled', async () => {
        const withoutDocs = (await (previewAnnotations as Fn)(['a.js'], options('x'))) as string[];
        const withDocs = (await (previewAnnotations as Fn)([], options('x', { autodocs: 'tag' }))) as string[];

        expect(withoutDocs).toHaveLength(2);
        expect(withoutDocs[0]).toBe('a.js');
        expect(withoutDocs[1]).toMatch(/entry-preview\.js$/);
        expect(withDocs).toHaveLength(2);
        expect(withDocs[1]).toMatch(/entry-preview-docs\.js$/);
    });
});

describe('viteFinal', () => {
    it('adds the proxy from the framework options', async () => {
        const config = await viteFinal(
            { plugins: [{ name: 'hot-file' } as Plugin] },
            options({ name: '@pieceofcake2/storybook', options: { server: 'http://localhost:8765', proxyPaths: '/img' } })
        );

        expect(Object.keys(config.server?.proxy ?? {})).toEqual(['/_storybook/render', '/img']);
        expect(config.plugins).toEqual([]);
        expect(warn).not.toHaveBeenCalled();
    });

    it('warns in development without the server', async () => {
        await viteFinal({}, options({ name: '@pieceofcake2/storybook' }));

        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('does not warn in a static build without the server', async () => {
        warn.mockClear();
        await viteFinal({}, options({ name: '@pieceofcake2/storybook' }, {}, 'PRODUCTION'));

        expect(warn).not.toHaveBeenCalled();
    });
});
