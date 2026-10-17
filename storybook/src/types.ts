import type { BuilderOptions, StorybookConfigVite } from '@storybook/builder-vite';
import type { StorybookConfig as StorybookConfigBase } from 'storybook/internal/types';

type FrameworkName = '@pieceofcake2/storybook';

/**
 * Options of the framework (`framework.options` in `.storybook/main.ts`).
 */
export type FrameworkOptions = {
    /**
     * URL of the CakePHP application (e.g. `http://localhost:8765`). `storybook dev` proxies the
     * render requests (and the `proxyPaths`) to it. Not used by `storybook build`: a static build
     * sends the render requests to its own origin.
     */
    server?: string;
    /**
     * Other paths to proxy to the CakePHP application in `storybook dev`, e.g. the images and the
     * built assets referred to by the HTML of the Elements (`['/img', '/build']`).
     */
    proxyPaths?: string | string[];
    /**
     * Files or directories (relative to the project root) whose changes reload the story in
     * `storybook dev`, e.g. the templates (`['templates']`), since Vite does not know that the
     * HTML depends on them.
     */
    watchPaths?: string[];
    /**
     * Names of the Vite plugins of the application's Vite config to remove in Storybook (default:
     * `['hot-file']`, the plugin that writes the hot file of pieceofcake2/vite).
     */
    excludeVitePlugins?: string[];
    /**
     * Options of `@storybook/builder-vite` (e.g. `viteConfigPath`).
     */
    builder?: BuilderOptions;
};

type StorybookConfigFramework = {
    framework:
        | FrameworkName
        | {
              name: FrameworkName;
              options?: FrameworkOptions;
          };
};

/**
 * The type of the Storybook configuration in `.storybook/main.ts`.
 */
export type StorybookConfig = Omit<StorybookConfigBase, keyof StorybookConfigFramework | 'viteFinal'> &
    StorybookConfigVite &
    StorybookConfigFramework;
