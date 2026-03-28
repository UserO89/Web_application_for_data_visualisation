<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();

        if ($this->app->runningInConsole() && PHP_OS_FAMILY === 'Windows') {
            foreach ([
                'SystemRoot',
                'ComSpec',
                'COMSPEC',
                'WINDIR',
                'SystemDrive',
                'TEMP',
                'TMP',
                'PATHEXT',
            ] as $variable) {
                if (!in_array($variable, ServeCommand::$passthroughVariables, true)) {
                    ServeCommand::$passthroughVariables[] = $variable;
                }
            }
        }
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('auth-login', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email', '')));
            $identity = $email !== '' ? $email : 'guest';

            return Limit::perMinute(5)->by($identity . '|' . $request->ip());
        });

        RateLimiter::for('auth-register', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email', '')));
            $identity = $email !== '' ? $email : 'guest';

            return Limit::perMinute(3)->by($identity . '|' . $request->ip());
        });

        RateLimiter::for('project-import', function (Request $request) {
            $project = $request->route('project');
            $projectId = is_object($project) && method_exists($project, 'getKey')
                ? (string) $project->getKey()
                : (string) $project;
            $userEmail = strtolower((string) ($request->user()?->email ?? ''));
            $scope = $userEmail !== ''
                ? 'user:' . $userEmail
                : 'ip:' . $request->ip();

            return Limit::perMinute(5)->by($scope . '|project:' . $projectId);
        });
    }
}
