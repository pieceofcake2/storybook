/**
 * Error returned by the CakePHP application (a 4xx or 5xx response).
 */
export class CakePHPRenderingError extends Error {
    constructor(
        public readonly title: string,
        public readonly errorPage: string,
        public readonly status: number
    ) {
        super(title);
        this.name = 'CakePHPRenderingError';
    }
}
