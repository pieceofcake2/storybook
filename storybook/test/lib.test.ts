// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

import { buildStoryArgs, sanitizeArgs } from '../src/client/lib/buildStoryArgs.js';
import { NAME_PATTERN, normalizeComponent } from '../src/client/lib/component.js';
import { setupEventCallbacks } from '../src/client/lib/eventCallbacks.js';
import { decodeEntities, extractErrorTitle } from '../src/client/lib/extractErrorTitle.js';
import { renderUrl } from '../src/client/lib/renderUrl.js';

describe('sanitizeArgs', () => {
    it('removes functions and undefined values deeply', () => {
        const fn = () => {};

        expect(sanitizeArgs({ a: 1, b: fn, c: { d: fn, e: 'x' }, f: [1, fn, { g: fn }], h: undefined, i: null })).toEqual({
            a: 1,
            c: { e: 'x' },
            f: [1, {}],
            i: null,
        });
    });

    it('converts dates to ISO 8601 strings', () => {
        expect(sanitizeArgs({ at: new Date(Date.UTC(2026, 9, 17)) })).toEqual({ at: '2026-10-17T00:00:00.000Z' });
    });
});

describe('buildStoryArgs', () => {
    it('converts the timestamps of date controls', () => {
        const args = buildStoryArgs(
            { at: Date.UTC(2026, 0, 1), empty: '', other: 0 },
            { at: { name: 'at', control: 'date' }, empty: { name: 'empty', control: { type: 'date' } } }
        );

        expect(args).toEqual({ at: '2026-01-01T00:00:00.000Z', empty: '', other: 0 });
    });
});

describe('normalizeComponent', () => {
    it('normalizes the components', () => {
        expect(normalizeComponent('components/button')).toEqual({ element: 'components/button' });
        expect(normalizeComponent({ element: 'components/button' })).toEqual({ element: 'components/button' });
        expect(normalizeComponent({ template: 'list' })).toEqual({ template: 'list' });
        expect(normalizeComponent({ name: 'x' })).toBeNull();
        expect(normalizeComponent(undefined)).toBeNull();
    });

    it('has the same name pattern as the server', () => {
        expect(NAME_PATTERN.test('components/forms/field')).toBe(true);
        expect(NAME_PATTERN.test('components/../secret')).toBe(false);
        expect(NAME_PATTERN.test('/components/button')).toBe(false);
    });
});

describe('extractErrorTitle', () => {
    it('extracts and decodes the message of the first line', () => {
        expect(extractErrorTitle('<!-- Element &quot;a&quot; &lt;b&gt; &#039;c&#039; &amp; d -->\n<div></div>')).toBe(
            `Element "a" <b> 'c' & d`
        );
    });

    it('returns the fallback without the comment', () => {
        expect(extractErrorTitle('<div>error</div>', '500 Internal Server Error')).toBe('500 Internal Server Error');
        expect(extractErrorTitle('<div>\n<!-- not first -->', 'fallback')).toBe('fallback');
        expect(extractErrorTitle('')).toBe('');
    });

    it('decodes numeric entities and keeps unknown ones', () => {
        expect(decodeEntities('&#65;&#x42;&unknown;')).toBe('AB&unknown;');
    });
});

describe('renderUrl', () => {
    it('resolves the path against the origin', () => {
        expect(String(renderUrl('a--b', 'https://example.com'))).toBe('https://example.com/_storybook/render/a--b');
        expect(String(renderUrl('a--b', 'https://example.com', '/sub/_storybook/render/'))).toBe(
            'https://example.com/sub/_storybook/render/a--b'
        );
        expect(String(renderUrl('a--b', 'https://example.com', 'http://localhost:8765/_storybook/render'))).toBe(
            'http://localhost:8765/_storybook/render/a--b'
        );
    });
});

describe('setupEventCallbacks', () => {
    it('binds functions to the events of the elements and returns the unbound names', () => {
        const root = document.createElement('div');
        root.innerHTML = '<button data-storybook-callbacks="click">a</button><span data-storybook-callbacks="clicked">b</span>';
        const click = vi.fn();
        const missing = vi.fn();

        const unbound = setupEventCallbacks({ click, missing, label: 'x' }, root);
        root.querySelector('button')?.click();
        root.querySelector('span')?.dispatchEvent(new Event('click'));

        expect(click).toHaveBeenCalledTimes(1);
        expect(unbound).toEqual(['missing']);
    });
});
