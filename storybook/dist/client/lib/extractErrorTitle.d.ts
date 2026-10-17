/**
 * Decodes the HTML entities written by `h()`.
 */
export declare const decodeEntities: (text: string) => string;
/**
 * Extracts the error message from the first line of an error response (`<!-- message -->`).
 */
export declare const extractErrorTitle: (html: string, fallback?: string) => string;
