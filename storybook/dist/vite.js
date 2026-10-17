import { withoutVitePlugins } from '@storybook/builder-vite';
/**
 * Path of the render endpoint of the CakePHP application.
 */
export const RENDER_PATH = '/_storybook/render';
/**
 * Plugins removed from the application's Vite config by default: `hot-file` writes (and removes
 * on exit) the hot file of pieceofcake2/vite, which would make the application load its assets
 * from a dev server that is not running.
 */
export const DEFAULT_EXCLUDED_VITE_PLUGINS = ['hot-file'];
/**
 * Returns the proxy settings of the Vite dev server: the render endpoint and the `proxyPaths` are
 * forwarded to the CakePHP application, with the `X-Storybook-Proxy: true` header.
 */
export const createProxyConfig = (options, configType) => {
    if (!options.server) {
        return {};
    }
    const extraPaths = options.proxyPaths === undefined ? [] : [options.proxyPaths].flat();
    const paths = [...new Set([RENDER_PATH, ...extraPaths])];
    return Object.fromEntries(paths.map((path) => [
        path,
        {
            target: options.server,
            changeOrigin: true,
            secure: configType === 'PRODUCTION',
            headers: {
                'X-Storybook-Proxy': 'true',
            },
        },
    ]));
};
/**
 * Adapts the Vite config (the application's config merged by `@storybook/builder-vite`) to
 * Storybook: removes the plugins that must not run in Storybook and adds the proxy to the CakePHP
 * application.
 *
 * `@storybook/builder-vite` already replaces `base` with `./`, drops `build` (except `target`) and,
 * in `storybook dev`, replaces `server` (`origin`, `port`, `https`, ...) with its own settings.
 */
export const cakephpViteFinal = async (config, options, configType) => {
    const excluded = options.excludeVitePlugins ?? DEFAULT_EXCLUDED_VITE_PLUGINS;
    return {
        ...config,
        plugins: excluded.length > 0 ? await withoutVitePlugins(config.plugins, excluded) : config.plugins,
        server: {
            ...config.server,
            proxy: {
                ...config.server?.proxy,
                ...createProxyConfig(options, configType),
            },
        },
    };
};
