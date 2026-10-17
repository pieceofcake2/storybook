import type { InlineConfig, ProxyOptions } from 'vite';
import type { FrameworkOptions } from './types.js';
/**
 * Path of the render endpoint of the CakePHP application.
 */
export declare const RENDER_PATH = "/_storybook/render";
/**
 * Plugins removed from the application's Vite config by default: `hot-file` writes (and removes
 * on exit) the hot file of pieceofcake2/vite, which would make the application load its assets
 * from a dev server that is not running.
 */
export declare const DEFAULT_EXCLUDED_VITE_PLUGINS: string[];
/**
 * Returns the proxy settings of the Vite dev server: the render endpoint and the `proxyPaths` are
 * forwarded to the CakePHP application, with the `X-Storybook-Proxy: true` header.
 */
export declare const createProxyConfig: (options: Pick<FrameworkOptions, 'server' | 'proxyPaths'>, configType?: string) => Record<string, ProxyOptions>;
/**
 * Adapts the Vite config (the application's config merged by `@storybook/builder-vite`) to
 * Storybook: removes the plugins that must not run in Storybook and adds the proxy to the CakePHP
 * application.
 *
 * `@storybook/builder-vite` already replaces `base` with `./`, drops `build` (except `target`) and,
 * in `storybook dev`, replaces `server` (`origin`, `port`, `https`, ...) with its own settings.
 */
export declare const cakephpViteFinal: (config: InlineConfig, options: FrameworkOptions, configType?: string) => Promise<InlineConfig>;
