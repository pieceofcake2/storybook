<?php
/**
 * Alert message
 *
 * @var View $this
 * @var string $message Message
 * @var string|null $type `info`, `success` or `danger`
 */
$type ??= 'info';
?>
<div class="alert alert--<?php echo h($type); ?>" role="alert"><?php echo h($message); ?></div>
