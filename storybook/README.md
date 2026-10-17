# @pieceofcake2/storybook

The Storybook framework (Vite builder) of [pieceofcake2/storybook](https://github.com/pieceofcake2/storybook):
it renders CakePHP 2 Elements with the CakePHP application.

It is not published to npm: install it from the Composer package.

```json
{
    "devDependencies": {
        "@pieceofcake2/storybook": "file:vendor/pieceofcake2/storybook/storybook"
    }
}
```

It also provides the `storybook-cakephp prerender` command, which pre-renders the stories of a
Storybook build with the application, so that the build can be published as static files.

See the [documentation](https://github.com/pieceofcake2/storybook/blob/1.x/docs/README.md).

## Development

```bash
npm ci
npm test           # Vitest
npm run typecheck  # tsc
npm run build      # tsc, writes dist/ (committed)
```

The built `dist/` is committed, since the package is installed from the Composer package without
a build step. CI checks that it is up to date.
