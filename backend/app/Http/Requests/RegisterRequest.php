<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'locale' => ['sometimes', 'string', Rule::in(config('app.supported_locales', ['en', 'sk', 'ru', 'uk']))],
        ];
    }

    public function createUser(): User
    {
        $data = $this->validated();
        $data['password'] = Hash::make($data['password']);
        $data['locale'] = $data['locale'] ?? app()->getLocale();

        return User::create($data);
    }
}
