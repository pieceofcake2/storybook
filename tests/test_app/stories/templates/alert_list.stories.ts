import type { Meta, StoryObj } from '@pieceofcake2/storybook';
import { template } from '@pieceofcake2/storybook';
import { expect, within } from 'storybook/test';

// A story template (templates/Stories/alert_list.ctp) that combines Elements
const meta = {
    title: 'Templates/Alert List',
    component: template('alert_list'),
    args: {
        alerts: [
            { message: 'Saved.', type: 'success' },
            { message: 'Check the form.', type: 'danger' },
        ],
    },
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getAllByRole('alert')).toHaveLength(2);
    },
};
