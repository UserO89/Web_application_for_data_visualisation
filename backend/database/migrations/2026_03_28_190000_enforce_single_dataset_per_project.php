<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        $this->removeDuplicateDatasetsPerProject();

        Schema::table('datasets', function (Blueprint $table) {
            $table->unique('project_id', 'datasets_project_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('datasets', function (Blueprint $table) {
            $table->dropUnique('datasets_project_id_unique');
        });
    }

    /**
     * Keep the oldest dataset per project before adding the unique index.
     * This preserves existing valid projects and normalizes only invalid legacy duplicates.
     */
    private function removeDuplicateDatasetsPerProject(): void
    {
        $duplicateProjectIds = DB::table('datasets')
            ->select('project_id')
            ->groupBy('project_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('project_id');

        foreach ($duplicateProjectIds as $projectId) {
            $datasetIds = DB::table('datasets')
                ->where('project_id', $projectId)
                ->orderBy('id')
                ->pluck('id');

            $idsToDelete = $datasetIds->slice(1)->values()->all();

            if ($idsToDelete === []) {
                continue;
            }

            $filePathsToDelete = DB::table('datasets')
                ->whereIn('id', $idsToDelete)
                ->whereNotNull('file_path')
                ->pluck('file_path')
                ->filter(fn ($path) => is_string($path) && $path !== '')
                ->values()
                ->all();

            DB::table('datasets')
                ->whereIn('id', $idsToDelete)
                ->delete();

            if ($filePathsToDelete !== []) {
                Storage::disk('local')->delete($filePathsToDelete);
            }
        }
    }
};
