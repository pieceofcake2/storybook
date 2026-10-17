import type { AnnotatedStoryFn, Args, ArgsStoryFn, ComponentAnnotations, DecoratorFunction, LoaderFunction, ProjectAnnotations, StoryAnnotations, StoryContext as GenericStoryContext, StrictArgs } from 'storybook/internal/types';
import type { CakePHPComponent, CakePHPRenderer } from './types.js';
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
 * Args of the meta of a story: the args of the meta, and any other args (e.g. those of `argTypes`),
 * since the variables of an Element are not typed
 */
type MetaArgs<TMeta> = (TMeta extends {
    args?: infer TArgs;
} ? (TArgs extends Args ? TArgs : unknown) : unknown) & Args;
/**
 * Story object (CSF 3), typed by the meta (`StoryObj<typeof meta>`) or by the args
 * (`StoryObj<{ label: string }>`).
 *
 * A type with a `component` (or a `render` function) is the type of a meta: the args of the story
 * are those of the meta, and any other args.
 *
 * @see https://storybook.js.org/docs/api/csf#named-story-exports
 */
export type StoryObj<TMetaOrArgs = Args> = [TMetaOrArgs] extends [
    {
        component: CakePHPComponent;
    } | {
        render: ArgsStoryFn<CakePHPRenderer, any>;
    }
] ? StoryAnnotations<CakePHPRenderer, MetaArgs<TMetaOrArgs>> : StoryAnnotations<CakePHPRenderer, TMetaOrArgs>;
export type Decorator<TArgs = StrictArgs> = DecoratorFunction<CakePHPRenderer, TArgs>;
export type Loader<TArgs = StrictArgs> = LoaderFunction<CakePHPRenderer, TArgs>;
export type StoryContext<TArgs = StrictArgs> = GenericStoryContext<CakePHPRenderer, TArgs>;
export type Preview = ProjectAnnotations<CakePHPRenderer>;
