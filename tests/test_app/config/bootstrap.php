<?php
/**
 * Bootstrap of the test application
 */

Cache::config('default', ['engine' => 'File']);

Configure::write('Storybook', [
    'viewClass' => 'TestApp',
    'helpers' => ['Html'],
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
