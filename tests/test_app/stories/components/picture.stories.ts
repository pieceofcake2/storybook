import type { Meta, StoryObj } from '@pieceofcake2/storybook';
import { expect, waitFor, within } from 'storybook/test';

// An asset imported by the story: its URL is resolved by Vite (an absolute URL under the Storybook
// in a build). ?no-inline keeps Vite from inlining the small image as a data: URL.
import cake from '../../assets/images/cake.svg?no-inline';

const meta = {
    title: 'Components/Picture',
    component: 'components/picture',
    args: {
        src: cake,
        caption: 'A cake',
    },
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
    play: async ({ canvasElement }) => {
        const image = within(canvasElement).getByRole<HTMLImageElement>('img', { name: 'A cake' });
        await expect(image.src).toBe(new URL(cake, document.baseURI).href);
        await waitFor(() => expect(image.complete && image.naturalWidth).toBe(120));
    },
};
