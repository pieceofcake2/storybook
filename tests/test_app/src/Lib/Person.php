<?php

/**
 * Value object of the test application, which Elements receive instead of an array (built from the
 * JSON args by PersonArgsProcessor)
 */
class Person
{
    /**
     * @param string $name Name
     * @param string $role Role
     * @param DateTimeImmutable $joined Date when the person joined
     */
    public function __construct(
        public string $name,
        public string $role,
        public DateTimeImmutable $joined,
    ) {
    }

    /**
     * Builds a person from an array (e.g. a row of the database, or the args of a story)
     *
     * @param array<string, mixed> $row `name`, `role` and `joined` (Y-m-d)
     * @return self
     * @throws InvalidArgumentException When a value is missing or invalid
     */
    public static function fromArray(array $row): self
    {
        foreach (['name', 'role', 'joined'] as $key) {
            if (!isset($row[$key]) || !is_string($row[$key])) {
                throw new InvalidArgumentException(sprintf('"%s" of a person must be a string.', $key));
            }
        }
        $joined = DateTimeImmutable::createFromFormat('!Y-m-d', $row['joined']);
        if ($joined === false) {
            throw new InvalidArgumentException(sprintf('Invalid date "%s".', $row['joined']));
        }

        return new self($row['name'], $row['role'], $joined);
    }
}
