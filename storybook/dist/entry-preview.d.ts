import type { ArgTypesEnhancer } from 'storybook/internal/types';
import type { CakePHPRenderer } from './client/types.js';
export { render, renderToCanvas } from './client/render.js';
export declare const parameters: {
    renderer: 'cakephp';
    cakephp: {};
};
export declare const argTypesEnhancers: ArgTypesEnhancer<CakePHPRenderer>[];
