/**
 * Name of the `<meta>` of `iframe.html` that marks a pre-rendered (static) Storybook. Its content
 * is the directory of the pre-rendered stories, relative to `iframe.html`.
 */
export declare const PRERENDERED_META = "storybook-cakephp-prerendered";
/**
 * Default directory of the pre-rendered stories in the build.
 */
export declare const PRERENDERED_DIR = "cakephp-prerendered/";
/**
 * Placeholder of the URL of the Storybook (the directory of `iframe.html`) in the pre-rendered
 * requests and HTML. The URLs of the assets imported by the stories (e.g.
 * `import photo from './photo.jpg'`) are absolute URLs under the Storybook, so they depend on where
 * it is served: they are stored with the placeholder, which is replaced by the URL of the
 * Storybook where it is deployed.
 */
export declare const BASE_PLACEHOLDER = "{{storybook-cakephp-base}}/";
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
export declare class PrerenderedArgsError extends Error {
    readonly storyId: string;
    constructor(storyId: string);
}
/**
 * Returns the URL of the directory of the pre-rendered stories if the Storybook is pre-rendered,
 * or null if it renders the stories with the application.
 */
export declare const prerenderedDirUrl: (doc?: Document) => URL | null;
/**
 * Returns the URL of the Storybook: the directory of `iframe.html`, with a trailing slash.
 */
export declare const storybookBaseUrl: (doc?: Document) => string;
/**
 * Replaces the URL of the Storybook with the placeholder (also in JSON-escaped form, e.g. in the
 * JSON written by `json_encode()`).
 */
export declare const withBasePlaceholder: (text: string, base: string) => string;
/**
 * Replaces the placeholder with the URL of the Storybook.
 */
export declare const withBaseUrl: (text: string, base: string) => string;
/**
 * Returns the pre-rendered HTML of a story for the body of its render request.
 *
 * @throws CakePHPRenderingError When the application returned an error for the story
 * @throws PrerenderedArgsError When the story was not pre-rendered with these args
 * @throws Error When the story was not pre-rendered
 */
export declare const fetchPrerenderedHtml: (dir: URL, storyId: string, body: object, base: string) => Promise<string>;
/**
 * Clears the cache of the pre-rendered stories (for tests).
 */
export declare const clearPrerenderedCache: () => void;
/**
 * HTML shown in the canvas of a pre-rendered Storybook when the args were changed.
 */
export declare const PRERENDERED_ARGS_NOTICE = "<div class=\"storybook-cakephp-static-notice\" role=\"status\" style=\"font: 14px/1.5 system-ui, sans-serif; color: #2e3438; background: #fff8e1; border: 1px solid #f0c36d; border-radius: 4px; padding: 12px 16px; margin: 16px; max-width: 640px;\">\n<p style=\"margin: 0 0 8px;\"><strong>This story cannot be rendered with these args.</strong></p>\n<p style=\"margin: 0;\">This Storybook is static: the stories were pre-rendered with their own args, so changes in Controls cannot be rendered. Reset the args to see the story again, or run Storybook with the CakePHP application (<code>storybook dev</code>) to try other args.</p>\n</div>";
