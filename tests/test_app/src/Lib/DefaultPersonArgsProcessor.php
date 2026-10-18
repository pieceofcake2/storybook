<?php

App::uses('StorybookArgsProcessor', 'Storybook.Lib');

/**
 * Args processor of the test application, for some stories only: sets a default person (as an
 * array, which PersonArgsProcessor, registered after it, turns into a Person)
 */
class DefaultPersonArgsProcessor implements StorybookArgsProcessor
{
    /**
     * @param StorybookArgs $args Args
     * @return void
     */
    public function __invoke(StorybookArgs $args): void
    {
        $args->merge([
            'person' => ['name' => 'Jane Doe', 'role' => 'Front Office', 'joined' => '2024-04-01'],
        ]);
    }
}
