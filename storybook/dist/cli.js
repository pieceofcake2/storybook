#!/usr/bin/env node
// storybook-cakephp prerender --server <url> [--dir storybook-static]: see prerender/cli.ts
import { main } from './prerender/cli.js';
process.exitCode = await main(process.argv.slice(2), {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    env: process.env,
});
