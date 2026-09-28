<?php

$student = \App\Models\User::where('name', 'Test Student 1')->first();
if ($student) {
    $student->email = 'prnks.chunian@gmail.com';
    $student->save();
    echo "Updated Test Student 1 email.\n";
} else {
    echo "Test Student 1 not found.\n";
}

$pending = \Illuminate\Support\Facades\DB::table('jobs')->count();
$failed = \Illuminate\Support\Facades\DB::table('failed_jobs')->count();

echo "Pending jobs: $pending\n";
echo "Failed jobs: $failed\n";
