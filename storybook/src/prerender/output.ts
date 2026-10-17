import {
    BASE_PLACEHOLDER,
    PRERENDERED_DIR,
    PRERENDERED_META,
    type PrerenderedRender,
    type PrerenderedStory,
    withBasePlaceholder,
} from '../client/lib/prerendered.js';

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
export const storiesOf = (index: unknown): IndexEntry[] => {
    const entries = (index as { entries?: Record<string, IndexEntry> } | null)?.entries;
    if (typeof entries !== 'object' || entries === null) {
        throw new Error('index.json has no entries. Is the directory a Storybook build?');
    }

    return Object.values(entries).filter((entry) => entry.type === 'story');
};

const META_PATTERN = new RegExp(`\\s*<meta name="${PRERENDERED_META}"[^>]*>`, 'g');

/**
 * Removes the marker of a pre-rendered Storybook from `iframe.html`.
 */
export const removeMarker = (html: string): string => html.replace(META_PATTERN, '');

/**
 * Adds the marker of a pre-rendered Storybook to `iframe.html`, which makes the preview load the
 * pre-rendered stories from the directory (relative to `iframe.html`) instead of requesting the
 * application.
 */
export const addMarker = (html: string, dir: string = PRERENDERED_DIR): string => {
    const meta = `<meta name="${PRERENDERED_META}" content="${dir.replace(/[&"<>]/g, (c) => `&#${c.charCodeAt(0)};`)}">`;
    const cleaned = removeMarker(html);
    const head = cleaned.match(/<head[^>]*>/i);
    if (head === null || head.index === undefined) {
        throw new Error('iframe.html has no <head>.');
    }
    const at = head.index + head[0].length;

    return `${cleaned.slice(0, at)}\n    ${meta}${cleaned.slice(at)}`;
};

/**
 * Returns the body of a render request (`{"element"|"template", "args"}`) if the request is one, or
 * null.
 */
export const parseRenderRequest = (method: string, postData: string | null): Record<string, unknown> | null => {
    if (method !== 'POST' || postData === null) {
        return null;
    }
    let body: unknown;
    try {
        body = JSON.parse(postData);
    } catch {
        return null;
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return null;
    }
    const keys = Object.keys(body);
    const hasName =
        typeof (body as { element?: unknown }).element === 'string' ||
        typeof (body as { template?: unknown }).template === 'string';

    return hasName && keys.every((key) => ['element', 'template', 'args'].includes(key))
        ? (body as Record<string, unknown>)
        : null;
};

/**
 * Whether the HTML is an error page of the render endpoint (whose first line is `<!-- message -->`),
 * and not an error of the application (e.g. a 404 page when the endpoint is not available).
 */
export const isRenderErrorPage = (html: string): boolean =>
    /^\s*<!--.*-->\s*$/.test(html.split('\n', 1)[0] ?? '') && html.includes('storybook-cakephp-error');

/**
 * Returns a render to store: the URL of the Storybook served for the pre-rendering is replaced by
 * the placeholder in the request and the HTML.
 */
export const storedRender = (postData: string, status: number, html: string, base: string): PrerenderedRender => ({
    request: withBasePlaceholder(postData, base),
    status,
    html: withBasePlaceholder(html, base),
});

/**
 * Returns the file name of a pre-rendered story.
 */
export const storyFileName = (storyId: string): string => `${encodeURIComponent(storyId)}.json`;
