<?php

App::uses('Controller', 'Controller');
App::uses('StorybookRenderer', 'Storybook.Lib');
App::uses('View', 'View');

class StorybookRendererTest extends CakeTestCase
{
    private View $View;

    public function setUp(): void
    {
        parent::setUp();
        $testApp = dirname(__DIR__, 2) . DS . 'test_app' . DS;
        App::build([
            'View' => [$testApp . 'src' . DS . 'View' . DS, $testApp . 'templates' . DS],
        ], App::PREPEND);

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

    public function testIsDisabledByDefault(): void
    {
        $this->assertFalse(StorybookRenderer::enabled());
    }

    /**
     * @return array<string, array{0: mixed, 1: bool}>
     */
    public static function enabledProvider(): array
    {
        return [
            'true' => [true, true],
            'string true (from env)' => ['true', true],
            'string 1' => ['1', true],
            'false' => [false, false],
            'string false' => ['false', false],
            'empty string (unset env)' => ['', false],
            'null' => [null, false],
        ];
    }

    /**
     * @dataProvider enabledProvider
     * @param mixed $value
     */
    public function testEnabled($value, bool $expected): void
    {
        Configure::write('Storybook.enabled', $value);

        $this->assertSame($expected, StorybookRenderer::enabled());
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
