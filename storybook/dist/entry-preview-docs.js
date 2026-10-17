import { enhanceArgTypes, SourceType } from 'storybook/internal/docs-tools';
import { sourceDecorator } from './client/docs/sourceDecorator.js';
export const decorators = [sourceDecorator];
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
export const argTypesEnhancers = [enhanceArgTypes];
