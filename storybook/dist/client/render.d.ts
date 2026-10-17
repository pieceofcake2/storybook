import type { ArgsStoryFn, RenderContext } from 'storybook/internal/types';
import type { CakePHPRenderer, CakePHPStoryResult } from './types.js';
/**
 * Error returned by the CakePHP application (a 4xx or 5xx response).
 */
export declare class CakePHPRenderingError extends Error {
    readonly title: string;
    readonly errorPage: string;
    readonly status: number;
    constructor(title: string, errorPage: string, status: number);
}
/**
 * Renders a story from its `component`: an Element name (`'components/page_header'`), or
 * `element()` / `template()`. The args of the story are passed as the variables.
 */
export declare const render: ArgsStoryFn<CakePHPRenderer>;
/**
 * Sends the Element name (or the template name) and the args to the render endpoint, and returns
 * the HTML.
 */
export declare const fetchStoryHtml: (url: URL, story: CakePHPStoryResult, args: Record<string, unknown>) => Promise<string>;
export declare function renderToCanvas({ id, showMain, storyFn, storyContext }: RenderContext<CakePHPRenderer>, canvasElement: CakePHPRenderer['canvasElement']): Promise<void>;
