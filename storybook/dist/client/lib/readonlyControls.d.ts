import type { ArgTypesEnhancer } from 'storybook/internal/types';
import type { CakePHPRenderer } from '../types.js';
/**
 * Returns the value of an arg for the "Default" column of the table, or undefined for a function
 * (an action).
 */
export declare const argValueSummary: (value: unknown) => {
    summary: string;
    detail?: string;
} | undefined;
/**
 * Makes the controls read-only in a pre-rendered (static) Storybook, whose stories cannot be
 * rendered with other args. Every arg (of `argTypes` and of `args`) gets `control: false`, so the
 * Controls panel and the ArgTypes of Docs show the args (name, description) without editors, and
 * the value of the arg in the story is shown in the "Default" column (unless `table.defaultValue`
 * is set). `storybook dev` keeps the controls.
 *
 * It runs before the enhancers of Storybook that infer the types and the controls of the args,
 * which keep `control: false`.
 */
export declare const readonlyControls: ArgTypesEnhancer<CakePHPRenderer>;
