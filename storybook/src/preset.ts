import { fileURLToPath } from 'node:url';

import { logger } from 'storybook/internal/node-logger';
import type { Options, PresetProperty } from 'storybook/internal/types';
import type { InlineConfig } from 'vite';

import type { FrameworkOptions } from './types.js';
import { cakephpViteFinal } from './vite.js';

const resolve = (specifier: string): string => fileURLToPath(import.meta.resolve(specifier));

const frameworkOptions = async (options: Options): Promise<FrameworkOptions> => {
    const framework = await options.presets.apply('framework');

    return typeof framework === 'string' ? {} : ((framework?.options ?? {}) as FrameworkOptions);
};

export const core: PresetProperty<'core'> = async (config, options) => ({
    ...config,
    builder: {
        name: resolve('@storybook/builder-vite'),
        options: (await frameworkOptions(options)).builder ?? {},
    },
});

export const previewAnnotations: PresetProperty<'previewAnnotations'> = async (entries = [], options) => {
    const docs = await options.presets.apply('docs', {}, options);
    const docsEnabled = Object.keys(docs ?? {}).length > 0;

    return [...entries, resolve('./entry-preview.js'), ...(docsEnabled ? [resolve('./entry-preview-docs.js')] : [])];
};

export const viteFinal = async (config: InlineConfig, options: Options): Promise<InlineConfig> => {
    const cakephp = await frameworkOptions(options);
    if (!cakephp.server && options.configType !== 'PRODUCTION') {
        logger.warn(
            'The proxy to the CakePHP application is disabled because the "server" option of the framework is not set.'
        );
    }

    return cakephpViteFinal(config, cakephp, options.configType);
};
