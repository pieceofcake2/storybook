import type {
    AnnotatedStoryFn,
    Args,
    ComponentAnnotations,
    DecoratorFunction,
    LoaderFunction,
    ProjectAnnotations,
    StoryAnnotations,
    StoryContext as GenericStoryContext,
    StrictArgs,
} from 'storybook/internal/types';

import type { CakePHPRenderer } from './types.js';

export type { Args, ArgTypes, Parameters, StrictArgs } from 'storybook/internal/types';

/**
 * Metadata to configure the stories of an Element.
 *
 * @see https://storybook.js.org/docs/api/csf#default-export
 */
export type Meta<TArgs = Args> = ComponentAnnotations<CakePHPRenderer, TArgs>;

/**
 * Story function (CSF 2).
 */
export type StoryFn<TArgs = Args> = AnnotatedStoryFn<CakePHPRenderer, TArgs>;

/**
 * Story object (CSF 3).
 *
 * @see https://storybook.js.org/docs/api/csf#named-story-exports
 */
export type StoryObj<TArgs = Args> = StoryAnnotations<CakePHPRenderer, TArgs>;

export type Decorator<TArgs = StrictArgs> = DecoratorFunction<CakePHPRenderer, TArgs>;
export type Loader<TArgs = StrictArgs> = LoaderFunction<CakePHPRenderer, TArgs>;
export type StoryContext<TArgs = StrictArgs> = GenericStoryContext<CakePHPRenderer, TArgs>;
export type Preview = ProjectAnnotations<CakePHPRenderer>;
