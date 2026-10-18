package com.kipsschool.chunian.data.model

data class TeacherAssignment(
    val id: Long,
    val classId: Long,
    val className: String,
    val sectionId: Long,
    val sectionName: String,
    val subjectId: Long,
    val subjectName: String,
    val majorId: Long? = null,
    val majorName: String? = null,
    val paymentType: String? = null
) {
    val displayTitle: String
        get() = "$className — $sectionName"

    val displaySubtitle: String
        get() = if (!majorName.isNullOrBlank()) "$subjectName ($majorName)" else subjectName

    /** Human-readable salary basis, mirrors the web portal wording. */
    val salaryBasisLabel: String
        get() = if (paymentType.equals("percentage", ignoreCase = true)) "Percentage Share" else "Fixed Amount"
}

data class StudentAttendanceItem(
    val id: Long,
    val name: String,
    val fatherName: String? = null,
    val rollNumber: String? = null,
    val status: String = "present" // "present", "absent", "late"
)

/** A test belonging to one of the teacher's assigned class & subject (marks entry target). */
data class TeacherTest(
    val id: Long,
    val title: String,
    val date: String,
    val totalMarks: Double,
    val passingMarks: Double,
    val categoryName: String? = null,
    val className: String,
    val sectionName: String? = null,
    val subjectName: String,
    val majorName: String? = null
) {
    val formattedDate: String
        get() = try {
            val parser = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            val formatter = java.text.SimpleDateFormat("EEE, dd MMM yyyy", java.util.Locale.US)
            val d = parser.parse(date)
            if (d != null) formatter.format(d) else date
        } catch (_: Exception) {
            date
        }
}

/** One student row on the marks entry sheet (editable obtained marks / absent flag). */
data class TestMarkRow(
    val studentId: Long,
    val name: String,
    val fatherName: String? = null,
    val rollNumber: String? = null,
    val obtainedMarksText: String = "",
    val isAbsent: Boolean = false,
    val existingGrade: String? = null
) {
    val studentLabel: String
        get() = if (!fatherName.isNullOrBlank()) "$name (S/o $fatherName)" else name

    val rollLabel: String
        get() = rollNumber ?: "—"
}

enum class TeacherDrawerDestination(
    val title: String,
    val icon: String,
    val subtitle: String
) {
    OVERVIEW("Overview", "✨", "Dashboard & daily metrics"),
    ASSIGNMENTS("My Classes & Subjects", "📚", "Assigned classes & sections"),
    CLASS_DIARY("Class Diary", "📖", "Homework & announcements"),
    TEST_MARKS("Marks Entry", "📝", "Enter test marks for your classes"),
    MY_ATTENDANCE("My Attendance", "📅", "Monthly biometric register"),
    STUDENT_RECEIVINGS("Student Receivings", "💵", "Collected student fees"),
    SALARIES("My Salary Slips", "💳", "Payroll & earnings breakdown"),
    ADVANCE_SALARY("Advance Salary", "💰", "Request advance payments"),
    LEAVES("Leave Applications", "⏰", "Submit & track leaves"),
    PROFILE("Profile & Settings", "👤", "Faculty credentials & security")
}

/** How the teacher wants to provide their digital signature. */
enum class SignatureInputMode(val label: String) {
    DRAW("Draw on Screen"),
    UPLOAD("Upload Image File")
}

/** Generic result for profile/signature API calls. */
data class ApiActionResult(
    val success: Boolean,
    val message: String,
    val user: UserProfile? = null
)

/** Editable faculty profile fields consumed by the Profile & Settings form. */
data class TeacherProfileForm(
    val name: String = "",
    val email: String = "",
    val contactNumber: String = "",
    val emergencyContact: String = "",
    val qualification: String = ""
)

data class TeacherAttendanceStats(
    val total: Int = 0,
    val present: Int = 0,
    val absent: Int = 0,
    val late: Int = 0
) {
    val presentPercentage: Float
        get() = if (total > 0) (present.toFloat() / total) * 100f else 0f
}

/** One day of the teacher's own self-attendance. */
data class TeacherAttendanceRecord(
    val id: Long = 0,
    val date: String,
    val status: String, // "Present", "Absent", "Leave"
    val checkInTime: String? = null,
    val checkOutTime: String? = null
) {
    val isPresent: Boolean
        get() = status.equals("Present", ignoreCase = true)

    val isAbsent: Boolean
        get() = status.equals("Absent", ignoreCase = true)

    val isLeave: Boolean
        get() = status.equals("Leave", ignoreCase = true)

    val dayNumber: String
        get() = try {
            val parser = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            val d = parser.parse(date)
            if (d != null) java.text.SimpleDateFormat("dd", java.util.Locale.US).format(d) else date.takeLast(2)
        } catch (_: Exception) {
            date.takeLast(2)
        }

    val dayOfWeek: String
        get() = try {
            val parser = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            val d = parser.parse(date)
            if (d != null) java.text.SimpleDateFormat("EEE", java.util.Locale.US).format(d).uppercase(java.util.Locale.US) else ""
        } catch (_: Exception) {
            ""
        }

    val formattedDate: String
        get() = try {
            val parser = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            val d = parser.parse(date)
            if (d != null) java.text.SimpleDateFormat("EEE, dd MMM yyyy", java.util.Locale.US).format(d) else date
        } catch (_: Exception) {
            date
        }
}

/** A single Class Diary / homework entry posted by a teacher. */
data class ClassDiaryEntry(
    val id: Long,
    val classId: Long = 0,
    val className: String,
    val subjectId: Long = 0,
    val subjectName: String,
    val sectionName: String? = null,
    val teacherName: String? = null,
    val diaryDate: String,
    val content: String,
    val createdAt: String? = null
) {
    val displayClassSection: String
        get() = if (!sectionName.isNullOrBlank()) "$className ($sectionName)" else className

    val formattedDate: String
        get() {
            return try {
                val parser = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                val formatter = java.text.SimpleDateFormat("EEE, dd MMM yyyy", java.util.Locale.US)
                val d = parser.parse(diaryDate)
                if (d != null) formatter.format(d) else diaryDate
            } catch (_: Exception) {
                diaryDate
            }
        }
}
