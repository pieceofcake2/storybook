// @vitest-environment happy-dom
import { STORY_ERRORED, STORY_RENDER_PHASE_CHANGED } from 'storybook/internal/core-events';
import type { RenderContext } from 'storybook/internal/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { channel, simulatePageLoad } = vi.hoisted(() => ({
    channel: { emit: vi.fn() },
    simulatePageLoad: vi.fn(),
}));

vi.mock('storybook/preview-api', () => ({
    addons: { getChannel: () => channel },
    simulatePageLoad,
}));

import { element, template } from '../src/client/lib/component.js';
import { CakePHPRenderingError, render, renderToCanvas } from '../src/client/render.js';
import type { CakePHPRenderer, CakePHPStoryResult } from '../src/client/types.js';

type Context = RenderContext<CakePHPRenderer>;

const renderContext = (
    story: CakePHPStoryResult,
    overrides: { args?: Record<string, unknown>; parameters?: Record<string, unknown>; argTypes?: object } = {}
): Context & { showMain: ReturnType<typeof vi.fn> } =>
    ({
        id: 'components-button--primary',
        title: 'Components/Button',
        name: 'Primary',
        showMain: vi.fn(),
        showError: vi.fn(),
        showException: vi.fn(),
        forceRemount: false,
        storyFn: () => story,
        storyContext: {
            args: overrides.args ?? story.args ?? {},
            argTypes: overrides.argTypes ?? {},
            parameters: overrides.parameters ?? {},
        },
    }) as unknown as Context & { showMain: ReturnType<typeof vi.fn> };

const setURL = (url: string): void =>
    (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(url);

const respond = (body: string, status = 200) =>
    vi.fn(async () => new Response(body, { status, headers: { 'Content-Type': 'text/html' } }));

const requestOf = (fetchMock: ReturnType<typeof vi.fn>, call = 0) => {
    const [url, init] = fetchMock.mock.calls[call] as [URL, RequestInit];

    return { url: String(url), init, body: JSON.parse(String(init.body)) };
};

beforeEach(() => {
    channel.emit.mockReset();
    simulatePageLoad.mockReset();
    setURL('http://localhost:6006/iframe.html?id=components-button--primary&viewMode=story');
});

describe('render', () => {
    const context = (component: unknown) => ({ id: 'story', component }) as never;

    it('renders the Element named by a string component with the args', () => {
        expect(render({ label: 'OK' }, context('components/button'))).toEqual({
            element: 'components/button',
            args: { label: 'OK' },
        });
    });

    it('renders element() and template() components', () => {
        expect(render({}, context(element('components/alert')))).toEqual({ element: 'components/alert', args: {} });
        expect(render({ a: 1 }, context(template('alert_list')))).toEqual({ template: 'alert_list', args: { a: 1 } });
    });

    it('calls a function component', () => {
        const component = vi.fn(() => ({ element: 'components/x', args: { b: 2 } }));

        expect(render({ a: 1 }, context(component))).toEqual({ element: 'components/x', args: { b: 2 } });
        expect(component).toHaveBeenCalledWith({ a: 1 }, expect.anything());
    });

    it('throws without a component', () => {
        expect(() => render({}, context(undefined))).toThrow('Unable to render story story');
    });
});

describe('renderToCanvas', () => {
    it('posts the Element name and the args as JSON to the render endpoint of the origin', async () => {
        const fetchMock = respond('<a class="button">OK</a>');
        vi.stubGlobal('fetch', fetchMock);
        const canvas = document.createElement('div');
        const context = renderContext({ element: 'components/button', args: { label: 'OK', onClick: () => {} } });

        await renderToCanvas(context, canvas);

        const request = requestOf(fetchMock);
        expect(request.url).toBe('http://localhost:6006/_storybook/render/components-button--primary');
        expect(request.init.method).toBe('POST');
        expect(new Headers(request.init.headers).get('Content-Type')).toBe('application/json');
        expect(request.body).toEqual({ element: 'components/button', args: { label: 'OK' } });
        expect(canvas.innerHTML).toBe('<a class="button">OK</a>');
        expect(context.showMain).toHaveBeenCalled();
        expect(simulatePageLoad).toHaveBeenCalledWith(canvas);
        expect(channel.emit).not.toHaveBeenCalled();
    });

    it('posts the template name for a story template', async () => {
        const fetchMock = respond('<div></div>');
        vi.stubGlobal('fetch', fetchMock);

        await renderToCanvas(renderContext({ template: 'alert_list', args: { alerts: [] } }), document.createElement('div'));

        expect(requestOf(fetchMock).body).toEqual({ template: 'alert_list', args: { alerts: [] } });
    });

    it('does not depend on the path where a static build is deployed', async () => {
        setURL('https://dev.example.com/storybook/iframe.html?id=components-button--primary');
        const fetchMock = respond('<p></p>');
        vi.stubGlobal('fetch', fetchMock);

        await renderToCanvas(renderContext({ element: 'components/button' }), document.createElement('div'));

        expect(requestOf(fetchMock).url).toBe('https://dev.example.com/_storybook/render/components-button--primary');
    });

    it('uses the renderUrl and id parameters', async () => {
        const fetchMock = respond('<p></p>');
        vi.stubGlobal('fetch', fetchMock);
        const context = renderContext(
            { element: 'components/button' },
            { parameters: { cakephp: { renderUrl: '/app/_storybook/render/', id: 'custom-id' } } }
        );

        await renderToCanvas(context, document.createElement('div'));

        expect(requestOf(fetchMock).url).toBe('http://localhost:6006/app/_storybook/render/custom-id');
    });

    it('converts date controls to ISO 8601 strings', async () => {
        const fetchMock = respond('<p></p>');
        vi.stubGlobal('fetch', fetchMock);
        const context = renderContext(
            { element: 'components/date', args: { publishedAt: Date.UTC(2026, 0, 2) } },
            { argTypes: { publishedAt: { control: { type: 'date' } } } }
        );

        await renderToCanvas(context, document.createElement('div'));

        expect(requestOf(fetchMock).body.args).toEqual({ publishedAt: '2026-01-02T00:00:00.000Z' });
    });

    it('binds function args to the elements with the callback attribute', async () => {
        vi.stubGlobal('fetch', respond('<button data-storybook-callbacks="increment other">+1</button>'));
        const increment = vi.fn();
        const canvas = document.createElement('div');

        await renderToCanvas(renderContext({ element: 'components/counter', args: { increment } }), canvas);
        canvas.querySelector('button')?.dispatchEvent(new CustomEvent('increment', { detail: 1 }));

        expect(increment).toHaveBeenCalledTimes(1);
        expect((increment.mock.calls[0]?.[0] as CustomEvent).detail).toBe(1);
    });

    it('shows the error page and emits STORY_ERRORED when the server returns an error', async () => {
        const errorPage = '<!-- Element &quot;secret&quot; is not in the allowed directories (components). -->\n<div>404</div>';
        vi.stubGlobal('fetch', respond(errorPage, 404));
        const canvas = document.createElement('div');

        await renderToCanvas(renderContext({ element: 'secret' }), canvas);

        expect(canvas.innerHTML).toBe(errorPage);
        expect(channel.emit).toHaveBeenCalledWith(STORY_ERRORED, {
            title: 'components-button--primary',
            description: 'Server failed to render story:\nElement "secret" is not in the allowed directories (components).',
        });
        expect(channel.emit).toHaveBeenCalledWith(STORY_RENDER_PHASE_CHANGED, {
            newPhase: 'errored',
            storyId: 'components-button--primary',
        });
        expect(simulatePageLoad).not.toHaveBeenCalled();
    });

    it('uses the status as the title of an error without the comment', async () => {
        vi.stubGlobal('fetch', respond('<html>Internal Server Error</html>', 500));

        await renderToCanvas(renderContext({ element: 'components/button' }), document.createElement('div'));

        expect(channel.emit).toHaveBeenCalledWith(STORY_ERRORED, expect.objectContaining({
            description: expect.stringContaining('500'),
        }));
    });

    it('throws a helpful error when the application cannot be reached', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));

        await expect(
            renderToCanvas(renderContext({ element: 'components/button' }), document.createElement('div'))
        ).rejects.toThrow('Failed to connect to the CakePHP application at http://localhost:6006/_storybook/render/');
    });

    it('ignores the response of an earlier render', async () => {
        let resolveFirst: (response: Response) => void = () => {};
        const fetchMock = vi
            .fn()
            .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveFirst = resolve)))
            .mockImplementationOnce(async () => new Response('<p>second</p>'));
        vi.stubGlobal('fetch', fetchMock);
        const canvas = document.createElement('div');

        const first = renderToCanvas(renderContext({ element: 'components/button' }), canvas);
        await renderToCanvas(renderContext({ element: 'components/button' }), canvas);
        resolveFirst(new Response('<p>first</p>'));
        await first;

        expect(canvas.innerHTML).toBe('<p>second</p>');
    });

    it('exposes the rendering error class', () => {
        const error = new CakePHPRenderingError('title', '<p></p>', 400);

        expect(error).toBeInstanceOf(Error);
        expect(error.status).toBe(400);
    });
});
