<?php

$toCsvArray = static function (string $value): array {
    return array_values(array_filter(array_map('trim', explode(',', $value))));
};

$allowedOrigins = $toCsvArray((string) env('CORS_ALLOWED_ORIGINS', ''));
$allowedOriginsPatterns = $toCsvArray((string) env('CORS_ALLOWED_ORIGIN_PATTERNS', ''));

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => $allowedOriginsPatterns,

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => filter_var(
        env('CORS_SUPPORTS_CREDENTIALS', true),
        FILTER_VALIDATE_BOOL,
        FILTER_NULL_ON_FAILURE
    ) ?? true,

];
