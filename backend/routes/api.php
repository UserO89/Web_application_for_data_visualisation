<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\DatasetImportController;
use App\Http\Controllers\Api\V1\DatasetRowController;
use App\Http\Controllers\Api\V1\DatasetStatisticsController;
use App\Http\Controllers\Api\V1\DatasetSuggestionController;
use App\Http\Controllers\Api\V1\UserAvatarController;

Route::prefix('v1')->group(function () {
    Route::get('/users/{user}/avatar', [UserAvatarController::class, 'show']);

    // Auth (SPA via Sanctum) — web middleware explicitly includes session, so we don't depend on Referer
    Route::middleware('web')->group(function () {
        Route::post('/auth/register', [AuthController::class, 'register']);
        Route::post('/auth/login', [AuthController::class, 'login']);
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

        // Import CSV -> attach dataset to project
        Route::post('/projects/{project}/import', [DatasetImportController::class, 'import']);

        // Rows (table UI)
        Route::get('/projects/{project}/rows', [DatasetRowController::class, 'index']);
        Route::patch('/projects/{project}/rows/{row}', [DatasetRowController::class, 'update']);

        // Stats + Suggestions
        Route::get('/projects/{project}/statistics', [DatasetStatisticsController::class, 'show']);
        Route::get('/projects/{project}/suggest-visualizations', [DatasetSuggestionController::class, 'index']);
    });
});
