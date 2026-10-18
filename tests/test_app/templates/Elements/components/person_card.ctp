<?php
/**
 * Card of a person, which receives a Person object (built by PersonArgsProcessor in Storybook)
 *
 * @var View $this
 * @var Person $person Person
 */
if (!$person instanceof Person) {
    throw new InvalidArgumentException(sprintf('$person must be a Person, %s given.', get_debug_type($person)));
}
?>
<article class="person-card">
    <h2 class="person-card__name"><?php echo h($person->name); ?></h2>
    <p class="person-card__role"><?php echo h($person->role); ?></p>
    <p class="person-card__joined">Since <?php echo h($person->joined->format('F Y')); ?></p>
</article>
