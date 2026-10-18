<?php

App::uses('Controller', 'Controller');
App::uses('StorybookRenderer', 'Storybook.Lib');

/**
 * Render endpoint of Storybook: `POST /_storybook/render/{storyId}`
 *
 * It works only in debug mode (`debug` >= 1): the route is connected only in debug mode, and the
 * requests are rejected (404) if debug is turned off after the routes are loaded.
 *
 * Receives `{"element": "components/name", "args": {...}}` (or `{"template": ..., "args": ...}`)
 * as JSON, runs the args processors (`Storybook.argsProcessors`) and returns the rendered HTML
 * fragment. Errors are returned as HTML whose first line is `<!-- message -->`, with a 4xx or 5xx
 * status, so that Storybook can show them.
 *
 * It extends Controller and not AppController, so the components of the application (Security,
 * Session, ...) and its callbacks are not used. The View class and the helpers are those of
 * AppController (see StorybookRenderer::viewSettings()).
 *
 * @property CakeRequest $request
 * @property CakeResponse $response
 */
class StorybookController extends Controller
{
    /**
     * @var string
     */
    public $name = 'Storybook';

    /**
     * @var array<mixed>
     */
    public $uses = [];

    /**
     * @var array<mixed>
     */
    public $components = [];

    /**
     * @var bool
     */
    public $autoRender = false;

    /**
     * Theme of the View (passed to the View like the other view settings)
     *
     * @var string|null
     */
    public $theme = null;

    /**
     * Rejects the requests outside debug mode, and sets up the View of the application
     *
     * @return void
     * @throws NotFoundException When debug mode is off
     */
    public function beforeFilter()
    {
        if ((int)Configure::read('debug') < 1) {
            throw new NotFoundException();
        }
        $settings = StorybookRenderer::viewSettings();
        $this->viewClass = $settings['viewClass'];
        $this->helpers = $settings['helpers'];
        $this->ext = $settings['ext'];
        $this->theme = $settings['theme'];
        $this->layout = false;
    }

    /**
     * Renders a story
     *
     * @param string|null $story Story ID (for the args processors, the logs and the error messages)
     * @return CakeResponse
     */
    public function story($story = null)
    {
        $this->response->type('html');
        $this->response->charset((string)Configure::read('App.encoding') ?: 'UTF-8');
        $this->response->header('Cache-Control', 'no-store');
        $this->response->header('X-Robots-Tag', 'noindex');

        try {
            if (!$this->request->is('post')) {
                $this->response->header('Allow', 'POST');
                throw new MethodNotAllowedException('Only POST requests are allowed.');
            }
            $payload = json_decode((string)$this->request->input(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new BadRequestException('Invalid JSON: ' . json_last_error_msg() . '.');
            }

            $View = $this->_getViewObject();
            // Look up Elements and templates in the application, not in this plugin
            $View->plugin = null;
            $html = (new StorybookRenderer($View))->render($payload, is_string($story) ? $story : '');
            $this->response->body($html);
        } catch (Throwable $e) {
            $this->response->statusCode($e instanceof HttpException ? $e->getCode() : 500);
            $this->response->body($this->errorHtml($e, is_string($story) ? $story : ''));
            if (!$e instanceof HttpException) {
                CakeLog::error(sprintf('Storybook failed to render story "%s": %s', $story, $e));
            }
        }

        return $this->response;
    }

    /**
     * Returns the error HTML: the first line is `<!-- message -->` (read by the Storybook
     * renderer), followed by the details
     *
     * The endpoint works only in debug mode, so the message and the trace of server errors are
     * shown.
     *
     * @param Throwable $e Error
     * @param string $story Story ID
     * @return string
     */
    protected function errorHtml(Throwable $e, string $story): string
    {
        $message = $e->getMessage();
        $title = str_replace(["\r", "\n"], ' ', h($message));

        $html = '<!-- ' . $title . ' -->' . "\n";
        $html .= '<div class="storybook-cakephp-error">' . "\n";
        $html .= '<h1>' . h(get_class($e)) . '</h1>' . "\n";
        $html .= '<p>' . h($message) . '</p>' . "\n";
        if ($story !== '') {
            $html .= '<p>Story: <code>' . h($story) . '</code></p>' . "\n";
        }
        if (!$e instanceof HttpException) {
            $html .= '<pre>' . h($e->getFile() . ':' . $e->getLine() . "\n" . $e->getTraceAsString()) . '</pre>' . "\n";
        }
        $html .= '</div>' . "\n";

        return $html;
    }
}
