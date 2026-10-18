<?php

App::uses('Person', 'Lib');
App::uses('StorybookArgsProcessor', 'Storybook.Lib');

/**
 * Args processor of the test application: builds Person objects from the `person` and `people`
 * args
 */
class PersonArgsProcessor implements StorybookArgsProcessor
{
    /**
     * @param StorybookArgs $args Args
     * @return void
     */
    public function __invoke(StorybookArgs $args): void
    {
        if (is_array($args['person'])) {
            $args['person'] = Person::fromArray($args['person']);
        }
        if (is_array($args['people'])) {
            $args['people'] = array_map(fn($row) => $row instanceof Person ? $row : Person::fromArray((array)$row), $args['people']);
        }
    }
}
