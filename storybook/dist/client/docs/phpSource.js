import { sanitizeArgs } from '../lib/buildStoryArgs.js';
const INDENT = '    ';
const phpString = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
/**
 * Converts a value to PHP code (short array syntax).
 */
export const phpValue = (value, depth = 0) => {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'string') {
        return phpString(value);
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : 'null';
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    if (Array.isArray(value) || typeof value === 'object') {
        const entries = Array.isArray(value)
            ? value.map((item) => phpValue(item, depth + 1))
            : Object.entries(value).map(([key, item]) => `${phpString(key)} => ${phpValue(item, depth + 1)}`);
        if (entries.length === 0) {
            return '[]';
        }
        const indent = INDENT.repeat(depth + 1);
        return `[\n${entries.map((entry) => `${indent}${entry},`).join('\n')}\n${INDENT.repeat(depth)}]`;
    }
    return 'null';
};
/**
 * Returns the PHP code that renders the story in a template, shown in the "Show code" of Docs.
 */
export const phpSource = (story, args) => {
    const sanitized = sanitizeArgs(args);
    if ('element' in story) {
        const data = Object.keys(sanitized).length > 0 ? `, ${phpValue(sanitized)}` : '';
        return `<?= $this->element(${phpString(story.element)}${data}) ?>`;
    }
    const variables = Object.keys(sanitized).length > 0 ? `<?php $this->set(${phpValue(sanitized)}); ?>\n` : '';
    return `${variables}<?php // Story template: ${story.template} ?>`;
};
