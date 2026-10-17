import type { ArgsStoryFn, RenderContext } from 'storybook/internal/types';
import { CakePHPRenderingError } from './lib/CakePHPRenderingError.js';
import type { CakePHPRenderer, CakePHPStoryResult } from './types.js';
export { CakePHPRenderingError };
/**
 * Renders a story from its `component`: an Element name (`'components/page_header'`), or
 * `element()` / `template()`. The args of the story are passed as the variables.
 */
export declare const render: ArgsStoryFn<CakePHPRenderer>;
/**
 * Returns the body of the render request: the Element name (or the template name) and the args.
 */
export declare const renderRequestBody: (story: CakePHPStoryResult, args: Record<string, unknown>) => {
    element: string;
    args: Record<string, unknown>;
} | {
    template: string;
    args: Record<string, unknown>;
};
/**
 * Sends the Element name (or the template name) and the args to the render endpoint, and returns
 * the HTML.
 */
export declare const fetchStoryHtml: (url: URL, story: CakePHPStoryResult, args: Record<string, unknown>) => Promise<string>;
export declare function renderToCanvas({ id, showMain, storyFn, storyContext }: RenderContext<CakePHPRenderer>, canvasElement: CakePHPRenderer['canvasElement']): Promise<void>;
