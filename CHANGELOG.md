# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/pieceofcake2/storybook/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/pieceofcake2/storybook/releases/tag/v1.0.0
