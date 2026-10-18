<?php
/**
 * Bootstrap of the test application
 */

Cache::config('default', ['engine' => 'File']);

Configure::write('Storybook', [
    'viewClass' => 'TestApp',
    'helpers' => ['Html'],
    // src/Lib/: build Person objects from the JSON args, after setting a default person for a story
    'argsProcessors' => [
        ['class' => 'DefaultPersonArgsProcessor', 'stories' => ['components-person-card--default-person']],
        ['class' => 'PersonArgsProcessor', 'elements' => ['components/person_card'], 'templates' => ['person_list']],
    ],
]);

CakePlugin::load('Storybook', [
    'path' => dirname(__DIR__, 3) . DS,
    'routes' => true,
]);

Configure::write('Dispatcher.filters', [
    'AssetDispatcher',
]);

CakeLog::config('error', [
    'engine' => 'File',
    'types' => ['warning', 'error', 'critical', 'alert', 'emergency'],
    'file' => 'error',
]);
