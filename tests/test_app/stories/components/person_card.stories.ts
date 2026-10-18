import type { Meta, StoryObj } from '@pieceofcake2/storybook';
import { element } from '@pieceofcake2/storybook';
import { expect, within } from 'storybook/test';

// An Element that receives a Person object: the JSON args are turned into it by the args
// processors of the test application (Storybook.argsProcessors in config/bootstrap.php)
const meta = {
    title: 'Components/Person Card',
    component: element('components/person_card'),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        person: { name: 'Taro Yamada', role: 'Concierge', joined: '2021-10-01' },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('heading', { name: 'Taro Yamada' })).toBeInTheDocument();
        // Formatted by the DateTimeImmutable of the Person
        await expect(canvas.getByText('Since October 2021')).toBeInTheDocument();
    },
};

// DefaultPersonArgsProcessor (scoped to this story) sets the person
export const DefaultPerson: Story = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    },
};
