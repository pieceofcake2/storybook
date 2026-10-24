<?php

/**
 * Args processor: changes the args of a render request before the Element (or the story
 * template) is rendered, e.g. to build objects (entities, value objects, dates) from the arrays of
 * the JSON args
 *
 * Processors are registered in `Storybook.argsProcessors` (see StorybookArgsProcessors), and run on
 * the server: the client only sends JSON args, never the name of a processor.
 *
 * ```php
 * class UserArgsProcessor implements StorybookArgsProcessor
 * {
 *     public function __invoke(StorybookArgs $args): void
 *     {
 *         if (is_array($args['user'])) {
 *             $args['user'] = User::fromArray($args['user']);
 *         }
 *     }
 * }
 * ```
 */
interface StorybookArgsProcessor
{
    /**
     * Changes the args in place
     *
     * @param StorybookArgs $args Args of the render request
     * @return void
     */
    public function __invoke(StorybookArgs $args): void;
}
