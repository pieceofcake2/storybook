import type { Options, PresetProperty } from 'storybook/internal/types';
import type { InlineConfig } from 'vite';
export declare const core: PresetProperty<'core'>;
export declare const previewAnnotations: PresetProperty<'previewAnnotations'>;
export declare const viteFinal: (config: InlineConfig, options: Options) => Promise<InlineConfig>;
