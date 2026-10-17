import type { DecoratorFunction } from 'storybook/internal/types';
import type { CakePHPRenderer } from '../types.js';
/**
 * Shows the PHP code that renders the story (e.g. `$this->element('components/button', [...])`)
 * in the "Show code" of Docs.
 */
export declare const sourceDecorator: DecoratorFunction<CakePHPRenderer>;
