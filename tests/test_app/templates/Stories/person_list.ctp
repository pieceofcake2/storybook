<?php
/**
 * Story template that receives Person objects (built by PersonArgsProcessor in Storybook)
 *
 * @var View $this
 * @var array<Person> $people People
 */
?>
<div class="person-list">
<?php foreach ($people as $person) { ?>
    <?php echo $this->element('components/person_card', ['person' => $person]); ?>
<?php } ?>
</div>
