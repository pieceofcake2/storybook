import type { ArgTypesEnhancer } from 'storybook/internal/types';

import { readonlyControls } from './client/lib/readonlyControls.js';
import type { CakePHPRenderer } from './client/types.js';

export { render, renderToCanvas } from './client/render.js';

export const parameters = {
    renderer: 'cakephp' as const,
    cakephp: {},
};

export const argTypesEnhancers: ArgTypesEnhancer<CakePHPRenderer>[] = [readonlyControls];
