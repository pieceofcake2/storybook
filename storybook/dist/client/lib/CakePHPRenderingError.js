/**
 * Error returned by the CakePHP application (a 4xx or 5xx response).
 */
export class CakePHPRenderingError extends Error {
    title;
    errorPage;
    status;
    constructor(title, errorPage, status) {
        super(title);
        this.title = title;
        this.errorPage = errorPage;
        this.status = status;
        this.name = 'CakePHPRenderingError';
    }
}
