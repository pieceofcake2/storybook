import type { Meta, StoryObj } from '@pieceofcake2/storybook';
import { expect, within } from 'storybook/test';

const meta = {
    title: 'Components/Forms/Field',
    component: 'components/forms/field',
    args: {
        label: 'Name',
        value: 'Taro "Cake" Yamada',
    },
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByLabelText('Name')).toHaveValue('Taro "Cake" Yamada');
    },
};
