# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
