/**
 * Error returned by the CakePHP application (a 4xx or 5xx response).
 */
export declare class CakePHPRenderingError extends Error {
    readonly title: string;
    readonly errorPage: string;
    readonly status: number;
    constructor(title: string, errorPage: string, status: number);
}
