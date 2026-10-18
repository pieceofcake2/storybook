<?php

App::uses('StorybookRenderer', 'Storybook.Lib');

/**
 * Args of a render request, passed to the args processors (see StorybookArgsProcessor)
 *
 * The args are the variables of the Element (or of the story template). They can be read and
 * changed as an array (`$args['user']`, `isset()`, `unset()`, `foreach`, `count()`), or with
 * `get()`, `set()`, `has()`, `remove()` and `merge()`. Processors can set any PHP value, e.g. an
 * object built from an array of the JSON args.
 *
 * It also tells which story is rendered: `story()` (the story ID), and `element()` or `template()`.
 *
 * @implements ArrayAccess<string, mixed>
 * @implements IteratorAggregate<string, mixed>
 */
class StorybookArgs implements ArrayAccess, IteratorAggregate, Countable
{
    /**
     * @var array<string, mixed>
     */
    protected array $args = [];

    /**
     * @var string
     */
    protected string $story;

    /**
     * @var string|null
     */
    protected ?string $element;

    /**
     * @var string|null
     */
    protected ?string $template;

    /**
     * @param array<string, mixed> $args Args
     * @param string $story Story ID (empty if unknown)
     * @param string|null $element Name of the Element, if an Element is rendered
     * @param string|null $template Name of the story template, if a story template is rendered
     */
    public function __construct(array $args = [], string $story = '', ?string $element = null, ?string $template = null)
    {
        $this->merge($args, true);
        $this->story = $story;
        $this->element = $element;
        $this->template = $template;
    }

    /**
     * Returns the ID of the story (e.g. `components-user-card--default`), or an empty string if it
     * is unknown
     *
     * @return string
     */
    public function story(): string
    {
        return $this->story;
    }

    /**
     * Returns the name of the rendered Element (e.g. `components/user_card`), or null if a story
     * template is rendered
     *
     * @return string|null
     */
    public function element(): ?string
    {
        return $this->element;
    }

    /**
     * Returns the name of the rendered story template (e.g. `user_list`), or null if an Element is
     * rendered
     *
     * @return string|null
     */
    public function template(): ?string
    {
        return $this->template;
    }

    /**
     * Returns the value of an arg, or the default if it is not set
     *
     * @param string $name Name of the arg
     * @param mixed $default Default value
     * @return mixed
     */
    public function get(string $name, $default = null)
    {
        return array_key_exists($name, $this->args) ? $this->args[$name] : $default;
    }

    /**
     * Sets an arg
     *
     * @param string $name Name of the arg, which must be a valid variable name (not `this`)
     * @param mixed $value Value (any PHP value)
     * @return void
     * @throws InvalidArgumentException When the name is invalid
     */
    public function set(string $name, $value): void
    {
        static::validateName($name);
        $this->args[$name] = $value;
    }

    /**
     * Returns whether an arg is set (including with null)
     *
     * @param string $name Name of the arg
     * @return bool
     */
    public function has(string $name): bool
    {
        return array_key_exists($name, $this->args);
    }

    /**
     * Removes an arg
     *
     * @param string $name Name of the arg
     * @return void
     */
    public function remove(string $name): void
    {
        unset($this->args[$name]);
    }

    /**
     * Adds args
     *
     * By default, the args that are already set are kept, so that it sets default values. With
     * `$override`, the given values replace them.
     *
     * @param array<string, mixed> $values Args
     * @param bool $override Whether to replace the args that are already set
     * @return void
     * @throws InvalidArgumentException When a name is invalid
     */
    public function merge(array $values, bool $override = false): void
    {
        foreach ($values as $name => $value) {
            static::validateName($name);
            if ($override || !array_key_exists($name, $this->args)) {
                $this->args[$name] = $value;
            }
        }
    }

    /**
     * Returns the args as an array, the variables of the Element or of the template
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return $this->args;
    }

    /**
     * @param mixed $offset Name of the arg
     * @return bool
     */
    public function offsetExists($offset): bool
    {
        return is_string($offset) && isset($this->args[$offset]);
    }

    /**
     * @param mixed $offset Name of the arg
     * @return mixed The value, or null if it is not set
     */
    public function offsetGet($offset): mixed
    {
        return is_string($offset) ? $this->get($offset) : null;
    }

    /**
     * @param mixed $offset Name of the arg
     * @param mixed $value Value
     * @return void
     * @throws InvalidArgumentException When the name is invalid
     */
    public function offsetSet($offset, $value): void
    {
        if (!is_string($offset)) {
            throw new InvalidArgumentException('The name of an arg must be a string.');
        }
        $this->set($offset, $value);
    }

    /**
     * @param mixed $offset Name of the arg
     * @return void
     */
    public function offsetUnset($offset): void
    {
        if (is_string($offset)) {
            $this->remove($offset);
        }
    }

    /**
     * @return ArrayIterator<string, mixed>
     */
    public function getIterator(): ArrayIterator
    {
        return new ArrayIterator($this->args);
    }

    /**
     * @return int
     */
    public function count(): int
    {
        return count($this->args);
    }

    /**
     * Validates the name of an arg, which becomes a variable of the template
     *
     * @param mixed $name Name
     * @return void
     * @throws InvalidArgumentException
     */
    protected static function validateName($name): void
    {
        if (!is_string($name) || !preg_match(StorybookRenderer::ARG_PATTERN, $name) || $name === 'this') {
            throw new InvalidArgumentException(sprintf('Invalid argument name "%s".', $name));
        }
    }
}
