<?php

namespace App\Services;

class ColumnTypeInferenceService
{
    public function __construct(
        private ValueParsingService $valueParsingService
    ) {}

    public function infer(array $rows, bool $hasHeader = true): array
    {
        if (empty($rows)) {
            return [];
        }

        $firstRow = $rows[0];
        $columnCount = count($firstRow);
        $columns = [];

        if ($hasHeader) {
            $headers = $firstRow;
            $dataRows = array_slice($rows, 1);
        } else {
            $headers = array_map(fn ($i) => 'Column '.($i + 1), range(0, $columnCount - 1));
            $dataRows = $rows;
        }

        for ($i = 0; $i < $columnCount; $i++) {
            $values = array_column($dataRows, $i);
            $legacyType = $this->detectLegacyType($values);
            $physicalType = $this->inferPhysicalType($values, $legacyType);

            $columns[] = [
                'name' => $headers[$i] ?? 'Column '.($i + 1),
                // Keep legacy field for compatibility with existing import validation logic.
                'type' => $legacyType,
                'physical_type' => $physicalType,
            ];
        }

        return $columns;
    }

    private function detectLegacyType(array $values): string
    {
        $nonEmpty = array_values(array_filter(
            array_map(fn ($v) => $this->valueParsingService->normalizeNullableString($v), $values),
            fn ($v) => $v !== null && $v !== ''
        ));

        if (empty($nonEmpty)) {
            return 'string';
        }

        $numericCount = 0;
        $floatCount = 0;
        foreach ($nonEmpty as $value) {
            $numeric = $this->valueParsingService->toNumeric($value);
            if ($numeric !== null) {
                $numericCount++;
                if (floor($numeric) !== $numeric) {
                    $floatCount++;
                }
            }
        }

        if ($numericCount / count($nonEmpty) >= 0.7) {
            return $floatCount > 0 ? 'float' : 'integer';
        }

        $dateCount = 0;
        foreach ($nonEmpty as $value) {
            if (! $this->looksDateLike((string) $value)) {
                continue;
            }
            if ($this->valueParsingService->parseTemporal($value) !== null) {
                $dateCount++;
            }
        }
        if ($dateCount / count($nonEmpty) >= 0.7) {
            return 'date';
        }

        return 'string';
    }

    private function inferPhysicalType(array $values, string $legacyType): string
    {
        if ($legacyType === 'integer' || $legacyType === 'float') {
            return 'number';
        }
        if ($legacyType === 'date') {
            $withTime = 0;
            $dateLike = 0;
            foreach ($values as $value) {
                $normalized = $this->valueParsingService->normalizeNullableString($value);
                if ($normalized === null) {
                    continue;
                }
                if ($this->valueParsingService->parseTemporal($normalized) !== null) {
                    $dateLike++;
                    if ($this->valueParsingService->isDateTimeLikeString($normalized)) {
                        $withTime++;
                    }
                }
            }
            if ($dateLike > 0 && ($withTime / $dateLike) >= 0.2) {
                return 'datetime';
            }

            return 'date';
        }

        $nonNull = array_values(array_filter(
            array_map(fn ($value) => $this->valueParsingService->normalizeNullableString($value), $values),
            fn ($value) => $value !== null
        ));
        if (empty($nonNull)) {
            return 'unknown';
        }

        $boolCount = 0;
        foreach ($nonNull as $value) {
            if ($this->valueParsingService->toBoolean($value) !== null) {
                $boolCount++;
            }
        }
        if (($boolCount / count($nonNull)) >= 0.95) {
            return 'boolean';
        }

        return 'string';
    }

    private function looksDateLike(string $value): bool
    {
        $trimmed = trim($value);
        if (preg_match('/^\d{4}$/', $trimmed) === 1) {
            return false;
        }

        return preg_match('/[-\/.:T]/', $trimmed) === 1 || preg_match('/[a-zA-Z]{3,}/', $trimmed) === 1;
    }
}
