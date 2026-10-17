/**
 * Header of the responses of the server when the application cannot be reached.
 */
export declare const PROXY_ERROR_HEADER = "x-storybook-cakephp-proxy-error";
/**
 * Returns the file of the build for the path of a request, or null if the path is outside the
 * build.
 */
export declare const resolveBuildFile: (dir: string, pathname: string) => string | null;
/**
 * Serves a Storybook build for the pre-rendering, at the root of a local HTTP server.
 *
 * The files of the build are served (`iframe.html` without the marker of a pre-rendered Storybook,
 * so that the preview requests the application). Other requests (the render requests, and the
 * images and assets of the application referred to by the HTML) are forwarded to the application.
 */
export declare const startBuildServer: (dir: string, server: string, port?: number) => Promise<{
    url: string;
    close: () => Promise<void>;
}>;
