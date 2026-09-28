<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

App\Models\User::where('role_id', 2)->get()->each(function ($user, $index) {
    $user->update(['email' => 'shahbaz.appleid7070+' . $index . '@gmail.com']);
});
echo "All teachers updated with unique gmail aliases!\n";
