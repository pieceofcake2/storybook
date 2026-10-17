// Adapted from Storybook for Symfony (MIT License, Copyright (c) 2024 SensioLabs). See NOTICE.md.
import { SNIPPET_RENDERED, SourceType } from 'storybook/internal/docs-tools';
import type { DecoratorFunction, StoryContext } from 'storybook/internal/types';
import { addons, useEffect } from 'storybook/preview-api';

import { buildStoryArgs } from '../lib/buildStoryArgs.js';
import { fetchPrerenderedHtml, prerenderedDirUrl, storybookBaseUrl } from '../lib/prerendered.js';
import { renderRequestBody } from '../render.js';
import type { CakePHPRenderer, CakePHPStoryResult } from '../types.js';
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
 * Returns the pre-rendered HTML of a story in a pre-rendered (static) Storybook, or null if the
 * Storybook renders the stories with the application, or if the story was not pre-rendered with
 * these args.
 */
export const prerenderedSource = async (
    story: CakePHPStoryResult,
    context: StoryContext<CakePHPRenderer>
): Promise<string | null> => {
    const dir = prerenderedDirUrl();
    if (dir === null) {
        return null;
    }
    const args = buildStoryArgs(story.args ?? context.args, context.argTypes);
    try {
        // The same request as renderToCanvas(): the file of the story is loaded once
        const html = await fetchPrerenderedHtml(dir, context.id, renderRequestBody(story, args), storybookBaseUrl());

        return html.trim();
    } catch {
        return null;
    }
};

/**
 * Shows the code of the story in the "Show code" of Docs: the PHP code that renders the story
 * (e.g. `$this->element('components/button', [...])`), or the pre-rendered HTML in a pre-rendered
 * (static) Storybook, whose args cannot be changed.
 */
export const sourceDecorator: DecoratorFunction<CakePHPRenderer> = (storyFn, context) => {
    const story = storyFn();
    const skip = skipSourceRender(context);
    const isStatic = prerenderedDirUrl() !== null;
    const source = skip ? undefined : phpSource(story, story.args ?? context.args);

    useEffect(() => {
        if (source === undefined) {
            return undefined;
        }
        const emit = (code: string): void => {
            addons.getChannel().emit(SNIPPET_RENDERED, { id: context.id, args: context.unmappedArgs, source: code });
        };
        if (!isStatic) {
            emit(source);

            return undefined;
        }
        let current = true;
        void prerenderedSource(story, context).then((html) => {
            if (current) {
                // The PHP code when the story was not pre-rendered with these args
                emit(html ?? source);
            }
        });

        return () => {
            current = false;
        };
    });

    return story;
};
