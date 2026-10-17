export type PrerenderOptions = {
    /** URL of the CakePHP application, running in debug mode */
    server: string;
    /** Directory of the Storybook build */
    dir: string;
    /**
     * Browser: a channel of Playwright (`chrome`, `msedge`, ...), `chromium` for the Chromium of
     * Playwright (`npx playwright install chromium`), or the path of a Chrome or Chromium executable
     */
    browser: string;
    /** Number of stories rendered at the same time */
    concurrency: number;
    /** Timeout of a story, in milliseconds */
    timeout: number;
    /** Writes the progress */
    log: (message: string) => void;
};
export type PrerenderResult = {
    stories: number;
    renders: number;
    /** Stories that could not be pre-rendered */
    failures: {
        id: string;
        message: string;
    }[];
    /** Stories that were pre-rendered with an error (shown as in storybook dev) */
    warnings: {
        id: string;
        message: string;
    }[];
};
/**
 * Fatal error: the pre-rendering stops (e.g. the render endpoint is not available).
 */
export declare class PrerenderError extends Error {
    name: string;
}
/**
 * Returns the launch options of Playwright for the `--browser` option.
 */
export declare const launchOptions: (browser: string) => {
    channel?: string;
    executablePath?: string;
};
/**
 * Pre-renders all the stories of a Storybook build with the CakePHP application, so that the build
 * is static: it loads the HTML of the stories from `<dir>/cakephp-prerendered/` instead of
 * requesting the application.
 *
 * The build is opened in a headless browser, so that the args are computed by the built preview
 * (the args of the meta and of the story, the render functions, and the URLs of the imported
 * assets), and the render requests are forwarded to the application.
 */
export declare const prerender: (options: PrerenderOptions) => Promise<PrerenderResult>;
