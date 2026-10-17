import type { DecoratorFunction, StoryContext } from 'storybook/internal/types';
import type { CakePHPRenderer, CakePHPStoryResult } from '../types.js';
/**
 * Returns the pre-rendered HTML of a story in a pre-rendered (static) Storybook, or null if the
 * Storybook renders the stories with the application, or if the story was not pre-rendered with
 * these args.
 */
export declare const prerenderedSource: (story: CakePHPStoryResult, context: StoryContext<CakePHPRenderer>) => Promise<string | null>;
/**
 * Shows the code of the story in the "Show code" of Docs: the PHP code that renders the story
 * (e.g. `$this->element('components/button', [...])`), or the pre-rendered HTML in a pre-rendered
 * (static) Storybook, whose args cannot be changed.
 */
export declare const sourceDecorator: DecoratorFunction<CakePHPRenderer>;
