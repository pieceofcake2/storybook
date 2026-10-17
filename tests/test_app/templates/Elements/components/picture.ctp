<?php
/**
 * Picture of an image imported by the story (an asset built by Vite with Storybook)
 *
 * @var View $this
 * @var string $src URL of the image
 * @var string $caption Caption
 */
?>
<figure class="picture">
    <img src="<?= h($src) ?>" alt="<?= h($caption) ?>" width="120" height="80">
    <figcaption><?= h($caption) ?></figcaption>
</figure>
