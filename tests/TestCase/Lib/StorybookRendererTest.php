<?php

class StorybookRendererTest extends CakeTestCase
{
    private View $View;

    public function setUp(): void
    {
        parent::setUp();
        $testApp = dirname(__DIR__, 2) . DS . 'test_app' . DS;
        App::build([
            'View' => [$testApp . 'src' . DS . 'View' . DS, $testApp . 'templates' . DS],
            'Lib' => [$testApp . 'src' . DS . 'Lib' . DS],
        ], App::PREPEND);
        App::import('Lib', 'RecordingArgsProcessor');
        RecordingArgsProcessor::$instances = 0;

        $request = new CakeRequest('/', false);
        $request->webroot = '/';
        $Controller = new Controller($request);
        $Controller->helpers = ['Html'];
        $this->View = new View($Controller);
    }

    public function tearDown(): void
    {
        Configure::delete('Storybook');
        App::build();
        parent::tearDown();
    }

    /**
     * @param array<string, mixed>|null $settings
     */
    private function renderer(?array $settings = null): StorybookRenderer
    {
        return new StorybookRenderer($this->View, $settings);
    }

    public function testViewSettingsDefaultToAppController(): void
    {
        $expected = get_class_vars('AppController');

        $this->assertSame([
            'viewClass' => $expected['viewClass'],
            'helpers' => $expected['helpers'],
            'ext' => $expected['ext'],
            'theme' => $expected['theme'] ?? null,
        ], StorybookRenderer::viewSettings());
    }

    public function testViewSettingsCanBeConfigured(): void
    {
        Configure::write('Storybook', [
            'viewClass' => 'TestApp',
            'helpers' => ['Html', 'Form'],
            'ext' => '.php',
            'theme' => 'Dark',
        ]);

        $this->assertSame([
            'viewClass' => 'TestApp',
            'helpers' => ['Html', 'Form'],
            'ext' => '.php',
            'theme' => 'Dark',
        ], StorybookRenderer::viewSettings());
    }

    public function testRenderElementWithArgsAsVariables(): void
    {
        $html = $this->renderer()->render([
            'element' => 'components/button',
            'args' => ['label' => 'Apply <now>', 'url' => '/jobs/1', 'variant' => 'secondary'],
        ]);

        $this->assertSame('<a href="/jobs/1" class="button button--secondary">Apply &lt;now&gt;</a>', $html);
    }

    public function testRenderElementWithoutArgs(): void
    {
        $html = $this->renderer()->render(['element' => 'components/counter']);

        $this->assertStringContainsString('<output class="counter__value">0</output>', $html);
    }

    public function testRenderElementInSubdirectory(): void
    {
        $html = $this->renderer()->render(['element' => 'components/forms/field', 'args' => ['label' => 'Name']]);

        $this->assertStringContainsString('<label class="field">Name <input type="text" value=""></label>', $html);
    }

    public function testRenderElementWithAllowedDirectoryConfigured(): void
    {
        $renderer = $this->renderer(['elements' => ['components/forms']]);

        $this->assertStringContainsString('class="field"', $renderer->render(['element' => 'components/forms/field', 'args' => ['label' => 'Name']]));

        $this->expectException(NotFoundException::class);
        $renderer->render(['element' => 'components/button', 'args' => ['label' => 'A', 'url' => '/']]);
    }

    public function testRenderElementOutsideAllowedDirectoriesIsNotFound(): void
    {
        $this->expectException(NotFoundException::class);
        $this->expectExceptionMessage('Element "secret" is not in the allowed directories (components).');

        $this->renderer()->render(['element' => 'secret']);
    }

    public function testRenderElementOfDirectoryWithSamePrefixIsNotFound(): void
    {
        $this->expectException(NotFoundException::class);

        $this->renderer(['elements' => ['comp']])->render(['element' => 'components/button']);
    }

    public function testRenderMissingElementIsNotFound(): void
    {
        $this->expectException(NotFoundException::class);
        $this->expectExceptionMessage('Element "components/missing" was not found.');

        $this->renderer()->render(['element' => 'components/missing']);
    }

    /**
     * @return array<string, array{0: mixed}>
     */
    public static function invalidNameProvider(): array
    {
        return [
            'parent directory' => ['../secret'],
            'parent directory in the middle' => ['components/../secret'],
            'parent directory of the layouts' => ['components/../../Layouts/default'],
            'absolute path' => ['/components/button'],
            'trailing slash' => ['components/'],
            'double slash' => ['components//button'],
            'backslash' => ['components\\button'],
            'extension' => ['components/button.ctp'],
            'plugin syntax' => ['Storybook.components/button'],
            'uppercase' => ['Components/Button'],
            'null byte' => ["components/button\0"],
            'newline' => ["components/button\n"],
            'empty' => [''],
            'array' => [['components/button']],
            'number' => [1],
        ];
    }

    /**
     * @dataProvider invalidNameProvider
     * @param mixed $name
     */
    public function testRenderElementWithInvalidNameIsBadRequest($name): void
    {
        $this->expectException(BadRequestException::class);

        $this->renderer()->render(['element' => $name]);
    }

    /**
     * @dataProvider invalidNameProvider
     * @param mixed $name
     */
    public function testRenderTemplateWithInvalidNameIsBadRequest($name): void
    {
        $this->expectException(BadRequestException::class);

        $this->renderer()->render(['template' => $name]);
    }

    /**
     * @return array<string, array{0: mixed}>
     */
    public static function invalidArgsProvider(): array
    {
        return [
            'string' => ['label'],
            'number' => [1],
            'null' => [null],
            'list' => [['a', 'b']],
            'key starting with a digit' => [['1label' => 'A']],
            'key with a hyphen' => [['data-label' => 'A']],
            'key this' => [['this' => 'A']],
            'empty key' => [['' => 'A']],
        ];
    }

    /**
     * @dataProvider invalidArgsProvider
     * @param mixed $args
     */
    public function testRenderWithInvalidArgsIsBadRequest($args): void
    {
        $this->expectException(BadRequestException::class);

        $this->renderer()->render(['element' => 'components/button', 'args' => $args]);
    }

    /**
     * @return array<string, array{0: mixed, 1: string}>
     */
    public static function invalidPayloadProvider(): array
    {
        return [
            'string' => ['components/button', 'The request body must be a JSON object.'],
            'null' => [null, 'The request body must be a JSON object.'],
            'list' => [['components/button'], 'The request body must be a JSON object.'],
            'empty' => [[], 'Either "element" or "template" is required in the request body.'],
            'element and template' => [
                ['element' => 'components/button', 'template' => 'alert_list'],
                'Either "element" or "template" is required in the request body.',
            ],
            'template code' => [
                ['element' => 'components/button', 'source' => '<?php phpinfo(); ?>'],
                'Unknown key "source" in the request body.',
            ],
        ];
    }

    /**
     * @dataProvider invalidPayloadProvider
     * @param mixed $payload
     */
    public function testRenderWithInvalidPayloadIsBadRequest($payload, string $message): void
    {
        $this->expectException(BadRequestException::class);
        $this->expectExceptionMessage($message);

        $this->renderer()->render($payload);
    }

    public function testRenderTemplateCombiningElements(): void
    {
        $html = $this->renderer()->render([
            'template' => 'alert_list',
            'args' => ['alerts' => [['message' => 'Saved'], ['message' => 'Failed', 'type' => 'danger']]],
        ]);

        $this->assertStringContainsString('<div class="alert alert--info" role="alert">Saved</div>', $html);
        $this->assertStringContainsString('<div class="alert alert--danger" role="alert">Failed</div>', $html);
        $this->assertStringNotContainsString('<html', $html);
    }

    public function testRenderMissingTemplateIsNotFound(): void
    {
        $this->expectException(NotFoundException::class);
        $this->expectExceptionMessage('Story template "missing" was not found.');

        $this->renderer()->render(['template' => 'missing']);
    }

    public function testRenderTemplateWhenDisabledIsNotFound(): void
    {
        $this->expectException(NotFoundException::class);
        $this->expectExceptionMessage('Story templates are disabled.');

        $this->renderer(['templates' => false])->render(['template' => 'alert_list', 'args' => ['alerts' => []]]);
    }

    public function testRenderErrorIsThrownAndOutputBuffersAreCleaned(): void
    {
        $level = ob_get_level();
        try {
            $this->renderer()->render(['element' => 'components/broken']);
            $this->fail('No exception was thrown.');
        } catch (ErrorException $e) {
            $this->assertSame('Undefined variable $undefinedVariable', $e->getMessage());
        }

        $this->assertSame($level, ob_get_level());
    }

    /**
     * @return array<string, mixed>
     */
    private function personSettings(): array
    {
        return ['argsProcessors' => [
            ['class' => 'DefaultPersonArgsProcessor', 'stories' => ['components-person-card--default-person']],
            ['class' => 'PersonArgsProcessor', 'elements' => ['components/person_card'], 'templates' => ['person_list']],
        ]];
    }

    public function testArgsProcessorsBuildObjectsForAnElement(): void
    {
        $html = $this->renderer($this->personSettings())->render([
            'element' => 'components/person_card',
            'args' => ['person' => ['name' => 'Taro <Yamada>', 'role' => 'Concierge', 'joined' => '2021-10-01']],
        ], 'components-person-card--default');

        $this->assertStringContainsString('<h2 class="person-card__name">Taro &lt;Yamada&gt;</h2>', $html);
        $this->assertStringContainsString('<p class="person-card__joined">Since October 2021</p>', $html);
    }

    public function testArgsProcessorsBuildObjectsForATemplate(): void
    {
        $html = $this->renderer($this->personSettings())->render([
            'template' => 'person_list',
            'args' => ['people' => [
                ['name' => 'Taro Yamada', 'role' => 'Concierge', 'joined' => '2021-10-01'],
                ['name' => 'Hanako Suzuki', 'role' => 'Chef', 'joined' => '2019-04-01'],
            ]],
        ], 'templates-person-list--default');

        $this->assertSame(2, substr_count($html, '<article class="person-card">'));
        $this->assertStringContainsString('Since April 2019', $html);
    }

    public function testArgsProcessorScopedToAStoryRunsBeforeTheNextOne(): void
    {
        $settings = $this->personSettings();

        $html = $this->renderer($settings)->render(['element' => 'components/person_card'], 'components-person-card--default-person');
        $this->assertStringContainsString('<h2 class="person-card__name">Jane Doe</h2>', $html);

        // merge() keeps the args of the story
        $html = $this->renderer($settings)->render([
            'element' => 'components/person_card',
            'args' => ['person' => ['name' => 'Taro Yamada', 'role' => 'Concierge', 'joined' => '2021-10-01']],
        ], 'components-person-card--default-person');
        $this->assertStringContainsString('<h2 class="person-card__name">Taro Yamada</h2>', $html);
    }

    public function testElementThatRequiresAnObjectFailsWithoutTheArgsProcessor(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('$person must be a Person, array given.');

        $this->renderer()->render([
            'element' => 'components/person_card',
            'args' => ['person' => ['name' => 'Taro Yamada', 'role' => 'Concierge', 'joined' => '2021-10-01']],
        ]);
    }

    /**
     * Runs the processors of the renderer on empty args of an Element
     *
     * @return array<mixed>
     */
    private function processedArgs(StorybookRenderer $renderer, string $story, string $element = 'components/alert'): array
    {
        return (array)($renderer->processArgs(new StorybookArgs([], $story, $element))['processors'] ?? []);
    }

    public function testProcessArgs(): void
    {
        $renderer = $this->renderer(['argsProcessors' => [
            ['class' => 'RecordingArgsProcessor', 'stories' => 'components-alert--info'],
            ['class' => 'OtherRecordingArgsProcessor', 'elements' => 'components/alert'],
        ]]);

        $this->assertSame(['RecordingArgsProcessor', 'OtherRecordingArgsProcessor'], $this->processedArgs($renderer, 'components-alert--info'));
        $this->assertSame(['OtherRecordingArgsProcessor'], $this->processedArgs($renderer, 'components-alert--success'));
        $this->assertSame([], $this->processedArgs($renderer, 'components-button--primary', 'components/button'));
        // Instantiated once by the renderer
        $this->assertSame(2, RecordingArgsProcessor::$instances);
    }

    public function testArgsProcessorsDoNotRunForInvalidRequests(): void
    {
        $renderer = $this->renderer(['argsProcessors' => ['BrokenArgsProcessor']]);

        $requests = [
            [['element' => 'components/button', 'args' => ['1label' => 'A']], BadRequestException::class],
            [['element' => 'secret'], NotFoundException::class],
            [['element' => 'components/missing'], NotFoundException::class],
            [['template' => '../alert_list'], BadRequestException::class],
        ];
        foreach ($requests as [$payload, $exception]) {
            try {
                $renderer->render($payload);
                $this->fail('No exception was thrown.');
            } catch (Exception $e) {
                $this->assertInstanceOf($exception, $e);
            }
        }

        $this->expectException(NotFoundException::class);
        $this->expectExceptionMessage('Story templates are disabled.');
        $this->renderer(['templates' => false, 'argsProcessors' => ['BrokenArgsProcessor']])->render(['template' => 'alert_list']);
    }

    public function testArgsProcessorErrorIsThrown(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('The args processor failed.');

        $this->renderer(['argsProcessors' => ['BrokenArgsProcessor']])->render(['element' => 'components/alert', 'args' => ['message' => 'A']]);
    }

    public function testArgsProcessorWarningIsThrown(): void
    {
        $level = ob_get_level();
        try {
            $this->renderer(['argsProcessors' => ['BrokenArgsProcessor']])->render([
                'element' => 'components/alert',
                'args' => ['message' => 'A', 'throw' => 'warning'],
            ]);
            $this->fail('No exception was thrown.');
        } catch (ErrorException $e) {
            $this->assertSame('Undefined array key "missing"', $e->getMessage());
        }
        $this->assertSame($level, ob_get_level());
    }

    public function testArgsProcessorWarningIsIgnoredWithoutErrorsAsExceptions(): void
    {
        $warnings = [];
        set_error_handler(function (int $severity, string $message) use (&$warnings): bool {
            $warnings[] = $message;

            return true;
        });
        try {
            $html = $this->renderer(['argsProcessors' => ['BrokenArgsProcessor'], 'errorsAsExceptions' => false])->render([
                'element' => 'components/alert',
                'args' => ['message' => 'A', 'throw' => 'warning'],
            ]);
        } finally {
            restore_error_handler();
        }

        $this->assertSame(['Undefined array key "missing"'], $warnings);
        $this->assertSame('<div class="alert alert--info" role="alert">A</div>', trim($html));
    }

    public function testInvalidArgsProcessorsConfigurationIsThrown(): void
    {
        $this->expectException(CakeException::class);
        $this->expectExceptionMessage('"Storybook.argsProcessors" must be an array.');

        $this->renderer(['argsProcessors' => 'PersonArgsProcessor'])->render(['element' => 'components/alert', 'args' => ['message' => 'A']]);
    }

    public function testIsAllowedElement(): void
    {
        $renderer = $this->renderer(['elements' => ['components', '/ui/', '../x', '']]);

        $this->assertTrue($renderer->isAllowedElement('components/button'));
        $this->assertTrue($renderer->isAllowedElement('ui/card'));
        $this->assertFalse($renderer->isAllowedElement('components'));
        $this->assertFalse($renderer->isAllowedElement('x/card'));
        $this->assertFalse($renderer->isAllowedElement('/card'));
        $this->assertFalse($renderer->isAllowedElement('../x/card'));
    }
}
