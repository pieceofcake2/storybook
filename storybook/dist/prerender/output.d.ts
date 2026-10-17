import { BASE_PLACEHOLDER, PRERENDERED_DIR, PRERENDERED_META, type PrerenderedRender, type PrerenderedStory } from '../client/lib/prerendered.js';
export { BASE_PLACEHOLDER, PRERENDERED_DIR, PRERENDERED_META, type PrerenderedRender, type PrerenderedStory };
/**
 * An entry of the `index.json` of a Storybook build.
 */
export type IndexEntry = {
    id: string;
    type: 'story' | 'docs';
    title?: string;
    name?: string;
    tags?: string[];
};
/**
 * Returns the stories (not the docs) of the `index.json` of a Storybook build.
 */
export declare const storiesOf: (index: unknown) => IndexEntry[];
/**
 * Removes the marker of a pre-rendered Storybook from `iframe.html`.
 */
export declare const removeMarker: (html: string) => string;
/**
 * Adds the marker of a pre-rendered Storybook to `iframe.html`, which makes the preview load the
 * pre-rendered stories from the directory (relative to `iframe.html`) instead of requesting the
 * application.
 */
export declare const addMarker: (html: string, dir?: string) => string;
/**
 * Returns the body of a render request (`{"element"|"template", "args"}`) if the request is one, or
 * null.
 */
export declare const parseRenderRequest: (method: string, postData: string | null) => Record<string, unknown> | null;
/**
 * Whether the HTML is an error page of the render endpoint (whose first line is `<!-- message -->`),
 * and not an error of the application (e.g. a 404 page when the endpoint is not available).
 */
export declare const isRenderErrorPage: (html: string) => boolean;
/**
 * Returns a render to store: the URL of the Storybook served for the pre-rendering is replaced by
 * the placeholder in the request and the HTML.
 */
export declare const storedRender: (postData: string, status: number, html: string, base: string) => PrerenderedRender;
/**
 * Returns the file name of a pre-rendered story.
 */
export declare const storyFileName: (storyId: string) => string;
