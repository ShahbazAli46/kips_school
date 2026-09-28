<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

Route::get('/', function () {
    return view('welcome');
});


Route::get('/magic-setup', function () {
    try {
        Artisan::call('migrate:fresh', [
            '--seed' => true,
            '--force' => true
        ]);
        return "SUCCESS! Database tables created and Super Admin seeded!";
    } catch (\Exception $e) {
        return "ERROR: " . $e->getMessage();
    }
});

Route::get('/run-migrate', function () {
    try {
        Artisan::call('migrate', ['--force' => true]);
        return 'Migrations Output: <pre>' . Artisan::output() . '</pre>';
    } catch (\Exception $e) {
        return 'ERROR: ' . $e->getMessage();
    }
});

Route::get('/clear-cache', function () {
    try {
        Artisan::call('config:clear');
        Artisan::call('cache:clear');
        Artisan::call('route:clear');
        return 'Cache cleared successfully!';
    } catch (\Exception $e) {
        return 'ERROR: ' . $e->getMessage();
    }
});

Route::get('/link-storage', function () {
    try {
        Artisan::call('storage:link');
        return 'Storage linked successfully!';
    } catch (\Exception $e) {
        return 'ERROR: ' . $e->getMessage();
    }
});
