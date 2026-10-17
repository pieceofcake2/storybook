import type { CakePHPStoryResult } from '../types.js';
/**
 * Converts a value to PHP code (short array syntax).
 */
export declare const phpValue: (value: unknown, depth?: number) => string;
/**
 * Returns the PHP code that renders the story in a template, shown in the "Show code" of Docs.
 */
export declare const phpSource: (story: CakePHPStoryResult, args: Record<string, unknown>) => string;
