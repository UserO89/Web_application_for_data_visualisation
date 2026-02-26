<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function register(RegisterRequest $request)
    {
        $user = $request->createUser();

        // SPA mode: session-based, so just log in
        Auth::login($user);

        return response()->json(['user' => $user]);
    }

    public function login(LoginRequest $request)
    {
        if (!Auth::attempt($request->validated())) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json(['user' => $request->user()]);
    }

    public function logout(Request $request)
    {
        if (Auth::guard('web')->check()) {
            Auth::guard('web')->logout();
        }

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['ok' => true]);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $request->user()]);
    }
}
