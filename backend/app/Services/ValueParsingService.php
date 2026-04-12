<?php

namespace App\Services;

use Carbon\Carbon;

class ValueParsingService
{
    public function normalizeNullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $string = trim((string) $value);
        $string = preg_replace('/\s+/u', ' ', $string);
        if ($string === null) {
            return null;
        }

        $emptyMarkers = ['n/a', 'na', 'null', 'none', '-', "\u{2014}", ''];
        if (in_array(mb_strtolower($string), $emptyMarkers, true)) {
            return null;
        }

        return $string;
    }

    public function toNumeric(mixed $value): ?float
    {
        $normalized = trim((string) $value);
        $normalized = str_replace(["\u{00A0}", ' '], '', $normalized);
        $normalized = preg_replace('/[$\x{20AC}\x{00A3}\x{00A5}%]/u', '', $normalized);
        $normalized = str_replace("'", '', $normalized);

        if ($normalized === null || $normalized === '') {
            return null;
        }

        $multiplier = 1.0;
        if (preg_match('/([kmb])$/i', $normalized, $suffixMatch) === 1) {
            $suffix = strtolower($suffixMatch[1]);
            $multiplier = match ($suffix) {
                'k' => 1_000.0,
                'm' => 1_000_000.0,
                'b' => 1_000_000_000.0,
                default => 1.0,
            };
            $normalized = substr($normalized, 0, -1);
            if ($normalized === '') {
                return null;
            }
        }

        $hasComma = str_contains($normalized, ',');
        $hasDot = str_contains($normalized, '.');

        if ($hasComma && $hasDot) {
            if (strrpos($normalized, ',') > strrpos($normalized, '.')) {
                $normalized = str_replace('.', '', $normalized);
                $normalized = str_replace(',', '.', $normalized);
            } else {
                $normalized = str_replace(',', '', $normalized);
            }
        } elseif ($hasComma) {
            if (preg_match('/,\d{1,2}$/', $normalized) === 1) {
                $normalized = str_replace(',', '.', $normalized);
            } else {
                $normalized = str_replace(',', '', $normalized);
            }
        }

        if (preg_match('/^-?\d+(\.\d+)?$/', $normalized) !== 1) {
            return null;
        }

        return (float) $normalized * $multiplier;
    }

    public function toBoolean(mixed $value): ?bool
    {
        $normalized = mb_strtolower(trim((string) $value));
        if ($normalized === '') {
            return null;
        }

        $truthy = ['1', 'true', 'yes', 'y', 'on', 'active', 'enabled'];
        $falsy = ['0', 'false', 'no', 'n', 'off', 'inactive', 'disabled'];

        if (in_array($normalized, $truthy, true)) {
            return true;
        }
        if (in_array($normalized, $falsy, true)) {
            return false;
        }

        return null;
    }

    public function parseTemporal(mixed $value): ?Carbon
    {
        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return null;
        }

        if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $trimmed, $matches) === 1) {
            return $this->buildDate((int) $matches[3], (int) $matches[2], (int) $matches[1]);
        }

        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $trimmed, $matches) === 1) {
            $dayFirst = $this->buildDate((int) $matches[3], (int) $matches[2], (int) $matches[1]);
            if ($dayFirst !== null) {
                return $dayFirst;
            }

            return $this->buildDate((int) $matches[3], (int) $matches[1], (int) $matches[2]);
        }

        if (preg_match('/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/', $trimmed, $matches) === 1) {
            return $this->buildDate((int) $matches[1], (int) $matches[2], (int) $matches[3]);
        }

        try {
            return Carbon::parse($trimmed);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function isDateTimeLikeString(mixed $value): bool
    {
        $string = trim((string) $value);
        if ($string === '') {
            return false;
        }

        return preg_match('/\d{1,2}:\d{2}/', $string) === 1
            || str_contains($string, 'T')
            || preg_match('/\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/', $string) === 1;
    }

    public function inferTemporalGranularity(array $parsedDates): ?string
    {
        if (empty($parsedDates)) {
            return null;
        }

        $hasTime = false;
        $hasSeconds = false;
        $hasDayVariation = false;
        $hasMonthVariation = false;

        $first = $parsedDates[0];
        foreach ($parsedDates as $date) {
            if ($date->format('H:i:s') !== '00:00:00') {
                $hasTime = true;
            }
            if ((int) $date->format('s') !== 0) {
                $hasSeconds = true;
            }
            if ((int) $date->format('d') !== (int) $first->format('d')) {
                $hasDayVariation = true;
            }
            if ((int) $date->format('m') !== (int) $first->format('m')) {
                $hasMonthVariation = true;
            }
        }

        if ($hasTime) {
            return $hasSeconds ? 'second' : 'minute';
        }
        if ($hasDayVariation) {
            return 'day';
        }
        if ($hasMonthVariation) {
            return 'month';
        }

        return 'year';
    }

    private function buildDate(int $year, int $month, int $day): ?Carbon
    {
        if (! checkdate($month, $day, $year)) {
            return null;
        }

        return Carbon::create($year, $month, $day, 0, 0, 0);
    }
}
