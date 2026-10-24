<?php

/**
 * Args processor for the PHPUnit tests: appends its class name to the `processors` arg, and counts
 * its instances
 */
class RecordingArgsProcessor implements StorybookArgsProcessor
{
    /**
     * @var int
     */
    public static int $instances = 0;

    public function __construct()
    {
        static::$instances++;
    }

    /**
     * @param StorybookArgs $args Args
     * @return void
     */
    public function __invoke(StorybookArgs $args): void
    {
        $args['processors'] = array_merge((array)$args['processors'], [static::class]);
    }
}
