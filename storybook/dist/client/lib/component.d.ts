import type { CakePHPComponent } from '../types.js';
/**
 * Pattern of the names of Elements and story templates, as checked by the server.
 */
export declare const NAME_PATTERN: RegExp;
/**
 * Refers to an Element (e.g. `element('components/page_header')`). A string `component` is the
 * same as `element()`.
 */
export declare const element: (name: string) => {
    element: string;
};
/**
 * Refers to a story template on the server (e.g. `template('job_list')` for
 * `templates/Stories/job_list.php`), to show Elements combined together.
 */
export declare const template: (name: string) => {
    template: string;
};
/**
 * Normalizes the `component` of a story to `{ element }` or `{ template }`, or returns null if it
 * is not one.
 */
export declare const normalizeComponent: (component: unknown) => {
    element: string;
} | {
    template: string;
} | null;
export type { CakePHPComponent };
