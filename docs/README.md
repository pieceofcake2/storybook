# Storybook Documentation

pieceofcake2/storybook renders the Elements of a CakePHP 2 application in
[Storybook](https://storybook.js.org/), in the same way as
[Storybook for Symfony](https://github.com/sensiolabs/StorybookBundle) renders Twig components.
It consists of a CakePHP plugin, which provides the render endpoint, and a Storybook framework
(`@pieceofcake2/storybook`, Vite builder), which is included in the Composer package.

- [How It Works](#how-it-works)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Writing Stories](#writing-stories)
- [Running Storybook Locally](#running-storybook-locally)
- [The Vite Config of the Application](#vite-config)
- [Static Build and Deployment](#static-build)
- [Disabling Storybook in Production](#production)
- [Security](#security)
- [Testing Stories](#testing-stories)
- [Differences from Storybook for Symfony](#differences)
- [Limitations](#limitations)

<a id="how-it-works"></a>

## How It Works

A story names an Element, and its args become the variables of the Element:

```ts
// stories/components/button.stories.ts
export default { component: 'components/button' };

export const Primary = { args: { label: 'Apply', url: '/jobs/1' } };
```

To render the story, the Storybook preview sends the name of the Element and the args to the
application:

```http
POST /_storybook/render/components-button--primary
Content-Type: application/json

{"element": "components/button", "args": {"label": "Apply", "url": "/jobs/1"}}
```

The application renders the Element with its View class and helpers, as
`$this->element('components/button', ['label' => 'Apply', 'url' => '/jobs/1'])` would, and
returns the HTML fragment. The preview puts it in the canvas and runs its scripts.

Only the name of an Element (under the allowed directories) and the args are sent: templates and
code are never received from the client, since PHP templates cannot be sandboxed. Stories that
combine several Elements use templates on the server, selected by name (see
[Story templates](#story-templates)).

In `storybook dev`, the Vite dev server of Storybook proxies `/_storybook/render` to the
application. A static build (`storybook build`) is deployed on the same origin as the
application, and sends the requests to `/_storybook/render` of its origin.

<a id="requirements"></a>

## Requirements

- PHP 8.0+ and pieceofcake2/cakephp 2.12+
- Node.js 20.19+, Storybook 10 and Vite 5 to 8

<a id="installation"></a>

## Installation

1. **Install the plugin** with [Composer](https://getcomposer.org/):

   ```bash
   composer require pieceofcake2/storybook
   ```

   The plugin has the `cakephp-plugin` type, so it is installed into your plugins directory by
   `composer/installers` (set `installer-paths` in your application's `composer.json`):

   | Layout | `installer-paths` | Path of the plugin |
   | --- | --- | --- |
   | Modern (`config/`, `src/`, `templates/`, `plugins/`) | `"plugins/{$name}/": ["type:cakephp-plugin"]` | `plugins/Storybook/` |
   | Legacy (`app/Config/`, `app/Plugin/`) | `"app/Plugin/{$name}/": ["type:cakephp-plugin"]` | `app/Plugin/Storybook/` |

   Install it as a regular dependency (not `--dev`) if you deploy the static build to an
   environment built with `composer install --no-dev`; it stays disabled unless you enable it
   (see [Disabling Storybook in Production](#production)).

2. **Load the plugin with its routes** in `config/bootstrap.php` (legacy layout:
   `app/Config/bootstrap.php`):

   ```php
   CakePlugin::load('Storybook', ['routes' => true]);
   ```

   With `CakePlugin::loadAll()`, pass the option for the plugin:
   `CakePlugin::loadAll(['Storybook' => ['routes' => true]]);`. If the plugin is a dev
   dependency, load it only when it is installed:

   ```php
   try {
       CakePlugin::load('Storybook', ['routes' => true]);
   } catch (MissingPluginException) {
       // Not installed (composer install --no-dev)
   }
   ```

   Your `config/routes.php` must call `CakePlugin::routes()` (as the default one does).

3. **Install Storybook and the framework** with npm. The framework is not published to npm: install
   it from the plugin directory with a `file:` dependency (adjust the path to where Composer
   installed the plugin):

   ```bash
   npm install --save-dev storybook@^10 vite @storybook/addon-docs \
       @pieceofcake2/storybook@file:plugins/Storybook/storybook
   ```

   ```json
   {
       "devDependencies": {
           "@pieceofcake2/storybook": "file:plugins/Storybook/storybook",
           "@storybook/addon-docs": "^10.6.2",
           "storybook": "^10.6.2",
           "vite": "^8.3.4"
       }
   }
   ```

   The built files of the framework are included in the package, so no build step is needed. Run
   `npm install` again after updating the plugin with Composer.

   If your npm configuration sets `ignore-scripts=true`, Storybook works without the install
   scripts.

<a id="configuration"></a>

## Configuration

### CakePHP

All settings are written in `config/bootstrap.php` (before loading the plugin), under the
`Storybook` key:

```php
Configure::write('Storybook', [
    // Enables the render endpoint. Disabled by default: enable it only where Storybook is used
    'enabled' => filter_var(env('STORYBOOK_ENABLED'), FILTER_VALIDATE_BOOLEAN),
    // Element directories that stories can render (Elements/components/ by default)
    'elements' => ['components'],
    // Directory of the story templates under the view path (templates/Stories/), or false
    'templates' => 'Stories',
    // View settings. By default, those of AppController ($viewClass, $helpers, $ext, $theme)
    'viewClass' => null,
    'helpers' => null,
    'ext' => null,
    'theme' => null,
    // Whether PHP warnings and notices (e.g. an undefined variable) make the rendering fail
    'errorsAsExceptions' => true,
]);
```

`Storybook.enabled` is read when the routes are loaded: when it is false, the route
`/_storybook/render/:story` is not connected, and the controller also returns 404.

The controller extends `Controller`, not `AppController`: the components of your application
(Security, Session, Auth, ...) and the callbacks of `AppController` (e.g. `beforeFilter()`) are
not used for the render requests, so they are not subject to the CSRF and form tampering checks
of the Security component, and do not start a session. Only the view settings of `AppController`
are read (without instantiating it), so that Elements are rendered by the same View class (e.g.
`AppView`) with the same helpers and `h()` as in the application. Set `Storybook.helpers` if a
helper needs something that only exists in a normal request.

### Storybook

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@pieceofcake2/storybook';

const config: StorybookConfig = {
    stories: ['../stories/**/*.stories.ts'],
    addons: ['@storybook/addon-docs'],
    framework: {
        name: '@pieceofcake2/storybook',
        options: {
            // URL of the CakePHP application, to which storybook dev proxies the render requests
            server: 'http://localhost:8765',
            // Other paths to proxy to the application (images, built assets, ...)
            proxyPaths: ['/img', '/build'],
            // Reload the stories when the templates change
            watchPaths: ['templates'],
        },
    },
};

export default config;
```

| Option | Description |
| --- | --- |
| `server` | URL of the CakePHP application. `storybook dev` proxies `/_storybook/render` and `proxyPaths` to it, with the `X-Storybook-Proxy: true` header. Not used by `storybook build`. |
| `proxyPaths` | Other paths (a string or an array) to proxy to the application, e.g. the images and the files referred to by the HTML of the Elements. |
| `watchPaths` | Files or directories (relative to the project) whose changes reload the stories in `storybook dev`. |
| `excludeVitePlugins` | Names of the Vite plugins of your Vite config to remove in Storybook (default: `['hot-file']`). See [The Vite Config of the Application](#vite-config). |
| `builder` | Options of `@storybook/builder-vite`, e.g. `viteConfigPath`. |

`.storybook/preview.ts` loads the CSS and the JavaScript of the application, by importing the
entry of your assets. Vite processes it with your Vite config (Sass, aliases, ...), with HMR in
`storybook dev`:

```ts
import type { Preview } from '@pieceofcake2/storybook';

import '../assets/app.ts';

const preview: Preview = {
    tags: ['autodocs'],
};

export default preview;
```

After each render, the scripts in the HTML of the story are run and `DOMContentLoaded` is
dispatched again, so the scripts of the application that initialize the page on
`DOMContentLoaded` also run for each story. Scripts that run once when they are imported only run
for the first story: run them on `DOMContentLoaded` instead.

To add tags to the `<head>` of the preview (e.g. web fonts), use
[`.storybook/preview-head.html`](https://storybook.js.org/docs/configure/story-rendering).

If the application is not at the root of its origin (e.g. `App.base` is `/app`), set the URL of
the render endpoint in `.storybook/preview.ts`:

```ts
const preview: Preview = {
    parameters: {
        cakephp: { renderUrl: '/app/_storybook/render' },
    },
};
```

<a id="writing-stories"></a>

## Writing Stories

Stories are written in [CSF](https://storybook.js.org/docs/api/csf) (e.g.
`stories/components/page_header.stories.ts`). Set `component` to the name of the Element (under
`templates/Elements/`, without the extension); the args are the variables of the Element:

```ts
import type { Meta, StoryObj } from '@pieceofcake2/storybook';

const meta = {
    title: 'Components/Page Header',
    component: 'components/page_header',
    args: {
        theme: 'career',
        title: 'Career',
        crumbs: [['Jobs', '/career/jobs'], ['Front Office']],
        heading: 'Front Office',
    },
    argTypes: {
        theme: { control: 'select', options: ['fresh', 'career', 'rjet', 'finance', 'parttime', 'contact'] },
    },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutCrumbs: Story = {
    args: { crumbs: null },
};
```

Names of Elements and templates match `[a-z0-9_/-]+` (lowercase, no `..`), and Elements must be
under one of the allowed directories (`components/` by default). Args are sent as JSON: strings,
numbers, booleans, `null`, arrays and objects (as PHP arrays). Dates are sent as ISO 8601 strings.

`element('components/button')` is the same as the string `'components/button'`.

<a id="story-templates"></a>

### Story templates

To show several Elements together (e.g. a list of cards, or an Element inside a layout), write a
template on the server under `templates/Stories/` and select it with `template()`:

```php
<?php
// templates/Stories/job_list.php
/**
 * @var AppView $this
 * @var array $jobs
 */
?>
<div class="l-container">
<?php foreach ($jobs as $job) { ?>
    <?= $this->element('components/job_card', ['job' => $job]) ?>
<?php } ?>
</div>
```

```ts
import { template, type Meta } from '@pieceofcake2/storybook';

export default {
    title: 'Pages/Job List',
    component: template('job_list'),
    args: { jobs: [{ id: 1, title: 'Front Office' }] },
} satisfies Meta;
```

The args are set as the view variables of the template, which is rendered without a layout. The
templates directory is set by `Storybook.templates`.

### Render functions

A story can return the Element (or the template) and the args from `render`:

```ts
export const Large: Story = {
    render: (args) => ({ element: 'components/button', args: { ...args, large: true } }),
};
```

### Actions

Function args (e.g. `fn()` or the `action` argTypes) are not sent to the server. As in Storybook
for Symfony, they are bound to the events of the elements whose `data-storybook-callbacks`
attribute contains the name of the arg: with `data-storybook-callbacks="increment"`, the
`increment` event of the element calls the `increment` arg.

```php
<button type="button" data-storybook-callbacks="increment">+1</button>
```

```ts
import { fn } from 'storybook/test';

export default {
    component: 'components/counter',
    args: { increment: fn() },
};
```

To log DOM events without changing the Element, use the `withActions` decorator of Storybook with
the `actions.handles` parameter:

```ts
import { withActions } from 'storybook/actions/decorator';

export default {
    component: 'components/button',
    parameters: { actions: { handles: ['click a'] } },
    decorators: [withActions],
};
```

### Docs

With `@storybook/addon-docs`, "Show code" shows the PHP code that renders the story, e.g.
`<?= $this->element('components/button', ['label' => 'Apply', ...]) ?>`.

### Errors

When the application returns an error, the story is marked as failed and the error page is shown
in the canvas. The error page is HTML whose first line is a comment with the message
(`<!-- Element "components/missing" was not found. -->`), with the status:

| Status | Cause |
| --- | --- |
| 400 | Invalid JSON, invalid name of an Element or a template, args that are not an object |
| 404 | Element outside the allowed directories, missing Element or template |
| 405 | Not a POST request |
| 500 | Error while rendering, including PHP warnings when `errorsAsExceptions` is true. The message and the trace are shown in debug mode only |

<a id="running-storybook-locally"></a>

## Running Storybook Locally

Run the application with the render endpoint enabled, and `storybook dev`:

```bash
# Terminal 1: the CakePHP application
STORYBOOK_ENABLED=true php -d opcache.revalidate_freq=0 -S localhost:8765 -t webroot webroot/index.php

# Terminal 2: Storybook
npx storybook dev -p 6006
```

Open http://localhost:6006. With `opcache.revalidate_freq=0`, the changes of the templates are
rendered at once (with the default of 2 seconds, a reload by `watchPaths` can render the previous
version). Any server can be used instead of `php -S` (Docker, symfony CLI, ...): set its URL in
`server`.

You can add scripts to your `package.json`:

```json
{
    "scripts": {
        "storybook": "storybook dev -p 6006",
        "build-storybook": "storybook build"
    }
}
```

<a id="vite-config"></a>

## The Vite Config of the Application

`@storybook/builder-vite` loads the Vite config of your project (`vite.config.ts`), so that the
assets are processed in the same way in Storybook. Some settings of the config of a CakePHP
application do not apply to Storybook:

- `base`, `build` (e.g. `build.rollupOptions.input`, `build.outDir`, `build.manifest`) and, in
  `storybook dev`, `server` (`origin`, `port`, `https`, ...) are replaced by the builder.
- The `hot-file` plugin of the [pieceofcake2/vite](https://github.com/pieceofcake2/vite)
  documentation writes `webroot/hot` and removes it when the process exits: in Storybook, it would
  remove the hot file of a running Vite dev server, so the application would stop loading its
  assets from it. The framework removes the plugins named in `excludeVitePlugins` (`['hot-file']`
  by default).

If your config has other plugins that must not run in Storybook, add their names to
`excludeVitePlugins`, or check `process.env.STORYBOOK`, which Storybook sets to `'true'`:

```ts
// vite.config.ts
export default defineConfig({
    plugins: process.env.STORYBOOK === 'true' ? [] : [hotFile('webroot/hot', devServerUrl)],
});
```

To use a different config file for Storybook, set `builder.viteConfigPath` in the framework
options.

<a id="static-build"></a>

## Static Build and Deployment

`storybook build` writes a static Storybook (`storybook-static/` by default). Deploy it on the same
origin as the application, under any path (e.g. https://dev.example.com/storybook/): it sends the
render requests to `/_storybook/render` of its origin (not of its own path), and the HTML of the
Elements refers to the images and assets of the application on the same origin. The application
of that environment must have `Storybook.enabled` set to true.

For example, to publish Storybook only in the development environment:

1. Enable the endpoint with an environment variable that is set only in the development environment:

   ```php
   // config/bootstrap.php
   Configure::write('Storybook.enabled', filter_var(env('STORYBOOK_ENABLED'), FILTER_VALIDATE_BOOLEAN));
   ```

   ```bash
   # Development environment only
   STORYBOOK_ENABLED=true
   ```

2. Build Storybook in the deployment of the development environment, and serve it under
   `/storybook/`: write it into the webroot (`npx storybook build -o webroot/storybook`, and add
   `webroot/storybook/` to `.gitignore`), or upload it to the storage or CDN that serves the static
   files of the site, on the same host.

3. Do not build or deploy it in production (see below).

If the development environment uses Basic authentication, the browser sends the credentials with
the render requests, as they are on the same origin.

<a id="production"></a>

## Disabling Storybook in Production

The render endpoint renders any Element of the allowed directories with arbitrary args, which is
not meant for production. It is disabled by default, and stays disabled unless `Storybook.enabled`
is true:

- Do not set `STORYBOOK_ENABLED` (or set it to `false`) in production. Check that
  `POST /_storybook/render/x` returns 404 there.
- Do not deploy the static build to production, or exclude it from the files deployed to
  production (e.g. `webroot/storybook/`).
- Optionally, install the plugin as a dev dependency and load it only when it is installed (see
  [Installation](#installation)), so that the code is not deployed at all with
  `composer install --no-dev`.

<a id="security"></a>

## Security

- Only the name of an Element or of a story template, and the args are received. Templates and
  code are never received from the client, since PHP templates cannot be sandboxed (Storybook for
  Symfony compiles the Twig template sent by the client in a sandbox instead).
- Names must match `[a-z0-9_/-]+` and cannot contain `..`, a leading `/`, a plugin prefix or an
  extension. Elements must be under the allowed directories (`Storybook.elements`), and templates
  under the templates directory (`Storybook.templates`, which can be disabled with false).
- The args must be a JSON object whose keys are valid PHP variable names (not `this`).
- The endpoint is disabled by default (no route, 404), accepts only POST requests, and returns
  `Cache-Control: no-store` and `X-Robots-Tag: noindex`. The messages and traces of server errors
  are shown only in debug mode.
- The endpoint does not use the Security component (CSRF) or the session, since the requests come
  from Storybook without a form. Do not enable it where the Elements could expose data to
  unauthorized users: Elements are rendered with the args of the request, and with whatever the
  helpers and the Elements read by themselves (configuration, database, ...).

<a id="testing-stories"></a>

## Testing Stories

Stories can be tested with [`@storybook/addon-vitest`](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon)
(play functions, interactions and accessibility), with the application running: the framework
adds the same proxy to the Vite server of Vitest.

```ts
// vitest.config.ts
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [storybookTest({ configDir: '.storybook' })],
    test: {
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
        },
    },
});
```

The repository of this package runs the stories of its test application in this way, and checks
every story of the static build served by the application (`tests/test_app/bin/e2e.sh`).

<a id="differences"></a>

## Differences from Storybook for Symfony

| | Storybook for Symfony | pieceofcake2/storybook |
| --- | --- | --- |
| What the client sends | The source of a Twig template (compiled in a sandbox) and the args | The name of an Element (or of a story template on the server) and the args |
| Combining components in a story | A Twig template in the story | A story template on the server (`templates/Stories/`) |
| Preview `<head>` | Rendered by the `storybook:generate-preview` command | `.storybook/preview.ts` imports the assets with Vite (and `preview-head.html`) |
| Assets | AssetMapper or Webpack Encore | Vite (the Vite config of the application) |
| Builders | Webpack and Vite | Vite |
| Args processors, component mocks, Live Components | Supported | Not supported |
| Watching templates | `additionalWatchPaths` | `watchPaths` |
| Production | Disabled in the `prod` environment | Disabled unless `Storybook.enabled` is true |
| Static build | Behind a reverse proxy to the application | On the same origin as the application |
| npm package | `file:` dependency on the bundle | `file:` dependency on the plugin |

<a id="limitations"></a>

## Limitations

- Args are JSON values, so Elements that expect objects (e.g. entities or `DateTime`) need a story
  template that builds them, or an Element that accepts arrays.
- The request is a POST request to `/_storybook/render`, so Elements that depend on the current
  request (URL, query, session, logged-in user) render with that request.
- Element caching (the `cache` option of `element()`) and plugin Elements (`Plugin.name`) are not
  supported.
- The framework uses the Vite builder only (no Webpack).
