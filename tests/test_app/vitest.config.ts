import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Runs the stories (and their play functions) in Chromium with @storybook/addon-vitest. The render
// requests are proxied to the test application by the framework (the "server" option in
// .storybook/main.ts), so it must be running: see bin/e2e.sh.
export default defineConfig({
    plugins: [storybookTest({ configDir: '.storybook' })],
    test: {
        name: 'storybook',
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
        },
    },
});
