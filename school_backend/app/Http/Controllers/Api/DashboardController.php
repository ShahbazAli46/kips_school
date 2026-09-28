<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\AcademyClass;
use App\Models\Section;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $activeStudents = User::where('role_id', 3)->where('is_active', true)->count();
        $activeTeachers = User::where('role_id', 2)->where('is_active', true)->count();
        
        $totalClasses = AcademyClass::count();
        $totalSections = Section::count();

        $recentEnrollments = User::where('role_id', 3)
            ->with('academyClass')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'total_students' => $activeStudents,
            'total_teachers' => $activeTeachers,
            'total_classes' => $totalClasses,
            'total_sections' => $totalSections,
            'recent_enrollments' => $recentEnrollments,
        ]);
    }
}
