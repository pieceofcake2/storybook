<?php
/**
 * Routes of Storybook
 *
 * Load the plugin with its routes: `CakePlugin::load('Storybook', ['routes' => true]);`. The plugin
 * is a dev dependency: it is not installed in production (`composer install --no-dev`), so the
 * route does not exist there.
 */

Router::connect(
    '/_storybook/render/:story',
    ['plugin' => 'storybook', 'controller' => 'storybook', 'action' => 'story'],
    ['pass' => ['story'], 'story' => '[A-Za-z0-9_-]+'],
);
