<?php

App::uses('StorybookController', 'Storybook.Controller');

/**
 * @property StorybookController $controller
 */
class StorybookControllerTest extends ControllerTestCase
{
    public function setUp(): void
    {
        parent::setUp();
        $testApp = dirname(__DIR__, 2) . DS . 'test_app' . DS;
        App::build([
            'View' => [$testApp . 'src' . DS . 'View' . DS, $testApp . 'templates' . DS],
            'Lib' => [$testApp . 'src' . DS . 'Lib' . DS],
        ], App::PREPEND);
        Configure::write('Storybook', ['helpers' => ['Html']]);
        Configure::write('debug', 2);
        $this->loadRoutes();
    }

    private function loadRoutes(): void
    {
        Router::reload();
        require CONFIG . 'routes.php';
    }

    public function tearDown(): void
    {
        Configure::delete('Storybook');
        App::build();
        parent::tearDown();
    }

    /**
     * @param array<string, mixed>|string $payload Payload (a string is sent as is)
     * @param string $method HTTP method
     * @return string Response body
     */
    private function renderStory($payload, string $method = 'POST', string $story = 'components-button--primary'): string
    {
        return $this->testAction('/_storybook/render/' . $story, [
            'method' => $method,
            'data' => is_string($payload) ? $payload : (string)json_encode($payload),
            'return' => 'contents',
        ]);
    }

    private function statusCode(): int
    {
        return $this->controller->response->statusCode();
    }

    /**
     * Asserts that the response is an error HTML whose first line is `<!-- message -->`
     */
    private function assertErrorHtml(int $status, string $message, string $html): void
    {
        $this->assertSame($status, $this->statusCode());
        $this->assertSame('<!-- ' . $message . ' -->', explode("\n", $html, 2)[0]);
        $this->assertStringContainsString('class="storybook-cakephp-error"', $html);
    }

    public function testRouteIsConnected(): void
    {
        $params = Router::parse('/_storybook/render/components-button--primary');

        $this->assertSame('storybook', $params['plugin']);
        $this->assertSame('story', $params['action']);
        $this->assertSame(['components-button--primary'], $params['pass']);
    }

    public function testRouteIsConnectedWithoutConfiguration(): void
    {
        Configure::delete('Storybook');
        $this->loadRoutes();

        $this->assertSame('storybook', Router::parse('/_storybook/render/components-button--primary')['plugin']);
    }

    public function testRouteIsConnectedInDebugMode1(): void
    {
        Configure::write('debug', 1);
        $this->loadRoutes();

        $this->assertSame('storybook', Router::parse('/_storybook/render/components-button--primary')['plugin']);
    }

    public function testRouteIsNotConnectedWithoutDebugMode(): void
    {
        Configure::write('debug', 0);
        $this->loadRoutes();

        $this->assertNull(Router::parse('/_storybook/render/components-button--primary')['plugin']);
    }

    public function testRenderIsNotFoundWhenDebugModeIsTurnedOffAfterTheRoutesAreLoaded(): void
    {
        Configure::write('debug', 0);

        try {
            $this->renderStory(['element' => 'components/button', 'args' => ['label' => 'A', 'url' => '/']]);
            $this->fail('NotFoundException was not thrown.');
        } catch (NotFoundException $e) {
            $this->assertSame(404, $e->getCode());
        }
        $this->assertSame('', (string)$this->controller->response->body());
    }

    public function testRouteRejectsInvalidStoryIds(): void
    {
        $this->assertNull(Router::parse('/_storybook/render/components.button')['plugin']);
    }

    public function testRenderElement(): void
    {
        $html = $this->renderStory([
            'element' => 'components/button',
            'args' => ['label' => 'Apply <now>', 'url' => 'https://example.com/jobs/1'],
        ]);

        $this->assertSame(200, $this->statusCode());
        $this->assertSame('<a href="https://example.com/jobs/1" class="button button--primary">Apply &lt;now&gt;</a>', $html);
        $this->assertSame('text/html', $this->controller->response->type());
        $this->assertSame('no-store', $this->headers['Cache-Control']);
    }

    public function testRenderTemplate(): void
    {
        $html = $this->renderStory([
            'template' => 'alert_list',
            'args' => ['alerts' => [['message' => 'Saved', 'type' => 'success']]],
        ], 'POST', 'stories-alert-list--default');

        $this->assertSame(200, $this->statusCode());
        $this->assertStringContainsString('<div class="alert alert--success" role="alert">Saved</div>', $html);
    }

    public function testComponentsOfTheApplicationAreNotLoaded(): void
    {
        $this->renderStory(['element' => 'components/button', 'args' => ['label' => 'A', 'url' => '/']]);

        $this->assertSame([], $this->controller->Components->loaded());
    }

    public function testRenderWithConfiguredViewClass(): void
    {
        Configure::write('Storybook.viewClass', 'TestApp');

        $html = $this->renderStory(['element' => 'components/view_class']);

        $this->assertStringContainsString('<p class="view-class">TestAppView .ctp</p>', $html);
    }

    public function testGetIsNotAllowed(): void
    {
        $html = $this->renderStory('', 'GET');

        $this->assertErrorHtml(405, 'Only POST requests are allowed.', $html);
        $this->assertSame('POST', $this->headers['Allow']);
    }

    public function testInvalidJsonIsBadRequest(): void
    {
        $html = $this->renderStory('{"element": ');

        $this->assertErrorHtml(400, 'Invalid JSON: Syntax error.', $html);
    }

    public function testArgsThatAreNotAnObjectAreBadRequest(): void
    {
        $html = $this->renderStory(['element' => 'components/button', 'args' => 'label']);

        $this->assertErrorHtml(400, '&quot;args&quot; must be a JSON object.', $html);
    }

    public function testPathTraversalIsBadRequest(): void
    {
        $html = $this->renderStory(['element' => 'components/../secret']);

        $this->assertSame(400, $this->statusCode());
        $this->assertStringStartsWith('<!-- Invalid element name: &quot;components/../secret&quot;', $html);
        $this->assertStringNotContainsString('<p>secret</p>', $html);
    }

    public function testElementOutsideAllowedDirectoriesIsNotFound(): void
    {
        $html = $this->renderStory(['element' => 'secret']);

        $this->assertErrorHtml(404, 'Element &quot;secret&quot; is not in the allowed directories (components).', $html);
        $this->assertStringNotContainsString('<p>secret</p>', $html);
    }

    public function testMissingElementIsNotFound(): void
    {
        $html = $this->renderStory(['element' => 'components/missing']);

        $this->assertErrorHtml(404, 'Element &quot;components/missing&quot; was not found.', $html);
    }

    public function testRenderErrorIsInternalServerErrorWithDetails(): void
    {
        $html = $this->renderStory(['element' => 'components/broken'], 'POST', 'components-broken--default');

        $this->assertErrorHtml(500, 'Undefined variable $undefinedVariable', $html);
        $this->assertStringNotContainsString('Before the error', $html);
        $this->assertStringContainsString('<p>Story: <code>components-broken--default</code></p>', $html);
        $this->assertStringContainsString('broken.ctp:9', $html);
    }

    public function testErrorMessageCannotCloseTheComment(): void
    {
        $html = $this->renderStory(['element' => "components/x-->\n<script>alert(1)</script>"]);

        $this->assertSame(400, $this->statusCode());
        $firstLine = explode("\n", $html, 2)[0];
        $this->assertStringStartsWith('<!-- ', $firstLine);
        $this->assertStringEndsWith(' -->', $firstLine);
        $this->assertSame(1, substr_count($firstLine, '-->'));
        $this->assertStringNotContainsString('<script>', $html);
    }

    /**
     * Configures the args processors of the test application (config/bootstrap.php)
     */
    private function configurePersonArgsProcessors(): void
    {
        Configure::write('Storybook.argsProcessors', [
            ['class' => 'DefaultPersonArgsProcessor', 'stories' => ['components-person-card--default-person']],
            ['class' => 'PersonArgsProcessor', 'elements' => ['components/person_card'], 'templates' => ['person_list']],
        ]);
    }

    public function testArgsProcessorsBuildObjectsFromTheJsonArgs(): void
    {
        $this->configurePersonArgsProcessors();

        $html = $this->renderStory([
            'element' => 'components/person_card',
            'args' => ['person' => ['name' => 'Taro Yamada', 'role' => 'Concierge', 'joined' => '2021-10-01']],
        ], 'POST', 'components-person-card--default');

        $this->assertSame(200, $this->statusCode());
        $this->assertStringContainsString('<h2 class="person-card__name">Taro Yamada</h2>', $html);
        $this->assertStringContainsString('Since October 2021', $html);
    }

    public function testArgsProcessorsAreScopedByTheStoryIdOfTheUrl(): void
    {
        $this->configurePersonArgsProcessors();

        $html = $this->renderStory(['element' => 'components/person_card'], 'POST', 'components-person-card--default-person');
        $this->assertSame(200, $this->statusCode());
        $this->assertStringContainsString('<h2 class="person-card__name">Jane Doe</h2>', $html);

        $html = $this->renderStory(['element' => 'components/person_card'], 'POST', 'components-person-card--other');
        $this->assertErrorHtml(500, 'Undefined variable $person', $html);
    }

    public function testElementThatRequiresAnObjectFailsWithoutArgsProcessors(): void
    {
        $html = $this->renderStory([
            'element' => 'components/person_card',
            'args' => ['person' => ['name' => 'Taro Yamada', 'role' => 'Concierge', 'joined' => '2021-10-01']],
        ], 'POST', 'components-person-card--default');

        $this->assertErrorHtml(500, '$person must be a Person, array given.', $html);
    }

    public function testArgsProcessorsCannotBeSentByTheClient(): void
    {
        $html = $this->renderStory([
            'element' => 'components/button',
            'args' => ['label' => 'A', 'url' => '/'],
            'argsProcessors' => ['BrokenArgsProcessor'],
        ]);

        $this->assertErrorHtml(400, 'Unknown key &quot;argsProcessors&quot; in the request body.', $html);
    }

    public function testArgsProcessorErrorIsInternalServerErrorWithDetails(): void
    {
        Configure::write('Storybook.argsProcessors', ['BrokenArgsProcessor']);

        $html = $this->renderStory(['element' => 'components/alert', 'args' => ['message' => 'A']], 'POST', 'components-alert--info');

        $this->assertErrorHtml(500, 'The args processor failed.', $html);
        $this->assertStringContainsString('<h1>RuntimeException</h1>', $html);
        $this->assertStringContainsString('<p>Story: <code>components-alert--info</code></p>', $html);
        $this->assertStringContainsString('BrokenArgsProcessor.php:', $html);
    }

    public function testArgsProcessorHttpExceptionKeepsItsStatus(): void
    {
        Configure::write('Storybook.argsProcessors', ['BrokenArgsProcessor']);

        $html = $this->renderStory(['element' => 'components/alert', 'args' => ['message' => 'A', 'throw' => 'not-found']]);

        $this->assertErrorHtml(404, 'The job was not found.', $html);
    }

    public function testInvalidArgsProcessorIsInternalServerError(): void
    {
        Configure::write('Storybook.argsProcessors', ['NotAnArgsProcessor']);

        $html = $this->renderStory(['element' => 'components/alert', 'args' => ['message' => 'A']]);

        $this->assertErrorHtml(500, 'Args processor class &quot;NotAnArgsProcessor&quot; must implement StorybookArgsProcessor.', $html);
    }
}
