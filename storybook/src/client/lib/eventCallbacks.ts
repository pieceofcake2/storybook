// Adapted from Storybook for Symfony (MIT License, Copyright (c) 2024 SensioLabs). See NOTICE.md.
import type { Args } from 'storybook/internal/types';

/**
 * Attribute of the elements that listen to events for the function arguments (actions): with
 * `data-storybook-callbacks="increment"`, the `increment` event of the element calls the
 * `increment` argument.
 */
export const CALLBACK_ATTRIBUTE = 'data-storybook-callbacks';

/**
 * Binds the function arguments to the events of the elements that have the callback attribute.
 *
 * @returns Names of the function arguments that are not bound to any element
 */
export const setupEventCallbacks = (args: Args, root: HTMLElement): string[] => {
    const unbound: string[] = [];

    for (const [name, callback] of Object.entries(args)) {
        if (typeof callback !== 'function') {
            continue;
        }
        const elements = Array.from(root.querySelectorAll(`[${CALLBACK_ATTRIBUTE}]`)).filter((element) =>
            (element.getAttribute(CALLBACK_ATTRIBUTE) ?? '').split(/\s+/).includes(name)
        );
        if (elements.length === 0) {
            unbound.push(name);
        }
        for (const element of elements) {
            element.addEventListener(name, (event) => callback(event));
        }
    }

    return unbound;
};
