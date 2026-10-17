// Adapted from Storybook for Symfony (MIT License, Copyright (c) 2024 SensioLabs). See NOTICE.md.
import type { Args, ArgTypes } from 'storybook/internal/types';

/**
 * Removes the functions (actions) from the arguments, deeply, since they cannot be sent to the
 * server. They are bound to the DOM by `setupEventCallbacks()` instead.
 */
export const sanitizeArgs = (value: unknown): unknown => {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item !== 'function').map((item) => sanitizeArgs(item));
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value !== 'object' || value === null) {
        return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
        if (typeof item !== 'function' && item !== undefined) {
            result[key] = sanitizeArgs(item);
        }
    }

    return result;
};

/**
 * Builds the arguments sent to the server: functions are removed, and dates (including the
 * timestamps of the `date` control) are converted to ISO 8601 strings.
 */
export const buildStoryArgs = (args: Args, argTypes: ArgTypes = {}): Record<string, unknown> => {
    const storyArgs = sanitizeArgs(args) as Record<string, unknown>;

    for (const [key, argType] of Object.entries(argTypes)) {
        const { control } = argType;
        const controlType = typeof control === 'object' && control !== null ? control.type : control;
        const value = storyArgs[key];

        if (controlType === 'date' && (typeof value === 'number' || typeof value === 'string') && value !== '') {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                storyArgs[key] = date.toISOString();
            }
        }
    }

    return storyArgs;
};
