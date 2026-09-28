<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Insert standard roles
        \Illuminate\Support\Facades\DB::table('roles')->insert([
            ['id' => 1, 'name' => 'super admin', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'name' => 'teacher', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 3, 'name' => 'student', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 4, 'name' => 'parent', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 5, 'name' => 'accountant', 'created_at' => now(), 'updated_at' => now()],
            ['id' => 6, 'name' => 'attendance-manager', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Insert specific Super Admins
        \Illuminate\Support\Facades\DB::table('users')->insert([
            [
                'name' => 'Shahbaz Ali',
                'email' => 'shahbaz.ali46@gmail.com',
                'password' => \Illuminate\Support\Facades\Hash::make('Pak@1234istan'), // Standard fallback, they login via OTP
                'role_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);

        $this->call(SubjectSeeder::class);
    }
}
