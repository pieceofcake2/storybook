// Checks the static build of Storybook deployed on the same origin as the application: opens each
// story in Chromium and fails if it does not render, or if its play function fails. The stories
// tagged expect-error must show the error returned by the application instead.
//
// node bin/test-static.mjs http://127.0.0.1:8765/storybook/

import { chromium } from 'playwright';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:8765/storybook/');
const index = await (await fetch(new URL('index.json', base))).json();
const stories = Object.values(index.entries).filter(
    (entry) => entry.type === 'story' && (entry.tags.includes('test') || entry.tags.includes('expect-error'))
);

const browser = await chromium.launch();
const failures = [];

for (const story of stories) {
    const page = await browser.newPage();
    // Record the events of the Storybook channel as soon as it is created
    await page.addInitScript(() => {
        window.__storybookEvents = [];
        let channel;
        Object.defineProperty(window, '__STORYBOOK_ADDONS_CHANNEL__', {
            configurable: true,
            get: () => channel,
            set: (value) => {
                channel = value;
                const emit = value.emit.bind(value);
                value.emit = (name, ...args) => {
                    window.__storybookEvents.push({ name, payload: args[0] });

                    return emit(name, ...args);
                };
            },
        });
    });
    const url = new URL(`iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`, base);
    try {
        await page.goto(String(url));
        const event = await page.waitForFunction(
            () =>
                window.__storybookEvents?.find((event) =>
                    ['storyFinished', 'storyErrored', 'storyThrewException', 'playFunctionThrewException'].includes(event.name)
                ),
            undefined,
            { timeout: 15000 }
        );
        const { name, payload } = await event.jsonValue();
        if (story.tags.includes('expect-error')) {
            const errorShown = await page.locator('#storybook-root .storybook-cakephp-error').count();
            if (name !== 'storyErrored' || errorShown !== 1) {
                throw new Error(`The error is not shown: ${name}: ${JSON.stringify(payload)}`);
            }
        } else if (name !== 'storyFinished' || payload.status !== 'success') {
            throw new Error(`${name}: ${JSON.stringify(payload)}`);
        }
        console.log(`ok - ${story.id}`);
    } catch (error) {
        failures.push(story.id);
        console.log(`not ok - ${story.id}\n  ${String(error).split('\n').join('\n  ')}`);
    } finally {
        await page.close();
    }
}

await browser.close();
console.log(`\n${stories.length - failures.length}/${stories.length} stories rendered from ${base}`);
process.exit(failures.length === 0 && stories.length > 0 ? 0 : 1);
