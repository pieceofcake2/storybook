import type { Meta, StoryObj } from '@pieceofcake2/storybook';
import { template } from '@pieceofcake2/storybook';
import { expect, within } from 'storybook/test';

// A story template (templates/Stories/person_list.ctp) that receives Person objects, built by the
// args processors of the test application
const meta = {
    title: 'Templates/Person List',
    component: template('person_list'),
    args: {
        people: [
            { name: 'Taro Yamada', role: 'Concierge', joined: '2021-10-01' },
            { name: 'Hanako Suzuki', role: 'Chef', joined: '2019-04-01' },
        ],
    },
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getAllByRole('heading')).toHaveLength(2);
        await expect(within(canvasElement).getByText('Since April 2019')).toBeInTheDocument();
    },
};
