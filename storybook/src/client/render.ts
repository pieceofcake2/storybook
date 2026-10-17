import { STORY_ERRORED, STORY_RENDER_PHASE_CHANGED } from 'storybook/internal/core-events';
import type { ArgsStoryFn, RenderContext, StoryId } from 'storybook/internal/types';
import { addons, simulatePageLoad } from 'storybook/preview-api';

import { buildStoryArgs } from './lib/buildStoryArgs.js';
import { normalizeComponent } from './lib/component.js';
import { setupEventCallbacks } from './lib/eventCallbacks.js';
import { extractErrorTitle } from './lib/extractErrorTitle.js';
import { renderUrl } from './lib/renderUrl.js';
import type { CakePHPParameters, CakePHPRenderer, CakePHPStoryResult } from './types.js';

/**
 * Error returned by the CakePHP application (a 4xx or 5xx response).
 */
export class CakePHPRenderingError extends Error {
    constructor(
        public readonly title: string,
        public readonly errorPage: string,
        public readonly status: number
    ) {
        super(title);
        this.name = 'CakePHPRenderingError';
    }
}

/**
 * Renders a story from its `component`: an Element name (`'components/page_header'`), or
 * `element()` / `template()`. The args of the story are passed as the variables.
 */
export const render: ArgsStoryFn<CakePHPRenderer> = (args, context) => {
    const component = normalizeComponent(context.component);
    if (component !== null) {
        return { ...component, args };
    }
    if (typeof context.component === 'function') {
        return context.component(args, context);
    }

    throw new Error(
        `Unable to render story ${context.id}: set "component" to the name of an Element (e.g. 'components/button'), ` +
            `element('components/button') or template('name'), or write a "render" function that returns ` +
            `{ element, args } or { template, args }.`
    );
};

/**
 * Sends the Element name (or the template name) and the args to the render endpoint, and returns
 * the HTML.
 */
export const fetchStoryHtml = async (
    url: URL,
    story: CakePHPStoryResult,
    args: Record<string, unknown>
): Promise<string> => {
    const body = 'element' in story ? { element: story.element, args } : { template: story.template, args };

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/html',
            },
            credentials: 'same-origin',
            body: JSON.stringify(body),
        });
    } catch (error) {
        throw new Error(
            `Failed to connect to the CakePHP application at ${url}. Is it running, and is the "server" option ` +
                `of the framework set to its URL?`,
            { cause: error }
        );
    }

    const html = await response.text();
    if (!response.ok) {
        throw new CakePHPRenderingError(
            extractErrorTitle(html, `${response.status} ${response.statusText}`.trim()),
            html,
            response.status
        );
    }

    return html;
};

const renderIds = new WeakMap<HTMLElement, number>();

export async function renderToCanvas(
    { id, showMain, storyFn, storyContext }: RenderContext<CakePHPRenderer>,
    canvasElement: CakePHPRenderer['canvasElement']
): Promise<void> {
    const story = storyFn();
    const args = story.args ?? storyContext.args;
    const parameters: CakePHPParameters = storyContext.parameters.cakephp ?? {};
    const url = renderUrl(parameters.id ?? id, window.location.origin, parameters.renderUrl);

    // Ignore the responses of earlier renders (e.g. when the args change quickly)
    const renderId = (renderIds.get(canvasElement) ?? 0) + 1;
    renderIds.set(canvasElement, renderId);

    let html: string;
    try {
        html = await fetchStoryHtml(url, story, buildStoryArgs(args, storyContext.argTypes));
    } catch (error) {
        if (renderIds.get(canvasElement) !== renderId) {
            return;
        }
        if (error instanceof CakePHPRenderingError) {
            showMain();
            showCakePHPError(id, canvasElement, error);

            return;
        }
        throw error;
    }
    if (renderIds.get(canvasElement) !== renderId) {
        return;
    }

    showMain();
    canvasElement.innerHTML = html;
    for (const name of setupEventCallbacks(args, canvasElement)) {
        console.warn(`[@pieceofcake2/storybook] Callback arg "${name}" is not bound to any DOM element.`);
    }
    // Run the scripts of the HTML and dispatch DOMContentLoaded, as on a page load
    simulatePageLoad(canvasElement);
}

/**
 * Marks the story as errored and shows the error page returned by CakePHP in the canvas.
 */
const showCakePHPError = (storyId: StoryId, canvasElement: HTMLElement, error: CakePHPRenderingError): void => {
    console.error(`Error rendering story ${storyId}: ${error.title}`);
    const channel = addons.getChannel();
    channel.emit(STORY_ERRORED, { title: storyId, description: `Server failed to render story:\n${error.title}` });
    channel.emit(STORY_RENDER_PHASE_CHANGED, { newPhase: 'errored', storyId });
    canvasElement.innerHTML = error.errorPage;
};
