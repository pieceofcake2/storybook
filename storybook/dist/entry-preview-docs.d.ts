import { SourceType } from 'storybook/internal/docs-tools';
import type { ArgTypesEnhancer, DecoratorFunction } from 'storybook/internal/types';
import type { CakePHPRenderer } from './client/types.js';
export declare const decorators: DecoratorFunction<CakePHPRenderer>[];
export declare const parameters: {
    docs: {
        story: {
            inline: boolean;
        };
        source: {
            type: SourceType;
            language: string;
            code: undefined;
            excludeDecorators: undefined;
        };
    };
};
export declare const argTypesEnhancers: ArgTypesEnhancer[];
