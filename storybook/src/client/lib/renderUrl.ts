/**
 * Default path of the render endpoint.
 */
export const DEFAULT_RENDER_URL = '/_storybook/render';

/**
 * Returns the URL of the render endpoint for a story.
 *
 * A path is resolved against the origin of the page (not its path), so that a static build works
 * wherever it is deployed on the same origin as the application (e.g. under `/storybook/`).
 */
export const renderUrl = (storyId: string, origin: string, base: string = DEFAULT_RENDER_URL): URL =>
    new URL(`${base.replace(/\/+$/, '')}/${encodeURIComponent(storyId)}`, origin);
