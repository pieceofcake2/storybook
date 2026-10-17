import type { Meta, StoryObj } from '@pieceofcake2/storybook';
import { element } from '@pieceofcake2/storybook';
import { expect, waitFor, within } from 'storybook/test';

const meta = {
    title: 'Components/Alert',
    component: element('components/alert'),
    args: {
        message: 'Your application has been sent.',
    },
    argTypes: {
        type: { control: 'select', options: ['info', 'success', 'danger'] },
    },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {
    play: async ({ canvasElement }) => {
        const alert = within(canvasElement).getByRole('alert');
        await expect(alert).toHaveTextContent('Your application has been sent.');
        // The DOMContentLoaded listener of assets/app.ts runs for the story
        await waitFor(() => expect(alert).toHaveAttribute('data-enhanced', 'true'));
    },
};

export const Success: Story = {
    args: { type: 'success' },
};

export const Danger: Story = {
    args: { type: 'danger', message: 'Failed to send <your application>.' },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('alert')).toHaveClass('alert--danger');
    },
};
