import type { CakePHPComponent } from '../types.js';

/**
 * Pattern of the names of Elements and story templates, as checked by the server.
 */
export const NAME_PATTERN = /^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/;

/**
 * Refers to an Element (e.g. `element('components/page_header')`). A string `component` is the
 * same as `element()`.
 */
export const element = (name: string): { element: string } => ({ element: name });

/**
 * Refers to a story template on the server (e.g. `template('job_list')` for
 * `templates/Stories/job_list.php`), to show Elements combined together.
 */
export const template = (name: string): { template: string } => ({ template: name });

/**
 * Normalizes the `component` of a story to `{ element }` or `{ template }`, or returns null if it
 * is not one.
 */
export const normalizeComponent = (component: unknown): { element: string } | { template: string } | null => {
    if (typeof component === 'string') {
        return { element: component };
    }
    if (typeof component === 'object' && component !== null) {
        if ('element' in component && typeof component.element === 'string') {
            return { element: component.element };
        }
        if ('template' in component && typeof component.template === 'string') {
            return { template: component.template };
        }
    }

    return null;
};

export type { CakePHPComponent };
