import type { Args, ArgTypes } from 'storybook/internal/types';
/**
 * Removes the functions (actions) from the arguments, deeply, since they cannot be sent to the
 * server. They are bound to the DOM by `setupEventCallbacks()` instead.
 */
export declare const sanitizeArgs: (value: unknown) => unknown;
/**
 * Builds the arguments sent to the server: functions are removed, and dates (including the
 * timestamps of the `date` control) are converted to ISO 8601 strings.
 */
export declare const buildStoryArgs: (args: Args, argTypes?: ArgTypes) => Record<string, unknown>;
