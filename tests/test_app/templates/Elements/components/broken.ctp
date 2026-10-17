<?php
/**
 * Uses an undefined variable (to test errors)
 *
 * @var View $this
 */
?>
<p>Before the error</p>
<p><?php echo h($undefinedVariable); ?></p>
