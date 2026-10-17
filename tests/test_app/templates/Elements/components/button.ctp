<?php
/**
 * Button link
 *
 * @var View $this
 * @var string $label Label
 * @var string $url URL
 * @var string|null $variant `primary` or `secondary`
 */
$variant ??= 'primary';
echo $this->Html->link($label, $url, ['class' => 'button button--' . $variant]);
