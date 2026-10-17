import type { Meta, StoryObj } from '@pieceofcake2/storybook';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

const meta = {
    title: 'Components/Counter',
    component: 'components/counter',
    args: {
        count: 2,
        // Called by the `increment` event of the element with data-storybook-callbacks="increment"
        increment: fn(),
    },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        // The <script> of the Element runs
        await waitFor(() => expect(canvasElement.querySelector('.counter')).toHaveAttribute('data-ready', 'true'));

        await userEvent.click(canvas.getByRole('button', { name: '+1' }));

        await expect(canvas.getByRole('status')).toHaveTextContent('3');
        await expect(args.increment).toHaveBeenCalledTimes(1);
    },
};
