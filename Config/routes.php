<?php
/**
 * Routes of Storybook, connected only when `Storybook.enabled` is true
 *
 * Load the plugin with its routes: `CakePlugin::load('Storybook', ['routes' => true]);`
 */

App::uses('StorybookRenderer', 'Storybook.Lib');

if (StorybookRenderer::enabled()) {
    Router::connect(
        '/_storybook/render/:story',
        ['plugin' => 'storybook', 'controller' => 'storybook', 'action' => 'story'],
        ['pass' => ['story'], 'story' => '[A-Za-z0-9_-]+'],
    );
}
