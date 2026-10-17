import { describe, expect, it } from 'vitest';

import { phpSource, phpValue } from '../src/client/docs/phpSource.js';

describe('phpValue', () => {
    it('converts values to PHP code', () => {
        expect(phpValue('it\'s \\ ok')).toBe("'it\\'s \\\\ ok'");
        expect(phpValue(1.5)).toBe('1.5');
        expect(phpValue(Number.NaN)).toBe('null');
        expect(phpValue(true)).toBe('true');
        expect(phpValue(null)).toBe('null');
        expect(phpValue([])).toBe('[]');
        expect(phpValue({ a: [1, 'b'] })).toBe("[\n    'a' => [\n        1,\n        'b',\n    ],\n]");
    });
});

describe('phpSource', () => {
    it('shows the element call', () => {
        expect(phpSource({ element: 'components/button' }, { label: 'OK', onClick: () => {} })).toBe(
            "<?= $this->element('components/button', [\n    'label' => 'OK',\n]) ?>"
        );
        expect(phpSource({ element: 'components/button' }, {})).toBe("<?= $this->element('components/button') ?>");
    });

    it('shows the variables of a story template', () => {
        expect(phpSource({ template: 'alert_list' }, { alerts: [] })).toBe(
            "<?php $this->set([\n    'alerts' => [],\n]); ?>\n<?php // Story template: alert_list ?>"
        );
    });
});
