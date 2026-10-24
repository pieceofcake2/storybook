<?php

class StorybookArgsTest extends CakeTestCase
{
    public function testContext(): void
    {
        $args = new StorybookArgs(['label' => 'Apply'], 'components-button--primary', 'components/button');

        $this->assertSame('components-button--primary', $args->story());
        $this->assertSame('components/button', $args->element());
        $this->assertNull($args->template());

        $args = new StorybookArgs([], '', null, 'job_list');

        $this->assertSame('', $args->story());
        $this->assertNull($args->element());
        $this->assertSame('job_list', $args->template());
    }

    public function testGetSetHasRemove(): void
    {
        $args = new StorybookArgs(['label' => 'Apply', 'url' => null]);

        $this->assertSame('Apply', $args->get('label'));
        $this->assertNull($args->get('missing'));
        $this->assertSame('default', $args->get('missing', 'default'));
        $this->assertNull($args->get('url', 'default'));
        $this->assertTrue($args->has('url'));
        $this->assertFalse($args->has('missing'));

        $object = new DateTimeImmutable('2026-10-19');
        $args->set('date', $object);
        $this->assertSame($object, $args->get('date'));

        $args->remove('label');
        $args->remove('missing');
        $this->assertFalse($args->has('label'));
        $this->assertSame(['url' => null, 'date' => $object], $args->toArray());
    }

    public function testArrayAccess(): void
    {
        $args = new StorybookArgs(['label' => 'Apply', 'url' => null]);

        $this->assertSame('Apply', $args['label']);
        $this->assertNull($args['missing']);
        $this->assertTrue(isset($args['label']));
        // Like an array: isset() is false for null
        $this->assertFalse(isset($args['url']));
        $this->assertTrue($args->has('url'));

        $args['variant'] = 'secondary';
        unset($args['label']);

        $this->assertSame(['url' => null, 'variant' => 'secondary'], $args->toArray());
    }

    public function testIteratorAndCount(): void
    {
        $args = new StorybookArgs(['a' => 1, 'b' => 2]);

        $this->assertCount(2, $args);
        $this->assertSame(['a' => 1, 'b' => 2], iterator_to_array($args));
    }

    public function testMergeKeepsTheArgsThatAreSet(): void
    {
        $args = new StorybookArgs(['label' => 'Apply', 'url' => null]);

        $args->merge(['label' => 'Default', 'url' => '/', 'variant' => 'primary']);

        $this->assertSame(['label' => 'Apply', 'url' => null, 'variant' => 'primary'], $args->toArray());
    }

    public function testMergeWithOverride(): void
    {
        $args = new StorybookArgs(['label' => 'Apply', 'url' => null]);

        $args->merge(['label' => 'Default', 'variant' => 'primary'], true);

        $this->assertSame(['label' => 'Default', 'url' => null, 'variant' => 'primary'], $args->toArray());
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function invalidNameProvider(): array
    {
        return [
            'this' => ['this'],
            'starts with a digit' => ['1st'],
            'dash' => ['first-name'],
            'empty' => [''],
        ];
    }

    /**
     * @dataProvider invalidNameProvider
     * @param string $name
     */
    public function testSetWithInvalidNameThrows(string $name): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new StorybookArgs())->set($name, 'value');
    }

    /**
     * @dataProvider invalidNameProvider
     * @param string $name
     */
    public function testArrayAccessWithInvalidNameThrows(string $name): void
    {
        $this->expectException(InvalidArgumentException::class);

        $args = new StorybookArgs();
        $args[$name] = 'value';
    }

    public function testAppendThrows(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $args = new StorybookArgs();
        $args[] = 'value';
    }

    public function testMergeWithInvalidNameThrows(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid argument name "0".');

        (new StorybookArgs())->merge(['value']);
    }
}
