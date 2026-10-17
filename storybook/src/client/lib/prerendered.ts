import { CakePHPRenderingError } from './CakePHPRenderingError.js';
import { extractErrorTitle } from './extractErrorTitle.js';

/**
 * Name of the `<meta>` of `iframe.html` that marks a pre-rendered (static) Storybook. Its content
 * is the directory of the pre-rendered stories, relative to `iframe.html`.
 */
export const PRERENDERED_META = 'storybook-cakephp-prerendered';

/**
 * Default directory of the pre-rendered stories in the build.
 */
export const PRERENDERED_DIR = 'cakephp-prerendered/';

/**
 * Placeholder of the URL of the Storybook (the directory of `iframe.html`) in the pre-rendered
 * requests and HTML. The URLs of the assets imported by the stories (e.g.
 * `import photo from './photo.jpg'`) are absolute URLs under the Storybook, so they depend on where
 * it is served: they are stored with the placeholder, which is replaced by the URL of the
 * Storybook where it is deployed.
 */
export const BASE_PLACEHOLDER = '{{storybook-cakephp-base}}/';

/**
 * A render request of a story and the response of the application.
 */
export type PrerenderedRender = {
    /** JSON body of the request, with the URL of the Storybook replaced by the placeholder */
    request: string;
    /** Status of the response */
    status: number;
    /** HTML of the response, with the URL of the Storybook replaced by the placeholder */
    html: string;
};

/**
 * File of a pre-rendered story (`<dir>/<storyId>.json`): the render requests made by the story
 * (the args of the story, and those set by its play function) and their responses.
 */
export type PrerenderedStory = {
    version: 1;
    renders: PrerenderedRender[];
};

/**
 * Thrown in a pre-rendered Storybook when the args differ from those of the pre-rendered story
 * (e.g. when they are changed in Controls).
 */
export class PrerenderedArgsError extends Error {
    constructor(public readonly storyId: string) {
        super(`Story ${storyId} was not pre-rendered with these args.`);
        this.name = 'PrerenderedArgsError';
    }
}

/**
 * Returns the URL of the directory of the pre-rendered stories if the Storybook is pre-rendered,
 * or null if it renders the stories with the application.
 */
export const prerenderedDirUrl = (doc: Document = document): URL | null => {
    const meta = doc.querySelector<HTMLMetaElement>(`meta[name="${PRERENDERED_META}"]`);
    if (meta === null) {
        return null;
    }
    const dir = meta.content || PRERENDERED_DIR;

    return new URL(dir.endsWith('/') ? dir : `${dir}/`, doc.baseURI);
};

/**
 * Returns the URL of the Storybook: the directory of `iframe.html`, with a trailing slash.
 */
export const storybookBaseUrl = (doc: Document = document): string => new URL('.', doc.baseURI).href;

/**
 * Replaces all the occurrences of a string.
 */
const replaceAll = (text: string, search: string, replacement: string): string =>
    search === '' ? text : text.split(search).join(replacement);

/**
 * Replaces the URL of the Storybook with the placeholder (also in JSON-escaped form, e.g. in the
 * JSON written by `json_encode()`).
 */
export const withBasePlaceholder = (text: string, base: string): string => {
    const placeholder = BASE_PLACEHOLDER;

    return replaceAll(
        replaceAll(text, base, placeholder),
        base.replace(/\//g, '\\/'),
        placeholder.replace(/\//g, '\\/')
    );
};

/**
 * Replaces the placeholder with the URL of the Storybook.
 */
export const withBaseUrl = (text: string, base: string): string =>
    replaceAll(
        replaceAll(text, BASE_PLACEHOLDER, base),
        BASE_PLACEHOLDER.replace(/\//g, '\\/'),
        base.replace(/\//g, '\\/')
    );

const stories = new Map<string, Promise<PrerenderedStory | null>>();

const loadStory = (url: URL): Promise<PrerenderedStory | null> => {
    const key = url.href;
    let story = stories.get(key);
    if (story === undefined) {
        story = fetch(url, { credentials: 'same-origin' }).then(async (response) =>
            response.ok ? ((await response.json()) as PrerenderedStory) : null
        );
        story.catch(() => stories.delete(key));
        stories.set(key, story);
    }

    return story;
};

/**
 * Returns the pre-rendered HTML of a story for the body of its render request.
 *
 * @throws CakePHPRenderingError When the application returned an error for the story
 * @throws PrerenderedArgsError When the story was not pre-rendered with these args
 * @throws Error When the story was not pre-rendered
 */
export const fetchPrerenderedHtml = async (dir: URL, storyId: string, body: object, base: string): Promise<string> => {
    const url = new URL(`${encodeURIComponent(storyId)}.json`, dir);
    const story = await loadStory(url);
    if (story === null) {
        throw new Error(
            `Story ${storyId} was not pre-rendered (${url} was not found). Run "storybook-cakephp prerender" ` +
                `after "storybook build".`
        );
    }

    const request = withBasePlaceholder(JSON.stringify(body), base);
    const render = story.renders.find((item) => item.request === request);
    if (render === undefined) {
        throw new PrerenderedArgsError(storyId);
    }

    const html = withBaseUrl(render.html, base);
    if (render.status < 200 || render.status >= 300) {
        throw new CakePHPRenderingError(extractErrorTitle(html, String(render.status)), html, render.status);
    }

    return html;
};

/**
 * Clears the cache of the pre-rendered stories (for tests).
 */
export const clearPrerenderedCache = (): void => stories.clear();

/**
 * HTML shown in the canvas of a pre-rendered Storybook when the args were changed.
 */
export const PRERENDERED_ARGS_NOTICE = `<div class="storybook-cakephp-static-notice" role="status" style="font: 14px/1.5 system-ui, sans-serif; color: #2e3438; background: #fff8e1; border: 1px solid #f0c36d; border-radius: 4px; padding: 12px 16px; margin: 16px; max-width: 640px;">
<p style="margin: 0 0 8px;"><strong>This story cannot be rendered with these args.</strong></p>
<p style="margin: 0;">This Storybook is static: the stories were pre-rendered with their own args, so changes in Controls cannot be rendered. Reset the args to see the story again, or run Storybook with the CakePHP application (<code>storybook dev</code>) to try other args.</p>
</div>`;
