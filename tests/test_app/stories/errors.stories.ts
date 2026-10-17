import type { Meta, StoryObj } from '@pieceofcake2/storybook';

// Stories that fail on purpose, to see how errors are shown (bin/test-static.mjs checks that the
// error is shown)
const meta = {
    title: 'Errors',
    tags: ['!test', '!autodocs', 'expect-error'],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotAllowedElement: Story = {
    render: () => ({ element: 'secret' }),
};

export const PhpWarning: Story = {
    render: () => ({ element: 'components/broken' }),
};
