// Entry of the assets of the test application, imported in .storybook/preview.ts
import './app.css';

// Scripts that run on DOMContentLoaded run again for each story (simulatePageLoad)
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll<HTMLElement>('.alert').forEach((alert) => {
        alert.dataset.enhanced = 'true';
    });
});
