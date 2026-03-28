<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\DatasetImportController;
use App\Http\Controllers\Api\V1\DatasetRowController;
use App\Http\Controllers\Api\V1\DatasetSchemaController;
use App\Http\Controllers\Api\V1\DatasetStatisticsController;
use App\Http\Controllers\Api\V1\DatasetSuggestionController;
use App\Http\Controllers\Api\V1\ProjectChartController;
use App\Http\Controllers\Api\V1\UserAvatarController;

Route::prefix('v1')->group(function () {
    Route::get('/users/{user}/avatar', [UserAvatarController::class, 'show']);

    // Auth (SPA via Sanctum) — web middleware explicitly includes session, so we don't depend on Referer
    Route::middleware('web')->group(function () {
        Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
        Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::patch('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::patch('/auth/password', [AuthController::class, 'updatePassword']);
        Route::delete('/auth/account', [AuthController::class, 'destroyAccount']);
        Route::post('/auth/avatar', [AuthController::class, 'uploadAvatar']);

        // Projects
        Route::get('/projects', [ProjectController::class, 'index']);
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::get('/projects/{project}', [ProjectController::class, 'show']);
        Route::patch('/projects/{project}', [ProjectController::class, 'update']);
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

        // Import CSV -> attach the project's single dataset (one-time import)
        Route::post('/projects/{project}/import', [DatasetImportController::class, 'import'])
            ->middleware('throttle:project-import');

        // Rows (table UI)
        Route::get('/projects/{project}/rows', [DatasetRowController::class, 'index']);
        Route::patch('/projects/{project}/rows/{row}', [DatasetRowController::class, 'update']);

        // Semantic schema + manual overrides
        Route::get('/projects/{project}/schema', [DatasetSchemaController::class, 'show']);
        Route::patch('/projects/{project}/columns/{column}/semantic-type', [DatasetSchemaController::class, 'updateSemanticType']);
        Route::patch('/projects/{project}/columns/{column}/ordinal-order', [DatasetSchemaController::class, 'updateOrdinalOrder']);

        // Stats + Suggestions
        Route::get('/projects/{project}/statistics', [DatasetStatisticsController::class, 'show']);
        Route::get('/projects/{project}/chart-suggestions', [DatasetSuggestionController::class, 'index']);

        // Saved chart library
        Route::get('/projects/{project}/charts', [ProjectChartController::class, 'index']);
        Route::post('/projects/{project}/charts', [ProjectChartController::class, 'store']);
        Route::patch('/projects/{project}/charts/{chart}', [ProjectChartController::class, 'update']);
        Route::delete('/projects/{project}/charts/{chart}', [ProjectChartController::class, 'destroy']);

        Route::prefix('admin')->middleware('admin')->group(function () {
            Route::get('/stats', [AdminController::class, 'stats']);
            Route::get('/users', [AdminController::class, 'users']);
            Route::patch('/users/{user}', [AdminController::class, 'updateUser']);
            Route::delete('/users/{user}', [AdminController::class, 'destroyUser']);
            Route::post('/users/{user}/projects', [AdminController::class, 'storeUserProject']);
            Route::patch('/users/{user}/projects/{project}', [AdminController::class, 'updateUserProject']);
            Route::delete('/users/{user}/projects/{project}', [AdminController::class, 'destroyUserProject']);
        });
    });
});
