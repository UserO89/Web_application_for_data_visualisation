<?php

namespace App\Providers;

use Illuminate\Foundation\Console\ServeCommand;
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
}
