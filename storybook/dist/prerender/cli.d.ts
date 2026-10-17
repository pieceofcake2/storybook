import { type PrerenderOptions, type PrerenderResult } from './prerender.js';
export type CliIO = {
    stdout: (text: string) => void;
    stderr: (text: string) => void;
    env: Record<string, string | undefined>;
    prerender?: (options: PrerenderOptions) => Promise<PrerenderResult>;
};
/**
 * Runs the command line of `storybook-cakephp` and returns the exit code.
 */
export declare const main: (argv: string[], io: CliIO) => Promise<number>;
