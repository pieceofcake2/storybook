<?php
/**
 * Routes of Storybook
 *
 * Load the plugin with its routes: `CakePlugin::load('Storybook', ['routes' => true]);`. The render
 * route is connected only in debug mode (`debug` >= 1): Storybook renders the stories with the
 * application in development only, and a published Storybook is pre-rendered (static). The plugin
 * is a dev dependency: it is not installed in production (`composer install --no-dev`).
 */

if ((int)Configure::read('debug') > 0) {
    Router::connect(
        '/_storybook/render/:story',
        ['plugin' => 'storybook', 'controller' => 'storybook', 'action' => 'story'],
        ['pass' => ['story'], 'story' => '[A-Za-z0-9_-]+'],
    );
}
