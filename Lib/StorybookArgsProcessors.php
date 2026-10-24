<?php

/**
 * Args processors registered in `Storybook.argsProcessors`
 *
 * Each entry is the name of a class implementing StorybookArgsProcessor, or an array with the
 * class and the scope of the processor:
 *
 * ```php
 * Configure::write('Storybook.argsProcessors', [
 *     // All the stories
 *     'UserArgsProcessor',
 *     // Only some stories, Elements or story templates
 *     [
 *         'class' => 'JobArgsProcessor',
 *         'stories' => ['components-job-card--default'], // Story IDs
 *         'elements' => ['components/job_card'],         // Names of Elements
 *         'templates' => ['job_list'],                   // Names of story templates
 *     ],
 * ]);
 * ```
 *
 * - An entry without `stories`, `elements` and `templates` applies to all the render requests. With
 *   some of them, it applies to the requests that match any of them (exact story IDs and names).
 * - The processors run in the order of the entries.
 * - The classes are found with `App::className($class, 'Lib')`, and instantiated without
 *   arguments, once for all the entries of the same class.
 */
class StorybookArgsProcessors
{
    /**
     * Keys of an entry
     */
    public const KEYS = ['class', 'stories', 'elements', 'templates'];

    /**
     * Keys of an entry that select the render requests
     */
    public const SCOPES = ['stories', 'elements', 'templates'];

    /**
     * @var array<array{class: string, stories: array<string>|null, elements: array<string>|null, templates: array<string>|null}>
     */
    protected array $entries = [];

    /**
     * @var array<string, StorybookArgsProcessor>
     */
    protected array $instances = [];

    /**
     * @param mixed $entries Entries (the value of `Storybook.argsProcessors`)
     * @throws CakeException When the configuration is invalid
     */
    public function __construct($entries = [])
    {
        if ($entries === null) {
            $entries = [];
        }
        if (!is_array($entries)) {
            throw new CakeException('"Storybook.argsProcessors" must be an array.');
        }
        foreach (array_values($entries) as $index => $entry) {
            $this->entries[] = $this->entry($entry, $index);
        }
    }

    /**
     * Runs the processors that apply to the args, in the order of the entries
     *
     * @param StorybookArgs $args Args, changed in place
     * @return void
     * @throws CakeException When a class is not found or does not implement StorybookArgsProcessor
     */
    public function process(StorybookArgs $args): void
    {
        foreach ($this->entries as $entry) {
            if ($this->applies($entry, $args)) {
                $processor = $this->instance($entry['class']);
                $processor($args);
            }
        }
    }

    /**
     * Returns whether an entry applies to the args
     *
     * @param array{class: string, stories: array<string>|null, elements: array<string>|null, templates: array<string>|null} $entry Entry
     * @param StorybookArgs $args Args
     * @return bool
     */
    protected function applies(array $entry, StorybookArgs $args): bool
    {
        if ($entry['stories'] === null && $entry['elements'] === null && $entry['templates'] === null) {
            return true;
        }
        $values = [
            'stories' => $args->story(),
            'elements' => $args->element(),
            'templates' => $args->template(),
        ];
        foreach ($values as $scope => $value) {
            if ($entry[$scope] !== null && $value !== null && $value !== '' && in_array($value, $entry[$scope], true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validates an entry of the configuration
     *
     * @param mixed $entry Entry
     * @param int $index Index of the entry, for the error messages
     * @return array{class: string, stories: array<string>|null, elements: array<string>|null, templates: array<string>|null}
     * @throws CakeException
     */
    protected function entry($entry, int $index): array
    {
        if (is_string($entry)) {
            $entry = ['class' => $entry];
        }
        if (!is_array($entry) || !isset($entry['class']) || !is_string($entry['class']) || $entry['class'] === '') {
            throw new CakeException(sprintf('"Storybook.argsProcessors.%d" must be a class name or an array with a "class" key.', $index));
        }
        $unknown = array_diff(array_keys($entry), static::KEYS);
        if ($unknown !== []) {
            throw new CakeException(sprintf('Unknown key "%s" in "Storybook.argsProcessors.%d" (expected %s).', implode('", "', $unknown), $index, implode(', ', static::KEYS)));
        }

        $result = ['class' => $entry['class'], 'stories' => null, 'elements' => null, 'templates' => null];
        foreach (static::SCOPES as $scope) {
            if (!array_key_exists($scope, $entry) || $entry[$scope] === null) {
                continue;
            }
            $values = is_string($entry[$scope]) ? [$entry[$scope]] : $entry[$scope];
            if (!is_array($values) || array_filter($values, fn($value) => !is_string($value)) !== []) {
                throw new CakeException(sprintf('"Storybook.argsProcessors.%d.%s" must be a string or an array of strings.', $index, $scope));
            }
            $result[$scope] = array_values($values);
        }

        return $result;
    }

    /**
     * Returns the instance of a processor class, created once
     *
     * @param string $class Class name, or `Plugin.Class`
     * @return StorybookArgsProcessor
     * @throws CakeException
     */
    protected function instance(string $class): StorybookArgsProcessor
    {
        if (isset($this->instances[$class])) {
            return $this->instances[$class];
        }

        $name = App::className($class, 'Lib');
        if ($name === null) {
            throw new CakeException(sprintf('Args processor class "%s" was not found.', $class));
        }
        if (!is_subclass_of($name, 'StorybookArgsProcessor')) {
            throw new CakeException(sprintf('Args processor class "%s" must implement StorybookArgsProcessor.', $class));
        }

        return $this->instances[$class] = new $name();
    }
}
