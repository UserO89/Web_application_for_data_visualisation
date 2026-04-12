<?php

$toCsvArray = static function (string $value): array {
    return array_values(array_filter(array_map('trim', explode(',', $value))));
};

$normalizeOrigin = static function (string $value): ?string {
    $origin = trim($value);
    if ($origin === '') {
        return null;
    }

    if (str_contains($origin, '://')) {
        $parsed = parse_url($origin);
        $scheme = is_array($parsed) ? trim((string) ($parsed['scheme'] ?? '')) : '';
        $host = is_array($parsed) ? trim((string) ($parsed['host'] ?? '')) : '';
        $port = is_array($parsed) ? ($parsed['port'] ?? null) : null;

        if ($scheme !== '' && $host !== '') {
            $normalized = strtolower($scheme).'://'.strtolower($host);
            if (is_int($port)) {
                $normalized .= ':'.$port;
            }

            return $normalized;
        }
    }

    return rtrim($origin, '/');
};

$allowedOrigins = array_values(array_filter(array_map(
    $normalizeOrigin,
    $toCsvArray((string) env('CORS_ALLOWED_ORIGINS', ''))
)));
$allowedOriginsPatterns = $toCsvArray((string) env('CORS_ALLOWED_ORIGIN_PATTERNS', ''));
$frontendUrl = trim((string) env('FRONTEND_URL', ''));

if (empty($allowedOrigins) && $frontendUrl !== '') {
    $normalizedFrontendOrigin = $normalizeOrigin($frontendUrl);
    if ($normalizedFrontendOrigin) {
        $allowedOrigins = [$normalizedFrontendOrigin];
    }
}

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
