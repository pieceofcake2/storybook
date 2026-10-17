import type { Meta, StoryObj } from '@pieceofcake2/storybook';
import { expect, within } from 'storybook/test';

const meta = {
    title: 'Components/Button',
    component: 'components/button',
    args: {
        label: 'Apply',
        url: '/jobs/1',
    },
    argTypes: {
        variant: { control: 'inline-radio', options: ['primary', 'secondary'] },
    },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    play: async ({ canvasElement }) => {
        const link = within(canvasElement).getByRole('link', { name: 'Apply' });
        await expect(link).toHaveAttribute('href', '/jobs/1');
        await expect(link).toHaveClass('button', 'button--primary');
    },
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        label: 'Back <to the list>',
    },
    play: async ({ canvasElement }) => {
        // The label is escaped by HtmlHelper::link()
        await expect(within(canvasElement).getByRole('link')).toHaveTextContent('Back <to the list>');
    },
};
