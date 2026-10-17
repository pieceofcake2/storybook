// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import { PRERENDERED_META } from '../src/client/lib/prerendered.js';
import { argValueSummary, readonlyControls } from '../src/client/lib/readonlyControls.js';
import { argTypesEnhancers } from '../src/entry-preview.js';

const setMarker = (enabled: boolean): void => {
    document.head.querySelector(`meta[name="${PRERENDERED_META}"]`)?.remove();
    if (enabled) {
        const meta = document.createElement('meta');
        meta.name = PRERENDERED_META;
        meta.content = 'cakephp-prerendered/';
        document.head.append(meta);
    }
};

const enhance = (argTypes: Record<string, object>, initialArgs: Record<string, unknown>) =>
    (readonlyControls as (context: unknown) => unknown)({ argTypes, initialArgs, parameters: {} });

afterEach(() => setMarker(false));

describe('readonlyControls', () => {
    const argTypes = {
        variant: { name: 'variant', control: 'inline-radio', options: ['primary', 'secondary'], description: 'Variant' },
    };

    it('keeps the controls when the stories are rendered with the application', () => {
        expect(enhance(argTypes, { label: 'Apply' })).toBe(argTypes);
    });

    it('disables the controls of all the args and shows their values in a pre-rendered Storybook', () => {
        setMarker(true);

        expect(enhance(argTypes, { label: 'Apply', variant: 'primary', onClick: () => {} })).toEqual({
            variant: {
                name: 'variant',
                control: false,
                options: ['primary', 'secondary'],
                description: 'Variant',
                table: { defaultValue: { summary: '"primary"' } },
            },
            label: { control: false, table: { defaultValue: { summary: '"Apply"' } } },
            onClick: { control: false },
        });
    });

    it('keeps the default value set in the argTypes', () => {
        setMarker(true);

        expect(
            enhance({ size: { table: { category: 'Style', defaultValue: { summary: 'medium' } } } }, { size: 'large' })
        ).toEqual({ size: { control: false, table: { category: 'Style', defaultValue: { summary: 'medium' } } } });
    });

    it('handles stories without args', () => {
        setMarker(true);

        expect((readonlyControls as (context: unknown) => unknown)({ parameters: {} })).toEqual({});
    });

    it('is an enhancer of the preview', () => {
        expect(argTypesEnhancers).toContain(readonlyControls);
    });
});

describe('argValueSummary', () => {
    it('shows the values as JSON', () => {
        expect(argValueSummary('Apply')).toEqual({ summary: '"Apply"' });
        expect(argValueSummary(2)).toEqual({ summary: '2' });
        expect(argValueSummary(null)).toEqual({ summary: 'null' });
        expect(argValueSummary(new Date(Date.UTC(2026, 0, 2)))).toEqual({ summary: '"2026-01-02T00:00:00.000Z"' });
        expect(argValueSummary([1, 2, () => {}])).toEqual({ summary: '[1,2]' });
    });

    it('shows long arrays and objects in the detail', () => {
        const alerts = [{ message: 'Saved.', type: 'success' }, { message: 'Check the form.', type: 'danger' }];

        expect(argValueSummary(alerts)).toEqual({ summary: 'array', detail: JSON.stringify(alerts, null, 2) });
        expect(argValueSummary({ text: 'x'.repeat(40) })).toEqual(
            expect.objectContaining({ summary: 'object' })
        );
    });

    it('does not show functions', () => {
        expect(argValueSummary(() => {})).toBeUndefined();
        expect(argValueSummary(undefined)).toBeUndefined();
    });
});
