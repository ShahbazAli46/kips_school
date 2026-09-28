$tests = App\Models\Test::all();
$count = 0;
foreach($tests as $test) {
    $studentsQuery = App\Models\User::where('role_id', 3)
        ->where('class_id', $test->academy_class_id);
    
    if ($test->section_id) {
        $studentsQuery->where('section_id', $test->section_id);
    }
    if ($test->major_id) {
        $studentsQuery->where('major_id', $test->major_id);
    }
    
    $students = $studentsQuery->get();
    
    foreach($students as $student) {
        App\Models\TestMark::where('test_id', $test->id)->where('student_id', $student->id)->delete();
        
        $absent = rand(1, 20) === 1;
        $obtained = $absent ? 0 : rand(round($test->total_marks * 0.2), $test->total_marks);
        
        $perc = $test->total_marks > 0 ? ($obtained / $test->total_marks) * 100 : 0;
        $grade = 'F'; 
        $remarks = 'Serious hard work in all subjects is needed. It is a weak performance. !';
        
        if ($perc >= 90) { $grade = 'A+'; $remarks = 'Bravo! Look and work for top position in Board Exams.'; }
        elseif ($perc >= 80) { $grade = 'A'; $remarks = 'Perfection and consistency is needed. Best of luck for coming papers.'; }
        elseif ($perc >= 70) { $grade = 'B+'; $remarks = 'Long productive sitting at home is required.'; }
        elseif ($perc >= 60) { $grade = 'B'; $remarks = 'Plan and start working with a serious attitude immediately.'; }
        elseif ($perc >= 50) { $grade = 'C'; $remarks = 'It is just a PASSING efficiency. Work hard to show better than it.'; }
        elseif ($perc >= 33) { $grade = 'D'; $remarks = 'Serious hard work in all subjects is needed.'; }
        
        App\Models\TestMark::create([
            'test_id' => $test->id,
            'student_id' => $student->id,
            'obtained_marks' => $absent ? null : $obtained,
            'grade' => $absent ? 'N/A' : $grade,
            'is_absent' => $absent,
            'remarks' => $absent ? 'Absent in test' : $remarks
        ]);
        $count++;
    }
}
echo 'Inserted ' . $count . ' mock marks.';
