<?php
/**
 * Core configuration of the test application
 */

Configure::write('debug', (int)(getenv('APP_DEBUG') === false ? 2 : getenv('APP_DEBUG')));
Configure::write('Error', [
    'handler' => 'ErrorHandler::handleError',
    'level' => E_ALL & ~E_DEPRECATED,
    'trace' => true,
]);
Configure::write('Exception', [
    'handler' => 'ErrorHandler::handleException',
    'renderer' => 'ExceptionRenderer',
    'log' => true,
]);
Configure::write('App.encoding', 'UTF-8');
Configure::write('Session', ['defaults' => 'php']);
Configure::write('Security.salt', 'storybook-test-app-salt-not-for-production');
Configure::write('Security.cipherSeed', '76859309657453542496749683645');

foreach (['_cake_core_' => 'persistent', '_cake_model_' => 'models'] as $name => $dir) {
    Cache::config($name, [
        'engine' => 'File',
        'prefix' => 'storybook_test_' . $name,
        'path' => CACHE . $dir . DS,
        'duration' => '+10 seconds',
    ]);
}
unset($name, $dir);
