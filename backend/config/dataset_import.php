<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Dataset Import Limits
    |--------------------------------------------------------------------------
    |
    | Keep these limits conservative until the import pipeline is moved to
    | chunked/background processing. The current application loads full
    | datasets into memory more than once and also mirrors analysis rows to
    | the browser after import.
    |
    */
    'max_data_rows' => (int) env('DATASET_IMPORT_MAX_DATA_ROWS', 10000),
    'max_columns' => (int) env('DATASET_IMPORT_MAX_COLUMNS', 40),
    'column_insert_chunk_size' => (int) env('DATASET_IMPORT_COLUMN_INSERT_CHUNK_SIZE', 250),
    'row_insert_chunk_size' => (int) env('DATASET_IMPORT_ROW_INSERT_CHUNK_SIZE', 500),
];
