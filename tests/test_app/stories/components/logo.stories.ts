import type { Meta, StoryObj } from '@pieceofcake2/storybook';
import { expect, waitFor, within } from 'storybook/test';

const meta = {
    title: 'Components/Logo',
    component: 'components/logo',
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
    play: async ({ canvasElement }) => {
        const image = within(canvasElement).getByRole<HTMLImageElement>('img', { name: 'Logo' });
        await expect(image).toHaveAttribute('src', '/img/logo.svg');
        // The image is served by the application (same origin, or proxied in storybook dev)
        await waitFor(() => expect(image.complete && image.naturalWidth).toBe(64));
    },
};
