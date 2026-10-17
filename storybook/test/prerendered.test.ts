// @vitest-environment happy-dom
import { STORY_ERRORED } from 'storybook/internal/core-events';
import type { RenderContext } from 'storybook/internal/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { channel, simulatePageLoad } = vi.hoisted(() => ({
    channel: { emit: vi.fn() },
    simulatePageLoad: vi.fn(),
}));

vi.mock('storybook/preview-api', () => ({
    addons: { getChannel: () => channel },
    simulatePageLoad,
}));

import { CakePHPRenderingError } from '../src/client/lib/CakePHPRenderingError.js';
import {
    BASE_PLACEHOLDER,
    clearPrerenderedCache,
    fetchPrerenderedHtml,
    PRERENDERED_META,
    PrerenderedArgsError,
    type PrerenderedStory,
    prerenderedDirUrl,
    storybookBaseUrl,
    withBasePlaceholder,
    withBaseUrl,
} from '../src/client/lib/prerendered.js';
import { renderToCanvas } from '../src/client/render.js';
import type { CakePHPRenderer } from '../src/client/types.js';

const BASE = 'https://dev.example.com/storybook/';

const setURL = (url: string): void =>
    (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(url);

const setMarker = (content: string | null): void => {
    document.head.querySelector(`meta[name="${PRERENDERED_META}"]`)?.remove();
    if (content !== null) {
        const meta = document.createElement('meta');
        meta.name = PRERENDERED_META;
        meta.content = content;
        document.head.append(meta);
    }
};

const storyFile = (...renders: { request: object; status?: number; html: string }[]): PrerenderedStory => ({
    version: 1,
    renders: renders.map(({ request, status = 200, html }) => ({
        request: withBasePlaceholder(JSON.stringify(request), BASE),
        status,
        html: withBasePlaceholder(html, BASE),
    })),
});

const serve = (files: Record<string, PrerenderedStory>) => {
    const fetchMock = vi.fn(async (url: URL | string) => {
        const file = files[String(url)];

        return file === undefined ? new Response('Not Found', { status: 404 }) : Response.json(file);
    });
    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
};

const renderContext = (story: { element: string; args?: Record<string, unknown> }) =>
    ({
        id: 'components-button--primary',
        showMain: vi.fn(),
        storyFn: () => story,
        storyContext: { args: story.args ?? {}, argTypes: {}, parameters: {} },
    }) as unknown as RenderContext<CakePHPRenderer>;

beforeEach(() => {
    clearPrerenderedCache();
    channel.emit.mockReset();
    simulatePageLoad.mockReset();
    setURL(`${BASE}iframe.html?id=components-button--primary&viewMode=story`);
});

afterEach(() => setMarker(null));

describe('prerenderedDirUrl', () => {
    it('returns null without the marker', () => {
        expect(prerenderedDirUrl()).toBeNull();
    });

    it('resolves the directory of the marker against iframe.html', () => {
        setMarker('cakephp-prerendered/');

        expect(prerenderedDirUrl()?.href).toBe(`${BASE}cakephp-prerendered/`);
        expect(storybookBaseUrl()).toBe(BASE);
    });

    it('adds the trailing slash and uses the default directory', () => {
        setMarker('stories');
        expect(prerenderedDirUrl()?.href).toBe(`${BASE}stories/`);

        setMarker('');
        expect(prerenderedDirUrl()?.href).toBe(`${BASE}cakephp-prerendered/`);
    });
});

describe('withBasePlaceholder and withBaseUrl', () => {
    it('replace the URL of the Storybook, also in JSON-escaped form', () => {
        const text = `<img src="http://127.0.0.1:1234/assets/photo.jpg" data-x='{"src":"http:\\/\\/127.0.0.1:1234\\/assets\\/a.jpg"}'>`;
        const stored = withBasePlaceholder(text, 'http://127.0.0.1:1234/');

        expect(stored).toBe(
            `<img src="${BASE_PLACEHOLDER}assets/photo.jpg" data-x='{"src":"{{storybook-cakephp-base}}\\/assets\\/a.jpg"}'>`
        );
        expect(withBaseUrl(stored, BASE)).toBe(
            `<img src="${BASE}assets/photo.jpg" data-x='{"src":"https:\\/\\/dev.example.com\\/storybook\\/assets\\/a.jpg"}'>`
        );
    });
});

describe('fetchPrerenderedHtml', () => {
    const dir = new URL(`${BASE}cakephp-prerendered/`);
    const request = { element: 'components/button', args: { label: 'OK', image: `${BASE}assets/a.jpg` } };

    it('returns the HTML of the render with the same request, with the URL of the Storybook', async () => {
        serve({
            [`${dir}components-button--primary.json`]: storyFile(
                { request: { element: 'components/button', args: { label: 'Other' } }, html: '<p>other</p>' },
                { request, html: `<img src="${BASE}assets/a.jpg">` }
            ),
        });

        await expect(fetchPrerenderedHtml(dir, 'components-button--primary', request, BASE)).resolves.toBe(
            `<img src="${BASE}assets/a.jpg">`
        );
    });

    it('loads the file of a story once', async () => {
        const fetchMock = serve({ [`${dir}s.json`]: storyFile({ request, html: '<p></p>' }) });

        await fetchPrerenderedHtml(dir, 's', request, BASE);
        await fetchPrerenderedHtml(dir, 's', request, BASE);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws PrerenderedArgsError when the args differ', async () => {
        serve({ [`${dir}s.json`]: storyFile({ request, html: '<p></p>' }) });

        await expect(
            fetchPrerenderedHtml(dir, 's', { element: 'components/button', args: { label: 'Changed' } }, BASE)
        ).rejects.toBeInstanceOf(PrerenderedArgsError);
    });

    it('throws CakePHPRenderingError for a pre-rendered error', async () => {
        const errorPage = '<!-- Element &quot;secret&quot; was not found. -->\n<div class="storybook-cakephp-error"></div>';
        serve({ [`${dir}s.json`]: storyFile({ request, status: 404, html: errorPage }) });

        const error = await fetchPrerenderedHtml(dir, 's', request, BASE).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(CakePHPRenderingError);
        expect(error).toMatchObject({ title: 'Element "secret" was not found.', status: 404, errorPage });
    });

    it('throws when the story was not pre-rendered', async () => {
        serve({});

        await expect(fetchPrerenderedHtml(dir, 'missing', request, BASE)).rejects.toThrow(
            'Story missing was not pre-rendered'
        );
    });
});

describe('renderToCanvas in a pre-rendered Storybook', () => {
    const story = { element: 'components/button', args: { label: 'OK', onClick: () => {} } };

    beforeEach(() => setMarker('cakephp-prerendered/'));

    it('renders the pre-rendered HTML without requesting the application', async () => {
        const fetchMock = serve({
            [`${BASE}cakephp-prerendered/components-button--primary.json`]: storyFile({
                request: { element: 'components/button', args: { label: 'OK' } },
                html: '<a class="button">OK</a>',
            }),
        });
        const canvas = document.createElement('div');
        const context = renderContext(story);

        await renderToCanvas(context, canvas);

        expect(canvas.innerHTML).toBe('<a class="button">OK</a>');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('_storybook/render');
        expect(simulatePageLoad).toHaveBeenCalledWith(canvas);
    });

    it('shows a notice when the args were changed', async () => {
        serve({
            [`${BASE}cakephp-prerendered/components-button--primary.json`]: storyFile({
                request: { element: 'components/button', args: { label: 'OK' } },
                html: '<a class="button">OK</a>',
            }),
        });
        vi.spyOn(console, 'info').mockImplementation(() => {});
        const canvas = document.createElement('div');
        const context = renderContext({ element: 'components/button', args: { label: 'Changed' } });

        await renderToCanvas(context, canvas);

        expect(canvas.querySelector('.storybook-cakephp-static-notice')?.textContent).toContain(
            'This story cannot be rendered with these args.'
        );
        expect(context.showMain).toHaveBeenCalled();
        expect(channel.emit).not.toHaveBeenCalled();
        expect(simulatePageLoad).not.toHaveBeenCalled();
    });

    it('shows a pre-rendered error as the application would', async () => {
        const errorPage = '<!-- Failed -->\n<div class="storybook-cakephp-error"></div>';
        serve({
            [`${BASE}cakephp-prerendered/components-button--primary.json`]: storyFile({
                request: { element: 'components/button', args: { label: 'OK' } },
                status: 500,
                html: errorPage,
            }),
        });
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const canvas = document.createElement('div');

        await renderToCanvas(renderContext(story), canvas);

        expect(canvas.innerHTML).toBe(errorPage);
        expect(channel.emit).toHaveBeenCalledWith(STORY_ERRORED, expect.objectContaining({ title: 'components-button--primary' }));
    });
});
