<?php

namespace TestApp\Storybook;

use StorybookArgs;
use StorybookArgsProcessor;

/**
 * Namespaced args processor, loaded by an autoloader (e.g. of Composer), for the PHPUnit tests
 */
class NamespacedArgsProcessor implements StorybookArgsProcessor
{
    /**
     * @param StorybookArgs $args Args
     * @return void
     */
    public function __invoke(StorybookArgs $args): void
    {
        $args['processors'] = [static::class];
    }
}
