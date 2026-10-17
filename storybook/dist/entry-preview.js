import { readonlyControls } from './client/lib/readonlyControls.js';
export { render, renderToCanvas } from './client/render.js';
export const parameters = {
    renderer: 'cakephp',
    cakephp: {},
};
export const argTypesEnhancers = [readonlyControls];
