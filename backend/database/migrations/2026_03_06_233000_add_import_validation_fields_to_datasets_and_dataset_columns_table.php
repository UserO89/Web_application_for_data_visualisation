<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('datasets', function (Blueprint $table) {
            $table->json('import_summary_json')->nullable()->after('has_header');
            $table->json('validation_report_json')->nullable()->after('import_summary_json');
        });

        Schema::table('dataset_columns', function (Blueprint $table) {
            $table->json('quality_json')->nullable()->after('profile_json');
        });
    }

    public function down(): void
    {
        Schema::table('dataset_columns', function (Blueprint $table) {
            $table->dropColumn('quality_json');
        });

        Schema::table('datasets', function (Blueprint $table) {
            $table->dropColumn([
                'import_summary_json',
                'validation_report_json',
            ]);
        });
    }
};
