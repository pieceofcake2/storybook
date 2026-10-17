import type { Args } from 'storybook/internal/types';
/**
 * Attribute of the elements that listen to events for the function arguments (actions): with
 * `data-storybook-callbacks="increment"`, the `increment` event of the element calls the
 * `increment` argument.
 */
export declare const CALLBACK_ATTRIBUTE = "data-storybook-callbacks";
/**
 * Binds the function arguments to the events of the elements that have the callback attribute.
 *
 * @returns Names of the function arguments that are not bound to any element
 */
export declare const setupEventCallbacks: (args: Args, root: HTMLElement) => string[];
