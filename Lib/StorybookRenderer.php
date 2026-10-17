<?php

App::uses('View', 'View');

/**
 * Renders an Element (or a story template) for Storybook.
 *
 * The client only sends the name of an Element under an allowed directory (or of a story
 * template) and its arguments. Templates and code are never received from the client, since PHP
 * templates cannot be sandboxed.
 */
class StorybookRenderer
{
    /**
     * Pattern of the names of Elements and story templates (e.g. `components/page_header`)
     */
    public const NAME_PATTERN = '/\A[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\z/';

    /**
     * Pattern of the names of arguments, which become variables of the template
     */
    public const ARG_PATTERN = '/\A[a-zA-Z_][a-zA-Z0-9_]*\z/';

    /**
     * Default settings, overridden by the `Storybook` key of Configure
     *
     * - `enabled`: Whether the render endpoint is enabled. Disabled by default
     * - `elements`: Element directories that can be rendered (e.g. `components` for `Elements/components/`)
     * - `templates`: Directory of the story templates under the view path (`templates/Stories/`), or false to disable them
     * - `viewClass`, `helpers`, `ext`, `theme`: View settings. Defaults to those of `AppController`
     * - `errorsAsExceptions`: Whether PHP warnings and notices in templates make the rendering fail
     *
     * @var array<string, mixed>
     */
    public const DEFAULTS = [
        'enabled' => false,
        'elements' => ['components'],
        'templates' => 'Stories',
        'viewClass' => null,
        'helpers' => null,
        'ext' => null,
        'theme' => null,
        'errorsAsExceptions' => true,
    ];

    /**
     * Returns the settings, with the defaults applied
     *
     * @return array<string, mixed>
     */
    public static function settings(): array
    {
        $settings = Configure::read('Storybook');

        return array_merge(static::DEFAULTS, is_array($settings) ? $settings : []);
    }

    /**
     * Returns whether the render endpoint is enabled
     *
     * @return bool
     */
    public static function enabled(): bool
    {
        return filter_var(static::settings()['enabled'], FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Returns the view settings (`viewClass`, `helpers`, `ext`, `theme`) of the application,
     * taken from the defaults of `AppController` unless they are configured
     *
     * Only the properties are read: `AppController` is not instantiated, so its components
     * (Security, Session, ...) and callbacks are not used.
     *
     * @return array{viewClass: string, helpers: array<mixed>, ext: string, theme: string|null}
     */
    public static function viewSettings(): array
    {
        $settings = static::settings();
        App::uses('AppController', 'Controller');
        $app = class_exists('AppController') ? get_class_vars('AppController') : [];

        return [
            'viewClass' => (string)($settings['viewClass'] ?? $app['viewClass'] ?? 'View'),
            'helpers' => (array)($settings['helpers'] ?? $app['helpers'] ?? ['Html']),
            'ext' => (string)($settings['ext'] ?? $app['ext'] ?? '.ctp'),
            'theme' => $settings['theme'] ?? $app['theme'] ?? null,
        ];
    }

    /**
     * @var View
     */
    protected View $View;

    /**
     * @var array<string, mixed>
     */
    protected array $settings;

    /**
     * @param View $View View to render with (the View class of the application)
     * @param array<string, mixed>|null $settings Settings (defaults to the configured ones)
     */
    public function __construct(View $View, ?array $settings = null)
    {
        $this->View = $View;
        $this->settings = $settings === null ? static::settings() : array_merge(static::DEFAULTS, $settings);
    }

    /**
     * Validates the payload of a render request and renders it
     *
     * The payload is `{"element": "components/name", "args": {...}}`, or
     * `{"template": "name", "args": {...}}` for a story template.
     *
     * @param mixed $payload Decoded JSON body
     * @return string Rendered HTML
     * @throws BadRequestException When the payload is invalid
     * @throws NotFoundException When the Element or the template does not exist or is not allowed
     */
    public function render($payload): string
    {
        if (!is_array($payload) || static::isList($payload)) {
            throw new BadRequestException('The request body must be a JSON object.');
        }
        $unknown = array_diff(array_keys($payload), ['element', 'template', 'args']);
        if ($unknown !== []) {
            throw new BadRequestException(sprintf('Unknown key "%s" in the request body.', implode('", "', $unknown)));
        }
        $args = $this->args(array_key_exists('args', $payload) ? $payload['args'] : []);

        if (isset($payload['element']) === isset($payload['template'])) {
            throw new BadRequestException('Either "element" or "template" is required in the request body.');
        }
        if (isset($payload['element'])) {
            return $this->renderElement($this->name($payload['element'], 'element'), $args);
        }

        return $this->renderTemplate($this->name($payload['template'], 'template'), $args);
    }

    /**
     * Renders an Element under one of the allowed directories
     *
     * @param string $name Element name (e.g. `components/page_header`)
     * @param array<string, mixed> $args Variables of the Element
     * @return string
     * @throws NotFoundException
     */
    public function renderElement(string $name, array $args = []): string
    {
        $this->name($name, 'element');
        if (!$this->isAllowedElement($name)) {
            throw new NotFoundException(sprintf('Element "%s" is not in the allowed directories (%s).', $name, implode(', ', $this->allowedDirectories())));
        }
        if (!$this->View->elementExists($name)) {
            throw new NotFoundException(sprintf('Element "%s" was not found.', $name));
        }

        return $this->capture(fn() => $this->View->element($name, $this->args($args), ['ignoreMissing' => false]));
    }

    /**
     * Renders a story template (e.g. `templates/Stories/job_list.php`), which can combine Elements
     *
     * @param string $name Template name under the templates directory
     * @param array<string, mixed> $args Variables of the template
     * @return string
     * @throws NotFoundException
     */
    public function renderTemplate(string $name, array $args = []): string
    {
        $this->name($name, 'template');
        $directory = $this->settings['templates'];
        if (!is_string($directory) || $directory === '') {
            throw new NotFoundException('Story templates are disabled.');
        }

        $View = $this->View;
        $View->viewVars = [];
        $View->set($this->args($args));
        $View->autoLayout = false;

        try {
            return $this->capture(fn() => (string)$View->render('/' . trim($directory, '/') . '/' . $name, false));
        } catch (MissingViewException $e) {
            throw new NotFoundException(sprintf('Story template "%s" was not found.', $name));
        }
    }

    /**
     * Returns whether the Element is under one of the allowed directories
     *
     * @param string $name Element name
     * @return bool
     */
    public function isAllowedElement(string $name): bool
    {
        if (!preg_match(static::NAME_PATTERN, $name)) {
            return false;
        }
        foreach ($this->allowedDirectories() as $directory) {
            if (str_starts_with($name, $directory . '/')) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string>
     */
    protected function allowedDirectories(): array
    {
        $directories = [];
        foreach ((array)$this->settings['elements'] as $directory) {
            $directory = trim((string)$directory, '/');
            if (preg_match(static::NAME_PATTERN, $directory)) {
                $directories[] = $directory;
            }
        }

        return $directories;
    }

    /**
     * Validates the name of an Element or a template
     *
     * @param mixed $name Name
     * @param string $key Key of the payload, for the error message
     * @return string
     * @throws BadRequestException
     */
    protected function name($name, string $key): string
    {
        if (!is_string($name) || !preg_match(static::NAME_PATTERN, $name)) {
            throw new BadRequestException(sprintf('Invalid %s name: "%s" must match %s.', $key, is_string($name) ? $name : gettype($name), static::NAME_PATTERN));
        }

        return $name;
    }

    /**
     * Validates the arguments, which must be an object whose keys are valid variable names
     *
     * @param mixed $args Arguments
     * @return array<string, mixed>
     * @throws BadRequestException
     */
    protected function args($args): array
    {
        if (!is_array($args) || static::isList($args)) {
            throw new BadRequestException('"args" must be a JSON object.');
        }
        foreach (array_keys($args) as $key) {
            if (!is_string($key) || !preg_match(static::ARG_PATTERN, $key) || $key === 'this') {
                throw new BadRequestException(sprintf('Invalid argument name "%s".', $key));
            }
        }

        return $args;
    }

    /**
     * Returns whether the array is a non-empty list (a JSON array), like array_is_list() of PHP 8.1
     *
     * @param array<mixed> $array Array
     * @return bool
     */
    protected static function isList(array $array): bool
    {
        return $array !== [] && array_keys($array) === range(0, count($array) - 1);
    }

    /**
     * Runs the rendering, making PHP warnings and notices fail it (unless disabled) and cleaning
     * the output buffers left open by an error
     *
     * @param callable(): string $render Rendering
     * @return string
     * @throws Throwable
     */
    protected function capture(callable $render): string
    {
        $level = ob_get_level();
        if ($this->settings['errorsAsExceptions']) {
            set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
                if (!(error_reporting() & $severity)) {
                    return false;
                }
                throw new ErrorException($message, 0, $severity, $file, $line);
            }, E_WARNING | E_NOTICE | E_USER_WARNING | E_USER_NOTICE);
        }
        try {
            return $render();
        } finally {
            if ($this->settings['errorsAsExceptions']) {
                restore_error_handler();
            }
            while (ob_get_level() > $level) {
                ob_end_clean();
            }
        }
    }
}
