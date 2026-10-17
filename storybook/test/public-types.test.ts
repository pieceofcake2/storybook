import { describe, expectTypeOf, it } from 'vitest';

import { template, type Meta, type StoryObj } from '../src/index.js';

describe('StoryObj', () => {
    it('takes the args from the type of the meta', () => {
        const meta = {
            component: 'components/button',
            args: { label: 'Apply', url: '/jobs/1' },
            argTypes: { variant: { control: 'inline-radio', options: ['primary', 'secondary'] } },
        } satisfies Meta;

        type Story = StoryObj<typeof meta>;

        // Args of the meta, and other args (e.g. those of argTypes)
        const story: Story = { args: { label: 'Back', variant: 'secondary' } };
        expectTypeOf(story.args).toEqualTypeOf<Story['args']>();
        expectTypeOf<NonNullable<Story['args']>['label']>().toEqualTypeOf<string | undefined>();

        // @ts-expect-error The args of the meta keep their types
        const invalid: Story = { args: { label: 1 } };
        void invalid;
    });

    it('takes the args from a meta without args, or with a template', () => {
        const meta = { component: template('alert_list') } satisfies Meta;

        const story: StoryObj<typeof meta> = { args: { alerts: [] } };
        void story;
    });

    it('takes the args from a meta with a render function', () => {
        const meta = {
            render: (args) => ({ element: 'components/button', args }),
            args: { label: 'Apply' },
        } satisfies Meta;

        const story: StoryObj<typeof meta> = { args: { label: 'Back', large: true } };
        void story;
    });

    it('still takes an args type', () => {
        type Story = StoryObj<{ label: string; title: string }>;

        const story: Story = { args: { label: 'Apply' } };
        void story;

        // @ts-expect-error Unknown args are not allowed with an args type
        const invalid: Story = { args: { variant: 'secondary' } };
        void invalid;
    });

    it('allows any args by default', () => {
        const story: StoryObj = { args: { label: 'Apply', count: 1 } };
        void story;
    });
});
