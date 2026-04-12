<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use League\Csv\Reader;

class CsvImportService
{
    private const DEFAULT_MAX_DATA_ROWS = 5000;

    private const DEFAULT_MAX_COLUMNS = 100;

    public function parse(UploadedFile $file, string $delimiter = ',', bool $hasHeader = true): array
    {
        try {
            $csv = Reader::createFromPath($file->getRealPath(), 'r');
            $csv->setDelimiter($delimiter);

            $records = $csv->getRecords(); // iterable
            $rows = [];
            $rawRowCount = 0;
            $dataRowsChecked = 0;
            $maxColumnsDetected = 0;
            $maxDataRows = $this->resolveMaxDataRows();
            $maxColumns = $this->resolveMaxColumns();

            foreach ($records as $row) {
                $normalizedRow = is_array($row) ? array_values($row) : [];
                $rawRowCount++;
                $lineNumber = $rawRowCount;
                $columnCount = count($normalizedRow);
                $maxColumnsDetected = max($maxColumnsDetected, $columnCount);
                $isDataRow = ! $hasHeader || $rawRowCount > 1;
                $currentDataRowsChecked = $dataRowsChecked + ($isDataRow ? 1 : 0);

                if ($columnCount > $maxColumns) {
                    throw CsvImportLimitException::forTooManyColumns(
                        limit: $maxColumns,
                        detectedColumns: $columnCount,
                        lineNumber: $lineNumber,
                        dataRowsChecked: $currentDataRowsChecked
                    );
                }

                if ($isDataRow) {
                    $dataRowsChecked = $currentDataRowsChecked;
                    if ($dataRowsChecked > $maxDataRows) {
                        throw CsvImportLimitException::forTooManyRows(
                            limit: $maxDataRows,
                            detectedRows: $dataRowsChecked,
                            columnsDetected: $maxColumnsDetected
                        );
                    }
                }

                $rows[] = $normalizedRow;
            }
        } catch (CsvImportLimitException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw new \RuntimeException('Unable to parse uploaded CSV file.', previous: $e);
        }

        return [
            'rows' => $rows,
            'hasHeader' => $hasHeader,
        ];
    }

    private function resolveMaxDataRows(): int
    {
        $configured = (int) config('dataset_import.max_data_rows', self::DEFAULT_MAX_DATA_ROWS);

        return $configured > 0 ? $configured : self::DEFAULT_MAX_DATA_ROWS;
    }

    private function resolveMaxColumns(): int
    {
        $configured = (int) config('dataset_import.max_columns', self::DEFAULT_MAX_COLUMNS);

        return $configured > 0 ? $configured : self::DEFAULT_MAX_COLUMNS;
    }
}
