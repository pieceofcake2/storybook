<?php

App::uses('StorybookArgsProcessor', 'Storybook.Lib');

/**
 * Args processor for the PHPUnit tests: fails with the exception of the `throw` arg, or with a PHP
 * warning
 */
class BrokenArgsProcessor implements StorybookArgsProcessor
{
    /**
     * @param StorybookArgs $args Args
     * @return void
     * @throws Exception
     */
    public function __invoke(StorybookArgs $args): void
    {
        if ($args['throw'] === 'not-found') {
            throw new NotFoundException('The job was not found.');
        }
        if ($args['throw'] === 'warning') {
            $values = [];
            $args['value'] = $values['missing'];

            return;
        }
        throw new RuntimeException('The args processor failed.');
    }
}
