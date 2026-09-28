<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::capture();
$kernel->handle($request);
$routes = app('router')->getRoutes()->getRoutes();
$output = [];
foreach ($routes as $route) {
    $output[] = $route->methods()[0] . ' ' . $route->uri();
}
echo json_encode($output);
