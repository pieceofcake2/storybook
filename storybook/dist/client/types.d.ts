import type { Args, ArgsStoryFn, StoryContext as StoryContextBase, WebRenderer } from 'storybook/internal/types';
/**
 * Story of an Element: the Element name (e.g. `components/page_header`) and its arguments,
 * which become the variables of the Element.
 */
export type ElementStory = {
    element: string;
    args?: Args;
};
/**
 * Story of a story template on the server (e.g. `templates/Stories/job_list.php`), which can
 * combine Elements.
 */
export type TemplateStory = {
    template: string;
    args?: Args;
};
/**
 * What a story renders: an Element or a story template, with its arguments.
 */
export type CakePHPStoryResult = ElementStory | TemplateStory;
/**
 * The `component` of a story: an Element name, or an object made by `element()` or `template()`.
 */
export type CakePHPComponent = string | {
    element: string;
} | {
    template: string;
};
export interface CakePHPRenderer extends WebRenderer {
    component: CakePHPComponent | ArgsStoryFn<CakePHPRenderer> | undefined;
    storyResult: CakePHPStoryResult;
}
/**
 * Parameters of the `cakephp` key.
 */
export type CakePHPParameters = {
    /**
     * URL of the render endpoint. Defaults to `/_storybook/render` on the origin of the page, so
     * that it does not depend on the path where a static build is deployed.
     */
    renderUrl?: string;
    /**
     * Story ID sent in the URL (defaults to the ID of the story). It is only used for logs and
     * error messages on the server.
     */
    id?: string;
};
export type StoryContext = StoryContextBase<CakePHPRenderer>;
