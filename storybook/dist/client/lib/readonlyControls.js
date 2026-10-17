import { sanitizeArgs } from './buildStoryArgs.js';
import { prerenderedDirUrl } from './prerendered.js';
/**
 * Longest JSON of an array or an object shown as is in the table (longer ones are shown in a
 * tooltip).
 */
const SUMMARY_LENGTH = 40;
/**
 * Returns the value of an arg for the "Default" column of the table, or undefined for a function
 * (an action).
 */
export const argValueSummary = (value) => {
    if (typeof value === 'function' || value === undefined) {
        return undefined;
    }
    const sanitized = sanitizeArgs(value);
    const json = JSON.stringify(sanitized);
    if (typeof sanitized !== 'object' || sanitized === null || json.length <= SUMMARY_LENGTH) {
        return { summary: json };
    }
    return { summary: Array.isArray(sanitized) ? 'array' : 'object', detail: JSON.stringify(sanitized, null, 2) };
};
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
export const readonlyControls = (context) => {
    const argTypes = (context.argTypes ?? {});
    if (prerenderedDirUrl() === null) {
        return argTypes;
    }
    const initialArgs = context.initialArgs ?? {};
    const names = new Set([...Object.keys(argTypes), ...Object.keys(initialArgs)]);
    return Object.fromEntries([...names].map((name) => {
        const argType = { ...argTypes[name], control: false };
        const defaultValue = argValueSummary(initialArgs[name]);
        if (defaultValue !== undefined && argType.table?.defaultValue === undefined) {
            argType.table = { ...argType.table, defaultValue };
        }
        return [name, argType];
    }));
};
