<?php
/**
 * Counter: the button dispatches an `increment` event (bound to the `increment` action in Storybook)
 *
 * @var View $this
 * @var int|null $count Initial count
 */
$count = (int)($count ?? 0);
?>
<div class="counter" data-count="<?php echo $count; ?>">
    <button type="button" class="counter__button" data-storybook-callbacks="increment">+1</button>
    <output class="counter__value"><?php echo $count; ?></output>
</div>
<script>
    document.querySelectorAll('.counter').forEach((counter) => {
        const value = counter.querySelector('.counter__value');
        counter.querySelector('.counter__button').addEventListener('click', (event) => {
            value.textContent = String(Number(value.textContent) + 1);
            event.currentTarget.dispatchEvent(new CustomEvent('increment', { detail: Number(value.textContent) }));
        });
        counter.dataset.ready = 'true';
    });
</script>
