<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('datasets', function (Blueprint $table) {
            $table->json('statistics_json')->nullable()->after('validation_report_json');
            $table->dateTime('statistics_generated_at')->nullable()->after('statistics_json');
        });
    }

    public function down(): void
    {
        Schema::table('datasets', function (Blueprint $table) {
            $table->dropColumn([
                'statistics_json',
                'statistics_generated_at',
            ]);
        });
    }
};
