import { SNIPPET_RENDERED, SourceType } from 'storybook/internal/docs-tools';
import { addons, useEffect } from 'storybook/preview-api';
import { phpSource } from './phpSource.js';
const skipSourceRender = (context) => {
    const sourceParams = context.parameters.docs?.source;
    const isArgsStory = context.parameters.__isArgsStory;
    // Always render if the user forces it
    if (sourceParams?.type === SourceType.DYNAMIC) {
        return false;
    }
    // Never render if the user is forcing the block to render code, or if the user provides code,
    // or if it's not an args story
    return !isArgsStory || Boolean(sourceParams?.code) || sourceParams?.type === SourceType.CODE;
};
/**
 * Shows the PHP code that renders the story (e.g. `$this->element('components/button', [...])`)
 * in the "Show code" of Docs.
 */
export const sourceDecorator = (storyFn, context) => {
    const story = storyFn();
    const source = skipSourceRender(context) ? undefined : phpSource(story, story.args ?? context.args);
    useEffect(() => {
        if (source !== undefined) {
            addons.getChannel().emit(SNIPPET_RENDERED, { id: context.id, args: context.unmappedArgs, source });
        }
    });
    return story;
};
