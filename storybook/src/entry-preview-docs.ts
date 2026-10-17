import { enhanceArgTypes, SourceType } from 'storybook/internal/docs-tools';
import type { ArgTypesEnhancer, DecoratorFunction } from 'storybook/internal/types';

import { sourceDecorator } from './client/docs/sourceDecorator.js';
import type { CakePHPRenderer } from './client/types.js';

export const decorators: DecoratorFunction<CakePHPRenderer>[] = [sourceDecorator];

export const parameters = {
    docs: {
        story: { inline: true },
        source: {
            type: SourceType.DYNAMIC,
            language: 'html',
            code: undefined,
            excludeDecorators: undefined,
        },
    },
};

export const argTypesEnhancers: ArgTypesEnhancer[] = [enhanceArgTypes];
