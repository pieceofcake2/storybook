import type { Preview } from '@pieceofcake2/storybook';

// The CSS and the JavaScript of the application, processed by Vite (with HMR in storybook dev)
import '../assets/app.ts';

const preview: Preview = {
    tags: ['autodocs'],
};

export default preview;
