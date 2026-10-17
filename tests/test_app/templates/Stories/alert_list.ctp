<?php
/**
 * Story template that combines Elements
 *
 * @var View $this
 * @var array<array{message: string, type?: string}> $alerts Alerts
 */
?>
<div class="alert-list">
<?php foreach ($alerts as $alert) { ?>
    <?php echo $this->element('components/alert', $alert); ?>
<?php } ?>
</div>
