import type { StorybookConfig } from '@pieceofcake2/storybook';

const config: StorybookConfig = {
    stories: ['../stories/**/*.stories.ts'],
    addons: ['@storybook/addon-docs', '@storybook/addon-vitest'],
    framework: {
        name: '@pieceofcake2/storybook',
        options: {
            // The test application (php -S, see bin/e2e.sh)
            server: 'http://127.0.0.1:8765',
            proxyPaths: ['/img'],
            // Reload the stories when the templates change
            watchPaths: ['templates'],
        },
    },
};

export default config;
