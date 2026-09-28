<?php

namespace Database\Seeders;

use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    /**
     * Seed common subjects for KIPS School / College.
     */
    public function run(): void
    {
        $adminId = User::where('role_id', 1)->value('id') ?? 1;

        $commonSubjects = [
            'English',
            'Urdu',
            'Mathematics',
            'General Mathematics',
            'Islamiyat',
            'Tarjuma-tul-Quran',
            'Pakistan Studies',
            'Physics',
            'Chemistry',
            'Biology',
            'Computer Science',
            'General Science',
            'Social Studies',
            'Arabic',
            'Ethics',
            'Drawing & Arts',
            'Economics',
            'Principles of Accounting',
            'Business Mathematics',
            'Principles of Commerce',
            'Commercial Geography',
            'Civics',
            'Education',
            'History',
            'Physical Education',
        ];

        foreach ($commonSubjects as $subjectName) {
            Subject::firstOrCreate(
                ['name' => $subjectName],
                [
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                ]
            );
        }
    }
}
