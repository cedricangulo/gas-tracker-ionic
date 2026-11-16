<?php
declare(strict_types=1);

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class ValidationTest extends TestCase
{
    /** @return array<string, mixed> */
    private function settings(): array
    {
        return [
            'name' => 'Honda Click 125i V4',
            'tankCapacity' => 5.5,
            'gaugeSegments' => 6,
            'lowFuelAnchor' => 1.2,
            'factoryWMTC' => 50,
            'stations' => ['Uno'],
            'grades' => ['Unleaded'],
        ];
    }
    /** @return array<string, mixed> */
    private function fill(): array
    {
        return [
            'id' => 'b7724ad8-13a5-4396-8423-ddbf4ba130ad',
            'amount' => 200,
            'liters' => 4,
            'odometer' => 1000,
            'dateTime' => '2026-11-06T10:00:00+08:00',
            'station' => null,
            'grade' => null,
            'gaugeLevel' => 6,
            'filledToFull' => true,
            'latitude' => 14.5995,
            'longitude' => 120.9842,

            'createdAt' => 1,
        ];
    }
    public function testValidFillPreservesRecordedDateAndCoordinates(): void
    {
        $fill = validate_fill($this->fill(), $this->settings());
        self::assertSame('2026-11-06T10:00:00+08:00', $fill['dateTime']);
        self::assertSame(14.5995, $fill['latitude']);
        self::assertTrue($fill['filledToFull']);
    }
    public function testMissingOptionalReadingsRemainNull(): void
    {
        $input = $this->fill();
        foreach (['liters', 'odometer', 'gaugeLevel', 'latitude', 'longitude'] as $key) {
            $input[$key] = null;
        }
        $fill = validate_fill($input, $this->settings());
        self::assertNull($fill['liters']);
        self::assertNull($fill['odometer']);
        self::assertNull($fill['gaugeLevel']);
    }
    /** @return iterable<string, array{string, mixed}> */
    public static function invalidFills(): iterable
    {
        yield 'negative amount' => ['amount', -1];
        yield 'zero liters' => ['liters', 0];
        yield 'negative odometer' => ['odometer', -1];
        yield 'too many bars' => ['gaugeLevel', 7];
        yield 'fractional bars' => ['gaugeLevel', 2.5];
        yield 'impossible date' => ['dateTime', '2026-02-30T10:00:00+08:00'];
        yield 'missing offset' => ['dateTime', '2026-11-06T10:00:00'];
        yield 'invalid latitude' => ['latitude', 91];
        yield 'half coordinates' => ['longitude', null];
        yield 'invalid full flag' => ['filledToFull', 'yes'];
    }
    #[DataProvider('invalidFills')]
    public function testInvalidFillIsRejected(string $key, mixed $value): void
    {
        $input = $this->fill();
        $input[$key] = $value;
        $this->expectException(InputError::class);
        validate_fill($input, $this->settings());
    }
    public function testInvalidCalibrationIsRejected(): void
    {
        $input = $this->settings();
        $input['lowFuelAnchor'] = 6;
        $this->expectException(InputError::class);
        validate_settings($input);
    }
    public function testCalibrationMustRemainValidAtDatabasePrecision(): void
    {
        $input = $this->settings();
        $input['tankCapacity'] = 5.504;
        $input['lowFuelAnchor'] = 5.502;
        $this->expectException(InputError::class);
        validate_settings($input);
    }
    public function testCatalogNamesAreTrimmedAndDeduplicated(): void
    {
        self::assertSame(['Uno', 'Shell'], catalog([' Uno ', 'uno', 'Shell'], 'stations'));
    }
    public function testCatalogKeepsAccentDistinctNames(): void
    {
        self::assertSame(['Cafe', 'Café'], catalog(['Cafe', 'Café'], 'stations'));
    }
    public function testOdometerPlacementChecksBothNeighbors(): void
    {
        $previous = $this->fill();
        $candidate = [
            ...$previous,
            'id' => 'second',
            'dateTime' => '2026-11-07T10:00:00+08:00',
            'odometer' => 900,
        ];
        $this->expectException(InputError::class);
        validate_placement([$previous], $candidate);
    }
    public function testUuidRejectsNonUuidInput(): void
    {
        $this->expectException(InputError::class);
        uuid('../../config.php');
    }
}
