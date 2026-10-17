<?php
/**
 * Bootstrap of the test application
 */

Cache::config('default', ['engine' => 'File']);

// Enabled only when STORYBOOK_ENABLED is true (e.g. in the development environment)
Configure::write('Storybook', [
    'enabled' => filter_var(getenv('STORYBOOK_ENABLED'), FILTER_VALIDATE_BOOLEAN),
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
