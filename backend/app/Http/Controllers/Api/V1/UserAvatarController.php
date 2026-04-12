<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class UserAvatarController extends Controller
{
    public function show(User $user)
    {
        if (! $user->avatar_path || ! Storage::disk('local')->exists($user->avatar_path)) {
            abort(404);
        }

        $path = Storage::disk('local')->path($user->avatar_path);
        $mime = Storage::disk('local')->mimeType($user->avatar_path) ?: 'application/octet-stream';

        return response()->file($path, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
