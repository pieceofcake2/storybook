// @vitest-environment happy-dom
import { SNIPPET_RENDERED } from 'storybook/internal/docs-tools';
import type { StoryContext } from 'storybook/internal/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { channel, cleanups } = vi.hoisted(() => ({
    channel: { emit: vi.fn() },
    cleanups: [] as (() => void)[],
}));

vi.mock('storybook/preview-api', () => ({
    addons: { getChannel: () => channel },
    // Runs the effect at once, and keeps its cleanup
    useEffect: (effect: () => (() => void) | undefined) => {
        const cleanup = effect();
        if (cleanup) {
            cleanups.push(cleanup);
        }
    },
    simulatePageLoad: vi.fn(),
}));

import { prerenderedSource, sourceDecorator } from '../src/client/docs/sourceDecorator.js';
import {
    clearPrerenderedCache,
    PRERENDERED_META,
    type PrerenderedStory,
    withBasePlaceholder,
} from '../src/client/lib/prerendered.js';
import type { CakePHPRenderer, CakePHPStoryResult } from '../src/client/types.js';

const BASE = 'https://dev.example.com/storybook/';
const FILE = `${BASE}cakephp-prerendered/components-button--primary.json`;

const setURL = (url: string): void =>
    (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(url);

const setMarker = (enabled: boolean): void => {
    document.head.querySelector(`meta[name="${PRERENDERED_META}"]`)?.remove();
    if (enabled) {
        const meta = document.createElement('meta');
        meta.name = PRERENDERED_META;
        meta.content = 'cakephp-prerendered/';
        document.head.append(meta);
    }
};

const serve = (file: PrerenderedStory | null) => {
    const fetchMock = vi.fn(async () => (file === null ? new Response('', { status: 404 }) : Response.json(file)));
    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
};

const prerendered = (args: Record<string, unknown>, html: string, status = 200): PrerenderedStory => ({
    version: 1,
    renders: [
        {
            request: withBasePlaceholder(JSON.stringify({ element: 'components/button', args }), BASE),
            status,
            html: withBasePlaceholder(html, BASE),
        },
    ],
});

const context = (args: Record<string, unknown>) =>
    ({
        id: 'components-button--primary',
        args,
        unmappedArgs: args,
        argTypes: {},
        parameters: { __isArgsStory: true, docs: { source: {} } },
    }) as unknown as StoryContext<CakePHPRenderer>;

const decorate = (story: CakePHPStoryResult, args: Record<string, unknown>) =>
    (sourceDecorator as (storyFn: () => CakePHPStoryResult, context: StoryContext<CakePHPRenderer>) => unknown)(
        () => story,
        context(args)
    );

const snippets = async (): Promise<unknown[]> => {
    await vi.waitFor(() => expect(channel.emit).toHaveBeenCalled());

    return channel.emit.mock.calls.filter(([name]) => name === SNIPPET_RENDERED).map(([, payload]) => payload);
};

beforeEach(() => {
    clearPrerenderedCache();
    channel.emit.mockReset();
    cleanups.length = 0;
    setURL(`${BASE}iframe.html?viewMode=docs&id=components-button--docs`);
});

afterEach(() => setMarker(false));

describe('sourceDecorator', () => {
    it('shows the PHP code when the stories are rendered with the application', async () => {
        const fetchMock = serve(null);

        decorate({ element: 'components/button', args: { label: 'OK' } }, { label: 'OK' });

        expect(await snippets()).toEqual([
            {
                id: 'components-button--primary',
                args: { label: 'OK' },
                source: "<?= $this->element('components/button', [\n    'label' => 'OK',\n]) ?>",
            },
        ]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('shows the pre-rendered HTML in a pre-rendered Storybook', async () => {
        setMarker(true);
        serve(prerendered({ label: 'OK', src: `${BASE}assets/a.svg` }, `\n<a class="button"><img src="${BASE}assets/a.svg">OK</a>\n`));

        decorate(
            { element: 'components/button', args: { label: 'OK', src: `${BASE}assets/a.svg`, onClick: () => {} } },
            { label: 'OK' }
        );

        expect(await snippets()).toEqual([
            {
                id: 'components-button--primary',
                args: { label: 'OK' },
                source: `<a class="button"><img src="${BASE}assets/a.svg">OK</a>`,
            },
        ]);
    });

    it('shows the PHP code for args that were not pre-rendered', async () => {
        setMarker(true);
        serve(prerendered({ label: 'OK' }, '<a class="button">OK</a>'));

        decorate({ element: 'components/button', args: { label: 'Changed' } }, { label: 'Changed' });

        expect(await snippets()).toEqual([
            expect.objectContaining({ source: "<?= $this->element('components/button', [\n    'label' => 'Changed',\n]) ?>" }),
        ]);
    });

    it('does not emit the HTML of an earlier render', async () => {
        setMarker(true);
        serve(prerendered({ label: 'OK' }, '<a class="button">OK</a>'));

        decorate({ element: 'components/button', args: { label: 'OK' } }, { label: 'OK' });
        cleanups.forEach((cleanup) => cleanup());
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(channel.emit).not.toHaveBeenCalled();
    });

    it('does not show code when the story provides it', () => {
        setMarker(true);
        const fetchMock = serve(prerendered({}, '<p></p>'));
        const ctx = context({});
        ctx.parameters.docs.source.code = '<custom />';

        (sourceDecorator as (storyFn: () => CakePHPStoryResult, context: StoryContext<CakePHPRenderer>) => unknown)(
            () => ({ element: 'components/button', args: {} }),
            ctx
        );

        expect(channel.emit).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('prerenderedSource', () => {
    it('returns null outside a pre-rendered Storybook', async () => {
        await expect(prerenderedSource({ element: 'components/button' }, context({}))).resolves.toBeNull();
    });

    it('returns null for a story that was not pre-rendered', async () => {
        setMarker(true);
        serve(null);

        await expect(prerenderedSource({ element: 'components/button' }, context({}))).resolves.toBeNull();
    });

    it('returns null for a pre-rendered error', async () => {
        setMarker(true);
        serve(prerendered({}, '<!-- Failed -->\n<div class="storybook-cakephp-error"></div>', 500));

        await expect(prerenderedSource({ element: 'components/button', args: {} }, context({}))).resolves.toBeNull();
    });
});
