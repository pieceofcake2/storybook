// Adapted from Storybook for Symfony (MIT License, Copyright (c) 2024 SensioLabs). See NOTICE.md.
const ENTITIES = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
};
/**
 * Decodes the HTML entities written by `h()`.
 */
export const decodeEntities = (text) => text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (entity, decimal, hex, name) => {
    if (decimal !== undefined) {
        return String.fromCodePoint(Number(decimal));
    }
    if (hex !== undefined) {
        return String.fromCodePoint(parseInt(hex, 16));
    }
    return ENTITIES[name.toLowerCase()] ?? entity;
});
/**
 * Extracts the error message from the first line of an error response (`<!-- message -->`).
 */
export const extractErrorTitle = (html, fallback = '') => {
    const firstLine = html.split('\n', 1)[0] ?? '';
    const matches = firstLine.match(/^\s*<!--\s*(.*?)\s*-->\s*$/);
    if (matches === null || matches[1] === undefined) {
        return fallback;
    }
    return decodeEntities(matches[1]);
};
