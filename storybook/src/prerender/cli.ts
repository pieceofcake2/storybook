import { parseArgs } from 'node:util';

import { prerender as runPrerender, PrerenderError, type PrerenderOptions, type PrerenderResult } from './prerender.js';

const USAGE = `Usage: storybook-cakephp prerender --server <url> [options]

Pre-renders all the stories of a Storybook build with the CakePHP application (running in debug
mode), so that the build is static and can be deployed without the application.

Options:
  --server <url>       URL of the CakePHP application (required), e.g. http://127.0.0.1:8765
  --dir <dir>          Directory of the Storybook build (default: storybook-static)
  --browser <browser>  chrome (default), msedge, ... (an installed browser), chromium (the Chromium
                       of Playwright), or the path of a Chrome or Chromium executable
  --concurrency <n>    Number of stories rendered at the same time (default: 4)
  --timeout <ms>       Timeout of a story (default: 30000)
  -h, --help           Shows this help
`;

class UsageError extends Error {}

const positiveInteger = (value: string, name: string): number => {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1) {
        throw new UsageError(`--${name} must be a positive integer.`);
    }

    return number;
};

export type CliIO = {
    stdout: (text: string) => void;
    stderr: (text: string) => void;
    env: Record<string, string | undefined>;
    prerender?: (options: PrerenderOptions) => Promise<PrerenderResult>;
};

/**
 * Runs the command line of `storybook-cakephp` and returns the exit code.
 */
export const main = async (argv: string[], io: CliIO): Promise<number> => {
    try {
        return await run(argv, io);
    } catch (error) {
        if (error instanceof UsageError) {
            io.stderr(`storybook-cakephp: ${error.message}\n\n${USAGE}`);

            return 2;
        }
        throw error;
    }
};

const run = async (argv: string[], io: CliIO): Promise<number> => {
    const prerender = io.prerender ?? runPrerender;
    let parsed;
    try {
        parsed = parseArgs({
            args: argv,
            allowPositionals: true,
            options: {
                server: { type: 'string' },
                dir: { type: 'string', default: 'storybook-static' },
                browser: { type: 'string', default: io.env.STORYBOOK_CAKEPHP_BROWSER || 'chrome' },
                concurrency: { type: 'string', default: '4' },
                timeout: { type: 'string', default: '30000' },
                help: { type: 'boolean', short: 'h' },
            },
        });
    } catch (error) {
        throw new UsageError(error instanceof Error ? error.message : String(error));
    }
    const { values, positionals } = parsed;
    if (values.help) {
        io.stdout(USAGE);

        return 0;
    }
    if (positionals[0] !== 'prerender' || positionals.length > 1) {
        throw new UsageError(positionals.length === 0 ? 'A command is required.' : `Unknown command "${positionals.join(' ')}".`);
    }
    if (values.server === undefined || !/^https?:\/\//.test(values.server)) {
        throw new UsageError('--server must be the URL of the CakePHP application (http:// or https://).');
    }

    const concurrency = positiveInteger(values.concurrency, 'concurrency');
    const timeout = positiveInteger(values.timeout, 'timeout');

    try {
        const result = await prerender({
            server: values.server,
            dir: values.dir,
            browser: values.browser,
            concurrency,
            timeout,
            log: (message) => io.stdout(`${message}\n`),
        });
        io.stdout(
            `\nPre-rendered ${result.stories} stories (${result.renders} renders) into ${values.dir}/cakephp-prerendered/\n`
        );
        for (const { id, message } of result.warnings) {
            io.stdout(`warning - ${id}: ${message}\n`);
        }
        if (result.failures.length > 0) {
            io.stderr(`\n${result.failures.length} stories could not be pre-rendered:\n`);
            for (const { id, message } of result.failures) {
                io.stderr(`  ${id}: ${message}\n`);
            }

            return 1;
        }

        return 0;
    } catch (error) {
        io.stderr(`storybook-cakephp: ${error instanceof PrerenderError ? error.message : String(error)}\n`);

        return 1;
    }
};
