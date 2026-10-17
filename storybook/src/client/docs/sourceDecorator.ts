// Adapted from Storybook for Symfony (MIT License, Copyright (c) 2024 SensioLabs). See NOTICE.md.
import { SNIPPET_RENDERED, SourceType } from 'storybook/internal/docs-tools';
import type { DecoratorFunction, StoryContext } from 'storybook/internal/types';
import { addons, useEffect } from 'storybook/preview-api';

import type { CakePHPRenderer } from '../types.js';
import { phpSource } from './phpSource.js';

const skipSourceRender = (context: StoryContext<CakePHPRenderer>): boolean => {
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
export const sourceDecorator: DecoratorFunction<CakePHPRenderer> = (storyFn, context) => {
    const story = storyFn();
    const source = skipSourceRender(context) ? undefined : phpSource(story, story.args ?? context.args);

    useEffect(() => {
        if (source !== undefined) {
            addons.getChannel().emit(SNIPPET_RENDERED, { id: context.id, args: context.unmappedArgs, source });
        }
    });

    return story;
};
