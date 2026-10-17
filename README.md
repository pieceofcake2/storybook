# Storybook for CakePHP 2

[![GitHub License](https://img.shields.io/github/license/pieceofcake2/storybook?label=License)](LICENSE)
[![Packagist Version](https://img.shields.io/packagist/v/pieceofcake2/storybook?label=Packagist)](https://packagist.org/packages/pieceofcake2/storybook)
![PHP](https://img.shields.io/packagist/dependency-v/pieceofcake2/storybook/php?logo=php&logoColor=%23FFFFFF&label=PHP&labelColor=%23777BB4&color=%23FFFFFF)
![CakePHP](https://img.shields.io/packagist/dependency-v/pieceofcake2/storybook/pieceofcake2/cakephp?logo=cakephp&logoColor=%23FFFFFF&label=CakePHP&labelColor=%23D33C43&color=%23FFFFFF)
[![PHPStan](https://img.shields.io/badge/PHPStan-level%205-brightgreen?label=PHPStan)](https://github.com/pieceofcake2/storybook/actions/workflows/CI.yml)
[![CI](https://img.shields.io/github/actions/workflow/status/pieceofcake2/storybook/CI.yml?label=CI)](https://github.com/pieceofcake2/storybook/actions/workflows/CI.yml)
[![Codecov](https://img.shields.io/codecov/c/gh/pieceofcake2/storybook?label=Coverage)](https://codecov.io/gh/pieceofcake2/storybook)

pieceofcake2/storybook renders the Elements of a CakePHP 2 application in
[Storybook](https://storybook.js.org/), in the same way as
[Storybook for Symfony](https://github.com/sensiolabs/StorybookBundle) renders Twig components.
A story names an Element and its args, Storybook sends them to the application, and the
application renders the Element with its own View class and helpers.

```ts
// stories/components/button.stories.ts
import type { Meta, StoryObj } from '@pieceofcake2/storybook';

const meta = {
    component: 'components/button', // templates/Elements/components/button.php
    args: { label: 'Apply', url: '/jobs/1' },
} satisfies Meta;

export default meta;

export const Primary: StoryObj<typeof meta> = {};
```

It consists of a CakePHP plugin, which provides the render endpoint (`POST /_storybook/render`,
disabled by default), and a Storybook framework that uses Vite (`@pieceofcake2/storybook`,
included in the Composer package).

## Documentation

- Website: https://pieceofcake2.github.io/storybook/ (日本語: https://pieceofcake2.github.io/storybook/ja/)
- Markdown: [docs/README.md](docs/README.md) (日本語: [docs/ja/README.md](docs/ja/README.md)) (for AI tools and offline reading)

The Markdown documentation is also included in the Composer package, in the plugin's directory: `plugins/Storybook/docs/README.md` (the location depends on your `installer-paths`).

## Requirements

* PHP 8.0+
* pieceofcake2/cakephp 2.12+
* Node.js 20.19+, Storybook 10 and Vite 5 to 8

## Installation

```bash
composer require pieceofcake2/storybook
npm install --save-dev storybook@^10 vite @pieceofcake2/storybook@file:plugins/Storybook/storybook
```

Then load the plugin with its routes, enable it where Storybook is used (never in production), and
configure `.storybook/main.ts`. See [Installation](docs/README.md#installation).

## Security

Only the name of an Element (under the allowed directories, `Elements/components/` by default) and
its args are sent to the application, never a template or code. The render endpoint is disabled
unless `Storybook.enabled` is true. See [Security](docs/README.md#security) and
[Disabling Storybook in Production](docs/README.md#production).

## Contributing

See the [contribution guidelines](https://github.com/pieceofcake2/.github/blob/master/CONTRIBUTING.md).

The Storybook framework is in [`storybook/`](storybook/README.md). Its build (`storybook/dist/`)
is committed, since applications install it from the Composer package without building it.

## Origin

This package was created by [pieceofcake2](https://github.com/pieceofcake2), which also maintains
it. Its design follows [Storybook for Symfony](https://github.com/sensiolabs/StorybookBundle)
(MIT License), but it does not include its code.

## License

MIT License. See [LICENSE](LICENSE).
