# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-10-19

### Added

- Args processors (`Storybook.argsProcessors`): classes of the application implementing
  `StorybookArgsProcessor` (`__invoke(StorybookArgs $args): void`) that change the args on the
  server before the Element or the story template is rendered, e.g. to build entities or value
  objects from the JSON args. They apply to every story, or only to the stories that match their
  `stories` (story IDs), `elements` or `templates` (names), and run in the order of the
  configuration. `StorybookArgs` gives array access and `get()`, `set()`, `has()`, `remove()`,
  `merge()` (keeping the args that are set, unless `$override`) and `toArray()`, with the story ID
  and the name of the Element or the template. Errors of the processors fail the story (500 with
  the message and the trace). Only configured classes run: the request cannot name one.

## [1.2.2] - 2026-10-18

### Fixed

- `storybook-cakephp prerender` no longer follows redirects when it checks that the application
  responds: any HTTP response (including a redirect, e.g. to a login page on `App.fullBaseUrl`
  that cannot be reached, or an error) means that the application is running.

## [1.2.1] - 2026-10-18

### Changed

- In a pre-rendered (static) Storybook, the controls are read-only: every arg gets
  `control: false`, so the Controls panel and the args table of Docs show the args without
  editors, with the value of each arg in the "Default" column. `storybook dev` keeps the editors.
  The notice for changed args remains for args changed in other ways (e.g. the `args` parameter
  of the URL).

## [1.2.0] - 2026-10-18

### Changed

- In a pre-rendered (static) Storybook, "Show code" in Docs shows the pre-rendered HTML of the
  story instead of the PHP code, since its args cannot be changed. `storybook dev` still shows the
  PHP code.

## [1.1.0] - 2026-10-18

### Added

- `storybook-cakephp prerender --server <url> [--dir storybook-static]` pre-renders all the stories
  of a Storybook build with the application (running in debug mode), so that the build is static:
  it loads the pre-rendered HTML relative to its own path, and never requests the application. The
  stories are rendered by the built preview in a headless Chrome (`playwright-core`, an optional
  peer dependency, with an installed browser), so the args are those of the build, including the
  URLs of the imported assets. Changed args in Controls show a notice in the canvas.

### Changed

- The render endpoint works only in debug mode (`debug` >= 1): the route is not connected with
  `debug` 0, and the controller returns 404 if debug mode is turned off after the routes are
  loaded. The messages and traces of server errors are always shown, since the endpoint runs in
  debug mode.

## [1.0.0] - 2026-10-17

### Added

- Render endpoint `POST /_storybook/render/{storyId}`, which renders an Element under the allowed
  directories (`Storybook.elements`, `components` by default) or a story template
  (`Storybook.templates`, `Stories` by default) with the args as variables. It is connected when
  the plugin is loaded with its routes, does not use the components of `AppController` (Security,
  Session), and uses its View class and helpers. The plugin is for development only: install it
  as a dev dependency (`composer require --dev`), never in production.
- Error responses whose first line is `<!-- message -->`, with a 4xx or 5xx status. PHP warnings
  fail the rendering (`Storybook.errorsAsExceptions`).
- Storybook framework `@pieceofcake2/storybook` (Storybook 10, Vite builder), installed from the
  Composer package with a `file:` dependency: renderer, preset with the proxy to the application
  (`server`, `proxyPaths`), `watchPaths`, removal of the `hot-file` plugin
  (`excludeVitePlugins`), actions with `data-storybook-callbacks`, and the PHP code in Docs.
- Static builds that work on the same origin as the application, under any path.

[1.3.0]: https://github.com/pieceofcake2/storybook/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/pieceofcake2/storybook/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/pieceofcake2/storybook/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/pieceofcake2/storybook/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/pieceofcake2/storybook/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/pieceofcake2/storybook/releases/tag/v1.0.0
