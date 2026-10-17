<?php
/**
 * Logo image (served by the application: proxied with proxyPaths in `storybook dev`)
 *
 * @var View $this
 * @var string|null $alt Alternative text
 */
echo $this->Html->image('logo.svg', ['alt' => $alt ?? 'Logo', 'class' => 'logo']);
