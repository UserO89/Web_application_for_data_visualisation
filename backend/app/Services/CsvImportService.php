<?php

namespace App\Services;

use League\Csv\Reader;
use Illuminate\Http\UploadedFile;

class CsvImportService
{
    public function parse(UploadedFile $file, string $delimiter = ',', bool $hasHeader = true): array
    {
        try {
            $csv = Reader::createFromPath($file->getRealPath(), 'r');
            $csv->setDelimiter($delimiter);

            $records = $csv->getRecords(); // iterable
            $rows = [];
            foreach ($records as $row) {
                $rows[] = $row;
            }
        } catch (\Throwable $e) {
            throw new \RuntimeException('Unable to parse uploaded CSV file.', previous: $e);
        }

        return [
            'rows' => $rows,
            'hasHeader' => $hasHeader,
        ];
    }
}
