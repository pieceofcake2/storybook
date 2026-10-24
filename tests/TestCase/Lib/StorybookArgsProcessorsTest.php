<?php

class StorybookArgsProcessorsTest extends CakeTestCase
{
    public function setUp(): void
    {
        parent::setUp();
        App::build([
            'Lib' => [dirname(__DIR__, 2) . DS . 'test_app' . DS . 'src' . DS . 'Lib' . DS],
        ], App::PREPEND);
        App::import('Lib', 'RecordingArgsProcessor');
        RecordingArgsProcessor::$instances = 0;
    }

    public function tearDown(): void
    {
        App::build();
        parent::tearDown();
    }

    /**
     * Runs the processors on the args of a story, and returns the classes of those that ran
     *
     * @param mixed $entries Entries
     * @return array<string>
     */
    private function process($entries, string $story = 'components-button--primary', ?string $element = 'components/button', ?string $template = null): array
    {
        $args = new StorybookArgs([], $story, $element, $template);
        (new StorybookArgsProcessors($entries))->process($args);

        return (array)$args['processors'];
    }

    public function testNoProcessors(): void
    {
        $this->assertSame([], $this->process([]));
        $this->assertSame([], $this->process(null));
    }

    public function testProcessorWithoutScopeAppliesToAllRequests(): void
    {
        $entries = ['RecordingArgsProcessor', ['class' => 'OtherRecordingArgsProcessor']];

        $this->assertSame(['RecordingArgsProcessor', 'OtherRecordingArgsProcessor'], $this->process($entries));
        $this->assertSame(['RecordingArgsProcessor', 'OtherRecordingArgsProcessor'], $this->process($entries, '', null, 'job_list'));
    }

    public function testProcessorsRunInTheOrderOfTheEntries(): void
    {
        $this->assertSame(
            ['OtherRecordingArgsProcessor', 'RecordingArgsProcessor'],
            $this->process(['OtherRecordingArgsProcessor', 'RecordingArgsProcessor']),
        );
    }

    /**
     * @return array<string, array{array<string, mixed>, string, string|null, string|null, bool}>
     */
    public static function scopeProvider(): array
    {
        return [
            'story' => [['stories' => ['components-button--primary']], 'components-button--primary', 'components/button', null, true],
            'story as a string' => [['stories' => 'components-button--primary'], 'components-button--primary', 'components/button', null, true],
            'other story' => [['stories' => ['components-button--primary']], 'components-button--secondary', 'components/button', null, false],
            'story prefix' => [['stories' => ['components-button']], 'components-button--primary', 'components/button', null, false],
            'unknown story' => [['stories' => ['']], '', 'components/button', null, false],
            'element' => [['elements' => ['components/button']], 'x--y', 'components/button', null, true],
            'other element' => [['elements' => ['components/button']], 'x--y', 'components/alert', null, false],
            'element directory' => [['elements' => ['components']], 'x--y', 'components/button', null, false],
            'element of a template' => [['elements' => ['job_list']], 'x--y', null, 'job_list', false],
            'template' => [['templates' => ['job_list']], 'x--y', null, 'job_list', true],
            'other template' => [['templates' => ['job_list']], 'x--y', null, 'alert_list', false],
            'template of an element' => [['templates' => ['components/button']], 'x--y', 'components/button', null, false],
            'any of the scopes' => [['stories' => ['a--b'], 'elements' => ['components/alert'], 'templates' => ['job_list']], 'x--y', null, 'job_list', true],
            'none of the scopes' => [['stories' => ['a--b'], 'elements' => ['components/alert'], 'templates' => ['job_list']], 'x--y', 'components/button', null, false],
            'empty scope' => [['elements' => []], 'x--y', 'components/button', null, false],
            'null scopes' => [['stories' => null, 'elements' => null, 'templates' => null], 'x--y', 'components/button', null, true],
        ];
    }

    /**
     * @dataProvider scopeProvider
     * @param array<string, mixed> $scope
     */
    public function testScope(array $scope, string $story, ?string $element, ?string $template, bool $applies): void
    {
        $processed = $this->process([['class' => 'RecordingArgsProcessor'] + $scope], $story, $element, $template);

        $this->assertSame($applies ? ['RecordingArgsProcessor'] : [], $processed);
    }

    public function testProcessorIsInstantiatedOnceAndOnlyWhenItApplies(): void
    {
        $processors = new StorybookArgsProcessors([
            ['class' => 'RecordingArgsProcessor', 'stories' => ['a--b']],
            ['class' => 'RecordingArgsProcessor', 'elements' => ['components/button']],
            ['class' => 'NotAnArgsProcessor', 'stories' => ['not--applied']],
        ]);

        $processors->process(new StorybookArgs([], 'a--b', 'components/button'));
        $processors->process(new StorybookArgs([], 'c--d', 'components/button'));

        $this->assertSame(1, RecordingArgsProcessor::$instances);
    }

    public function testProcessorOfAPlugin(): void
    {
        App::build(['Plugin' => [dirname(__DIR__, 2) . DS . 'test_app' . DS . 'plugins' . DS]], App::PREPEND);
        CakePlugin::load('TestStorybookPlugin');

        try {
            $this->assertSame(['PluginArgsProcessor'], $this->process(['TestStorybookPlugin.PluginArgsProcessor']));
        } finally {
            CakePlugin::unload('TestStorybookPlugin');
        }
    }

    public function testAutoloadedProcessor(): void
    {
        $autoload = function (string $class): void {
            if ($class === 'TestApp\\Storybook\\NamespacedArgsProcessor') {
                require dirname(__DIR__, 2) . DS . 'test_app' . DS . 'src' . DS . 'Storybook' . DS . 'NamespacedArgsProcessor.php';
            }
        };
        spl_autoload_register($autoload);

        try {
            $this->assertSame(
                ['TestApp\\Storybook\\NamespacedArgsProcessor'],
                $this->process(['TestApp\\Storybook\\NamespacedArgsProcessor']),
            );
        } finally {
            spl_autoload_unregister($autoload);
        }
    }

    /**
     * @return array<string, array{mixed, string}>
     */
    public static function invalidConfigurationProvider(): array
    {
        return [
            'not an array' => ['RecordingArgsProcessor', '"Storybook.argsProcessors" must be an array.'],
            'not a class name' => [[1], '"Storybook.argsProcessors.0" must be a class name or an array with a "class" key.'],
            'empty class name' => [[''], '"Storybook.argsProcessors.0" must be a class name or an array with a "class" key.'],
            'without class' => [[['stories' => ['a--b']]], '"Storybook.argsProcessors.0" must be a class name or an array with a "class" key.'],
            'unknown key' => [['RecordingArgsProcessor', ['class' => 'RecordingArgsProcessor', 'story' => 'a--b']], 'Unknown key "story" in "Storybook.argsProcessors.1" (expected class, stories, elements, templates).'],
            'invalid scope' => [[['class' => 'RecordingArgsProcessor', 'elements' => [['components/button']]]], '"Storybook.argsProcessors.0.elements" must be a string or an array of strings.'],
            'scope that is not an array' => [[['class' => 'RecordingArgsProcessor', 'stories' => 1]], '"Storybook.argsProcessors.0.stories" must be a string or an array of strings.'],
        ];
    }

    /**
     * @dataProvider invalidConfigurationProvider
     * @param mixed $entries
     */
    public function testInvalidConfigurationThrows($entries, string $message): void
    {
        $this->expectException(CakeException::class);
        $this->expectExceptionMessage($message);

        new StorybookArgsProcessors($entries);
    }

    public function testMissingClassThrows(): void
    {
        $this->expectException(CakeException::class);
        $this->expectExceptionMessage('Args processor class "MissingArgsProcessor" was not found.');

        $this->process(['MissingArgsProcessor']);
    }

    public function testClassThatIsNotAProcessorThrows(): void
    {
        $this->expectException(CakeException::class);
        $this->expectExceptionMessage('Args processor class "NotAnArgsProcessor" must implement StorybookArgsProcessor.');

        $this->process(['NotAnArgsProcessor']);
    }
}
