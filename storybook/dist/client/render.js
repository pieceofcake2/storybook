// Adapted from Storybook for Symfony (MIT License, Copyright (c) 2024 SensioLabs). See NOTICE.md.
import { STORY_ERRORED, STORY_RENDER_PHASE_CHANGED } from 'storybook/internal/core-events';
import { addons, simulatePageLoad } from 'storybook/preview-api';
import { buildStoryArgs } from './lib/buildStoryArgs.js';
import { CakePHPRenderingError } from './lib/CakePHPRenderingError.js';
import { normalizeComponent } from './lib/component.js';
import { setupEventCallbacks } from './lib/eventCallbacks.js';
import { extractErrorTitle } from './lib/extractErrorTitle.js';
import { fetchPrerenderedHtml, PRERENDERED_ARGS_NOTICE, PrerenderedArgsError, prerenderedDirUrl, storybookBaseUrl, } from './lib/prerendered.js';
import { renderUrl } from './lib/renderUrl.js';
export { CakePHPRenderingError };
/**
 * Renders a story from its `component`: an Element name (`'components/page_header'`), or
 * `element()` / `template()`. The args of the story are passed as the variables.
 */
export const render = (args, context) => {
    const component = normalizeComponent(context.component);
    if (component !== null) {
        return { ...component, args };
    }
    if (typeof context.component === 'function') {
        return context.component(args, context);
    }
    throw new Error(`Unable to render story ${context.id}: set "component" to the name of an Element (e.g. 'components/button'), ` +
        `element('components/button') or template('name'), or write a "render" function that returns ` +
        `{ element, args } or { template, args }.`);
};
/**
 * Returns the body of the render request: the Element name (or the template name) and the args.
 */
export const renderRequestBody = (story, args) => 'element' in story ? { element: story.element, args } : { template: story.template, args };
/**
 * Sends the Element name (or the template name) and the args to the render endpoint, and returns
 * the HTML.
 */
export const fetchStoryHtml = async (url, story, args) => {
    const body = renderRequestBody(story, args);
    let response;
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
    }
    catch (error) {
        throw new Error(`Failed to connect to the CakePHP application at ${url}. Is it running, and is the "server" option ` +
            `of the framework set to its URL?`, { cause: error });
    }
    const html = await response.text();
    if (!response.ok) {
        throw new CakePHPRenderingError(extractErrorTitle(html, `${response.status} ${response.statusText}`.trim()), html, response.status);
    }
    return html;
};
const renderIds = new WeakMap();
export async function renderToCanvas({ id, showMain, storyFn, storyContext }, canvasElement) {
    const story = storyFn();
    const args = story.args ?? storyContext.args;
    const parameters = storyContext.parameters.cakephp ?? {};
    const storyArgs = buildStoryArgs(args, storyContext.argTypes);
    // A pre-rendered (static) Storybook loads the HTML written by "storybook-cakephp prerender"
    const prerenderedDir = prerenderedDirUrl();
    // Ignore the responses of earlier renders (e.g. when the args change quickly)
    const renderId = (renderIds.get(canvasElement) ?? 0) + 1;
    renderIds.set(canvasElement, renderId);
    let html;
    try {
        html =
            prerenderedDir === null
                ? await fetchStoryHtml(renderUrl(parameters.id ?? id, window.location.origin, parameters.renderUrl), story, storyArgs)
                : await fetchPrerenderedHtml(prerenderedDir, id, renderRequestBody(story, storyArgs), storybookBaseUrl());
    }
    catch (error) {
        if (renderIds.get(canvasElement) !== renderId) {
            return;
        }
        if (error instanceof PrerenderedArgsError) {
            showMain();
            console.info(`[@pieceofcake2/storybook] ${error.message} Changed args cannot be rendered in a static Storybook.`);
            canvasElement.innerHTML = PRERENDERED_ARGS_NOTICE;
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
const showCakePHPError = (storyId, canvasElement, error) => {
    console.error(`Error rendering story ${storyId}: ${error.title}`);
    const channel = addons.getChannel();
    channel.emit(STORY_ERRORED, { title: storyId, description: `Server failed to render story:\n${error.title}` });
    channel.emit(STORY_RENDER_PHASE_CHANGED, { newPhase: 'errored', storyId });
    canvasElement.innerHTML = error.errorPage;
};
