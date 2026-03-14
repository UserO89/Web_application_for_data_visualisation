<?php

namespace App\Services\DatasetValidation;

trait BuildsValidationIssue
{
    private function makeIssue(
        string $severity,
        string $code,
        string $message,
        string $targetLevel,
        array $target = [],
        array $metadata = []
    ): array {
        $resolvedTarget = ['level' => $targetLevel];
        if ($targetLevel === 'column') {
            $resolvedTarget['column'] = $target['column'] ?? null;
            $resolvedTarget['columnIndex'] = $target['column_index'] ?? null;
        }
        if ($targetLevel === 'row') {
            $resolvedTarget['row'] = $target['row'] ?? null;
            $resolvedTarget['column'] = $target['column'] ?? null;
            $resolvedTarget['columnIndex'] = $target['column_index'] ?? null;
        }

        $targetIdentifier = $target['column'] ?? ($target['row'] ?? 'dataset');

        return [
            'severity' => $severity,
            'code' => $code,
            'message' => $message,
            'target' => $resolvedTarget,
            'target_level' => $targetLevel,
            'target_identifier' => $targetIdentifier,
            'metadata' => $metadata,
            'row' => $target['row'] ?? null,
            'column' => $target['column'] ?? null,
        ];
    }
}
