<?php
/**
 * Form field in a subdirectory of the components
 *
 * @var View $this
 * @var string $label Label
 * @var string|null $value Value
 */
?>
<label class="field"><?php echo h($label); ?> <input type="text" value="<?php echo h($value ?? ''); ?>"></label>
