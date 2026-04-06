<?php

namespace Tests\Unit;

use App\Services\ValueParsingService;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class ValueParsingServiceTest extends TestCase
{
    private ValueParsingService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new ValueParsingService();
    }

    public function test_normalize_nullable_string_collapses_whitespace_and_recognizes_empty_markers(): void
    {
        $this->assertSame('North Region', $this->service->normalizeNullableString("  North \n Region  "));
        $this->assertNull($this->service->normalizeNullableString(null));
        $this->assertNull($this->service->normalizeNullableString('N/A'));
        $this->assertNull($this->service->normalizeNullableString(' — '));
    }

    public function test_to_numeric_supports_currency_percent_suffixes_and_localized_formats(): void
    {
        $this->assertSame(1234.56, $this->service->toNumeric('$1,234.56'));
        $this->assertSame(1234.56, $this->service->toNumeric('1.234,56'));
        $this->assertSame(2500.0, $this->service->toNumeric('2.5k'));
        $this->assertSame(3000000.0, $this->service->toNumeric('3m'));
        $this->assertSame(42.0, $this->service->toNumeric('42%'));
        $this->assertNull($this->service->toNumeric('not-a-number'));
        $this->assertNull($this->service->toNumeric('k'));
    }

    public function test_to_boolean_recognizes_truthy_and_falsy_markers(): void
    {
        $this->assertTrue($this->service->toBoolean('enabled'));
        $this->assertFalse($this->service->toBoolean('off'));
        $this->assertNull($this->service->toBoolean(''));
        $this->assertNull($this->service->toBoolean('maybe'));
    }

    public function test_parse_temporal_supports_multiple_formats_and_invalid_values(): void
    {
        $this->assertSame('2024-03-14 00:00:00', $this->service->parseTemporal('14.03.2024')?->format('Y-m-d H:i:s'));
        $this->assertSame('2024-05-31 00:00:00', $this->service->parseTemporal('31/05/2024')?->format('Y-m-d H:i:s'));
        $this->assertSame('2024-12-01 00:00:00', $this->service->parseTemporal('2024-12-01')?->format('Y-m-d H:i:s'));
        $this->assertSame('2024-01-01 10:15:30', $this->service->parseTemporal('2024-01-01T10:15:30')?->format('Y-m-d H:i:s'));
        $this->assertNull($this->service->parseTemporal('31.02.2024'));
        $this->assertNull($this->service->parseTemporal(''));
    }

    public function test_is_datetime_like_string_detects_time_patterns(): void
    {
        $this->assertTrue($this->service->isDateTimeLikeString('2024-01-01 10:15'));
        $this->assertTrue($this->service->isDateTimeLikeString('2024-01-01T10:15:30'));
        $this->assertFalse($this->service->isDateTimeLikeString('2024-01-01'));
        $this->assertFalse($this->service->isDateTimeLikeString(''));
    }

    public function test_infer_temporal_granularity_returns_expected_resolution(): void
    {
        $this->assertNull($this->service->inferTemporalGranularity([]));

        $yearDates = [Carbon::create(2024, 1, 1), Carbon::create(2024, 1, 1)];
        $monthDates = [Carbon::create(2024, 1, 1), Carbon::create(2024, 2, 1)];
        $dayDates = [Carbon::create(2024, 2, 1), Carbon::create(2024, 2, 2)];
        $minuteDates = [Carbon::create(2024, 1, 1, 10, 15, 0), Carbon::create(2024, 1, 1, 10, 16, 0)];
        $secondDates = [Carbon::create(2024, 1, 1, 10, 15, 1), Carbon::create(2024, 1, 1, 10, 15, 2)];

        $this->assertSame('year', $this->service->inferTemporalGranularity($yearDates));
        $this->assertSame('month', $this->service->inferTemporalGranularity($monthDates));
        $this->assertSame('day', $this->service->inferTemporalGranularity($dayDates));
        $this->assertSame('minute', $this->service->inferTemporalGranularity($minuteDates));
        $this->assertSame('second', $this->service->inferTemporalGranularity($secondDates));
    }
}
