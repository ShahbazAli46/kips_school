package com.kipsschool.chunian.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kipsschool.chunian.data.api.ApiClient
import com.kipsschool.chunian.data.local.SessionManager
import com.kipsschool.chunian.data.model.ClassDiaryEntry
import com.kipsschool.chunian.data.model.SignatureInputMode
import com.kipsschool.chunian.data.model.TeacherAssignment
import com.kipsschool.chunian.data.model.TeacherAttendanceRecord
import com.kipsschool.chunian.data.model.TeacherDrawerDestination
import com.kipsschool.chunian.data.model.TeacherProfileForm
import com.kipsschool.chunian.data.model.TeacherTest
import com.kipsschool.chunian.data.model.TestMarkRow
import com.kipsschool.chunian.data.model.UserProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class TeacherPortalViewModel(
    private val apiClient: ApiClient,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val displayDateFormat = SimpleDateFormat("EEE, MMM dd, yyyy", Locale.US)
    private val monthFormat = SimpleDateFormat("yyyy-MM", Locale.US)
    private val monthDisplayFormat = SimpleDateFormat("MMMM yyyy", Locale.US)
    private val utcDateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private val _currentDestination = MutableStateFlow(TeacherDrawerDestination.OVERVIEW)
    val currentDestination: StateFlow<TeacherDrawerDestination> = _currentDestination.asStateFlow()

    private val _assignments = MutableStateFlow<List<TeacherAssignment>>(emptyList())
    val assignments: StateFlow<List<TeacherAssignment>> = _assignments.asStateFlow()

    private val _isLoadingAssignments = MutableStateFlow(false)
    val isLoadingAssignments: StateFlow<Boolean> = _isLoadingAssignments.asStateFlow()

    private val _feedbackMessage = MutableStateFlow<String?>(null)
    val feedbackMessage: StateFlow<String?> = _feedbackMessage.asStateFlow()

    private val _isError = MutableStateFlow(false)
    val isError: StateFlow<Boolean> = _isError.asStateFlow()

    // ─── Faculty Profile & Settings ────────────────────────────────
    private val _profile = MutableStateFlow<UserProfile?>(null)
    val profile: StateFlow<UserProfile?> = _profile.asStateFlow()

    private val _profileForm = MutableStateFlow(TeacherProfileForm())
    val profileForm: StateFlow<TeacherProfileForm> = _profileForm.asStateFlow()

    private val _isLoadingProfile = MutableStateFlow(false)
    val isLoadingProfile: StateFlow<Boolean> = _isLoadingProfile.asStateFlow()

    private val _isSavingProfile = MutableStateFlow(false)
    val isSavingProfile: StateFlow<Boolean> = _isSavingProfile.asStateFlow()

    private val _isUploadingImage = MutableStateFlow(false)
    val isUploadingImage: StateFlow<Boolean> = _isUploadingImage.asStateFlow()

    private val _signatureMode = MutableStateFlow(SignatureInputMode.DRAW)
    val signatureMode: StateFlow<SignatureInputMode> = _signatureMode.asStateFlow()

    private val _isSavingSignature = MutableStateFlow(false)
    val isSavingSignature: StateFlow<Boolean> = _isSavingSignature.asStateFlow()

    private val _isDeletingSignature = MutableStateFlow(false)
    val isDeletingSignature: StateFlow<Boolean> = _isDeletingSignature.asStateFlow()

    // ─── Teacher's Own Attendance ────────────────────────────────
    private val _teacherAttendances = MutableStateFlow<List<TeacherAttendanceRecord>>(emptyList())
    val teacherAttendances: StateFlow<List<TeacherAttendanceRecord>> = _teacherAttendances.asStateFlow()

    private val _isLoadingTeacherAttendance = MutableStateFlow(false)
    val isLoadingTeacherAttendance: StateFlow<Boolean> = _isLoadingTeacherAttendance.asStateFlow()

    private val _attendanceMonth = MutableStateFlow(monthFormat.format(Date()))
    val attendanceMonth: StateFlow<String> = _attendanceMonth.asStateFlow()

    // ─── Class Diary ────────────────────────────────────────────
    private val _diaries = MutableStateFlow<List<ClassDiaryEntry>>(emptyList())
    val diaries: StateFlow<List<ClassDiaryEntry>> = _diaries.asStateFlow()

    private val _isLoadingDiaries = MutableStateFlow(false)
    val isLoadingDiaries: StateFlow<Boolean> = _isLoadingDiaries.asStateFlow()

    private val _isSavingDiary = MutableStateFlow(false)
    val isSavingDiary: StateFlow<Boolean> = _isSavingDiary.asStateFlow()

    private val _deletingDiaryId = MutableStateFlow<Long?>(null)
    val deletingDiaryId: StateFlow<Long?> = _deletingDiaryId.asStateFlow()

    private val _diaryAssignment = MutableStateFlow<TeacherAssignment?>(null)
    val diaryAssignment: StateFlow<TeacherAssignment?> = _diaryAssignment.asStateFlow()

    private val _diaryDate = MutableStateFlow(dateFormat.format(Date()))
    val diaryDate: StateFlow<String> = _diaryDate.asStateFlow()

    private val _diaryContent = MutableStateFlow("")
    val diaryContent: StateFlow<String> = _diaryContent.asStateFlow()

    // ─── Test Marks Entry ───────────────────────────────────────
    private val _marksAssignment = MutableStateFlow<TeacherAssignment?>(null)
    val marksAssignment: StateFlow<TeacherAssignment?> = _marksAssignment.asStateFlow()

    private val _tests = MutableStateFlow<List<TeacherTest>>(emptyList())
    val tests: StateFlow<List<TeacherTest>> = _tests.asStateFlow()

    private val _isLoadingTests = MutableStateFlow(false)
    val isLoadingTests: StateFlow<Boolean> = _isLoadingTests.asStateFlow()

    private val _selectedTest = MutableStateFlow<TeacherTest?>(null)
    val selectedTest: StateFlow<TeacherTest?> = _selectedTest.asStateFlow()

    private val _markRows = MutableStateFlow<List<TestMarkRow>>(emptyList())
    val markRows: StateFlow<List<TestMarkRow>> = _markRows.asStateFlow()

    private val _isLoadingMarkStudents = MutableStateFlow(false)
    val isLoadingMarkStudents: StateFlow<Boolean> = _isLoadingMarkStudents.asStateFlow()

    private val _isSavingMarks = MutableStateFlow(false)
    val isSavingMarks: StateFlow<Boolean> = _isSavingMarks.asStateFlow()

    /** Student ids whose marks were entered / changed since the last load (only these get sent). */
    private val dirtyStudentIds = mutableSetOf<Long>()

    init {
        loadAssignments()
        loadProfile()
        loadTeacherAttendance()
    }

    fun selectDestination(dest: TeacherDrawerDestination) {
        _currentDestination.value = dest
        _feedbackMessage.value = null
        when (dest) {
            TeacherDrawerDestination.PROFILE -> {
                if (_profile.value == null) loadProfile()
            }
            TeacherDrawerDestination.OVERVIEW -> {
                loadTeacherAttendance()
            }
            TeacherDrawerDestination.ASSIGNMENTS -> {
                if (_assignments.value.isEmpty()) loadAssignments()
            }
            TeacherDrawerDestination.CLASS_DIARY -> {
                if (_assignments.value.isEmpty()) loadAssignments()
                loadDiaries()
            }
            TeacherDrawerDestination.TEST_MARKS -> {
                if (_assignments.value.isEmpty()) loadAssignments()
                if (_marksAssignment.value == null) {
                    _marksAssignment.value = _assignments.value.firstOrNull()
                }
                if (_marksAssignment.value != null && _tests.value.isEmpty() && !_isLoadingTests.value) {
                    loadTeacherTests()
                }
            }
            TeacherDrawerDestination.MY_ATTENDANCE -> {
                loadTeacherAttendance(_attendanceMonth.value)
            }
            else -> Unit
        }
    }

    fun loadAssignments() {
        viewModelScope.launch {
            _isLoadingAssignments.value = true
            val list = apiClient.getTeacherAssignments()
            _assignments.value = list
            if (_diaryAssignment.value == null && list.isNotEmpty()) {
                _diaryAssignment.value = list.first()
            }
            if (_marksAssignment.value == null && list.isNotEmpty()) {
                _marksAssignment.value = list.first()
                if (_currentDestination.value == TeacherDrawerDestination.TEST_MARKS) {
                    loadTeacherTests()
                }
            }
            _isLoadingAssignments.value = false
        }
    }

    // ─── Faculty Profile & Settings ────────────────────────────────

    /** Converts a stored relative media path (e.g. `users/x.jpg`) into a full storage URL. */
    fun resolveMediaUrl(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        val base = sessionManager.baseUrl.replace("/api", "/storage/").trimEnd('/')
        return "$base/${path.trimStart('/')}"
    }

    fun loadProfile() {
        viewModelScope.launch {
            _isLoadingProfile.value = true
            val fetched = apiClient.getMyProfile()
            if (fetched != null) {
                _profile.value = fetched
                _profileForm.value = TeacherProfileForm(
                    name = fetched.name,
                    email = fetched.email.orEmpty(),
                    contactNumber = fetched.contact_number.orEmpty(),
                    emergencyContact = fetched.emergency_contact.orEmpty(),
                    qualification = fetched.qualification.orEmpty()
                )
            }
            _isLoadingProfile.value = false
        }
    }

    fun getFormattedAttendanceMonth(): String {
        return try {
            val parsed = monthFormat.parse(_attendanceMonth.value)
            if (parsed != null) monthDisplayFormat.format(parsed) else _attendanceMonth.value
        } catch (_: Exception) {
            _attendanceMonth.value
        }
    }

    fun isCurrentAttendanceMonth(): Boolean {
        val current = monthFormat.format(Date())
        return _attendanceMonth.value == current
    }

    fun setAttendanceMonth(month: String) {
        _attendanceMonth.value = month
        loadTeacherAttendance(month)
    }

    fun shiftAttendanceMonth(monthsDelta: Int) {
        try {
            val cal = Calendar.getInstance()
            val parsed = monthFormat.parse(_attendanceMonth.value)
            if (parsed != null) {
                cal.time = parsed
                cal.add(Calendar.MONTH, monthsDelta)
                val newMonth = monthFormat.format(cal.time)
                _attendanceMonth.value = newMonth
                loadTeacherAttendance(newMonth)
            }
        } catch (_: Exception) {}
    }

    fun setAttendanceMonthToCurrent() {
        val current = monthFormat.format(Date())
        _attendanceMonth.value = current
        loadTeacherAttendance(current)
    }

    fun loadTeacherAttendance(month: String? = null) {
        val targetMonth = month ?: _attendanceMonth.value
        viewModelScope.launch {
            _isLoadingTeacherAttendance.value = true
            val list = apiClient.getTeacherAttendance(targetMonth)
            _teacherAttendances.value = list
            _isLoadingTeacherAttendance.value = false
        }
    }


    // ─── Class Diary ────────────────────────────────────────────

    fun selectDiaryAssignment(assignment: TeacherAssignment) {
        _diaryAssignment.value = assignment
    }

    fun setDiaryDate(date: String) {
        _diaryDate.value = date
    }

    fun shiftDiaryDate(days: Int) {
        try {
            val cal = Calendar.getInstance()
            val parsed = dateFormat.parse(_diaryDate.value)
            if (parsed != null) {
                cal.time = parsed
                cal.add(Calendar.DAY_OF_YEAR, days)
                _diaryDate.value = dateFormat.format(cal.time)
            }
        } catch (_: Exception) {}
    }

    fun setDiaryDateToToday() {
        _diaryDate.value = dateFormat.format(Date())
    }

    /** Applies a date chosen from the material date picker (UTC midnight millis). */
    fun setDiaryDateFromMillis(millis: Long) {
        _diaryDate.value = utcDateFormat.format(Date(millis))
    }

    /** Millis used to seed the date picker so it opens on the currently selected date. */
    fun currentDiaryDateMillis(): Long {
        return try {
            utcDateFormat.parse(_diaryDate.value)?.time ?: System.currentTimeMillis()
        } catch (_: Exception) {
            System.currentTimeMillis()
        }
    }

    fun getFormattedDiaryDate(): String {
        return try {
            val parsed = dateFormat.parse(_diaryDate.value)
            if (parsed != null) displayDateFormat.format(parsed) else _diaryDate.value
        } catch (_: Exception) {
            _diaryDate.value
        }
    }

    fun setDiaryContent(value: String) {
        _diaryContent.value = value
    }

    fun loadDiaries() {
        viewModelScope.launch {
            _isLoadingDiaries.value = true
            _diaries.value = apiClient.getTeacherDiaries(null)
            _isLoadingDiaries.value = false
        }
    }

    fun postDiary() {
        val assignment = _diaryAssignment.value
        val content = _diaryContent.value.trim()

        if (assignment == null) {
            _isError.value = true
            _feedbackMessage.value = "Please select a class / subject for this diary."
            return
        }
        if (content.isBlank()) {
            _isError.value = true
            _feedbackMessage.value = "Please enter the diary / homework text."
            return
        }
        if (_isSavingDiary.value) return

        viewModelScope.launch {
            _isSavingDiary.value = true
            _feedbackMessage.value = null
            val (success, message) = apiClient.createDiary(
                classId = assignment.classId,
                subjectId = assignment.subjectId,
                sectionId = assignment.sectionId.takeIf { it > 0 },
                diaryDate = _diaryDate.value,
                content = content
            )
            _isSavingDiary.value = false
            _isError.value = !success
            _feedbackMessage.value = message
            if (success) {
                _diaryContent.value = ""
                loadDiaries()
            }
        }
    }

    fun deleteDiary(id: Long) {
        if (_deletingDiaryId.value != null) return
        viewModelScope.launch {
            _deletingDiaryId.value = id
            _feedbackMessage.value = null
            val (success, message) = apiClient.deleteDiary(id)
            _deletingDiaryId.value = null
            _isError.value = !success
            _feedbackMessage.value = message
            if (success) loadDiaries()
        }
    }

    // ─── Test Marks Entry ──────────────────────────────────────────

    fun selectMarksAssignment(assignment: TeacherAssignment) {
        _marksAssignment.value = assignment
        _tests.value = emptyList()
        clearSelectedTest()
        loadTeacherTests()
    }

    fun loadTeacherTests() {
        val assignment = _marksAssignment.value ?: return
        if (_isLoadingTests.value) return
        viewModelScope.launch {
            _isLoadingTests.value = true
            _tests.value = apiClient.getTeacherTests(assignment)
            _isLoadingTests.value = false
        }
    }

    fun selectTest(test: TeacherTest) {
        _selectedTest.value = test
        loadTestStudents()
    }

    fun clearSelectedTest() {
        _selectedTest.value = null
        _markRows.value = emptyList()
        dirtyStudentIds.clear()
    }

    fun loadTestStudents() {
        val test = _selectedTest.value ?: return
        if (_isLoadingMarkStudents.value) return
        viewModelScope.launch {
            _isLoadingMarkStudents.value = true
            dirtyStudentIds.clear()
            _markRows.value = apiClient.getTestStudentsForMarks(test.id)
            _isLoadingMarkStudents.value = false
        }
    }

    fun setObtainedMarks(studentId: Long, text: String) {
        // Only digits & one decimal point are accepted
        var cleaned = text.filter { it.isDigit() || it == '.' }
        val firstDot = cleaned.indexOf('.')
        if (firstDot >= 0) {
            cleaned = cleaned.substring(0, firstDot + 1) +
                cleaned.substring(firstDot + 1).filterNot { it == '.' }
        }

        _markRows.value = _markRows.value.map {
            if (it.studentId == studentId) it.copy(obtainedMarksText = cleaned) else it
        }
        dirtyStudentIds.add(studentId)
    }

    fun toggleStudentAbsent(studentId: Long) {
        _markRows.value = _markRows.value.map {
            if (it.studentId == studentId) it.copy(isAbsent = !it.isAbsent) else it
        }
        dirtyStudentIds.add(studentId)
    }

    fun saveTestMarks() {
        val test = _selectedTest.value ?: return
        if (_isSavingMarks.value) return

        val entered = _markRows.value.filter { it.studentId in dirtyStudentIds }
        val validRows = mutableListOf<TestMarkRow>()

        for (row in entered) {
            when {
                row.isAbsent -> validRows.add(row)
                row.obtainedMarksText.isNotBlank() -> {
                    val value = row.obtainedMarksText.trim().toDoubleOrNull()
                    if (value == null) {
                        _isError.value = true
                        _feedbackMessage.value = "Marks for ${row.name} are not a valid number."
                        return
                    }
                    if (value < 0 || value > test.totalMarks) {
                        _isError.value = true
                        _feedbackMessage.value =
                            "Marks for ${row.name} must be between 0 and ${removeTrailingZero(test.totalMarks)}."
                        return
                    }
                    validRows.add(row)
                }
                // Blank & untouched → nothing recorded for this student
            }
        }

        if (validRows.isEmpty()) {
            _isError.value = true
            _feedbackMessage.value = "Enter marks for at least one student first."
            return
        }

        viewModelScope.launch {
            _isSavingMarks.value = true
            _feedbackMessage.value = null
            val (success, message) = apiClient.saveTestMarks(test.id, validRows)
            _isSavingMarks.value = false
            _isError.value = !success
            _feedbackMessage.value = message
            if (success) {
                dirtyStudentIds.clear()
                loadTestStudents()
            }
        }
    }

    private fun removeTrailingZero(value: Double): String =
        if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()

    fun setProfileName(value: String) {
        _profileForm.value = _profileForm.value.copy(name = value)
    }

    fun setProfileEmail(value: String) {
        _profileForm.value = _profileForm.value.copy(email = value)
    }

    fun setProfilePhone(value: String) {
        _profileForm.value = _profileForm.value.copy(contactNumber = value)
    }

    fun setProfileEmergency(value: String) {
        _profileForm.value = _profileForm.value.copy(emergencyContact = value)
    }

    fun setProfileQualification(value: String) {
        _profileForm.value = _profileForm.value.copy(qualification = value)
    }

    fun saveProfile() {
        val form = _profileForm.value
        if (form.name.isBlank()) {
            _isError.value = true
            _feedbackMessage.value = "Full name is required."
            return
        }
        if (_isSavingProfile.value) return

        viewModelScope.launch {
            _isSavingProfile.value = true
            _feedbackMessage.value = null
            val result = apiClient.updateMyProfile(form)
            _isSavingProfile.value = false
            _isError.value = !result.success
            _feedbackMessage.value = result.message
            result.user?.let { _profile.value = it }
        }
    }

    fun uploadProfileImage(bytes: ByteArray, fileName: String, mimeType: String) {
        if (_isUploadingImage.value) return
        viewModelScope.launch {
            _isUploadingImage.value = true
            _feedbackMessage.value = null
            val result = apiClient.uploadProfileImage(bytes, fileName, mimeType)
            _isUploadingImage.value = false
            _isError.value = !result.success
            _feedbackMessage.value = result.message
            result.user?.let { _profile.value = it }
        }
    }

    fun setSignatureMode(mode: SignatureInputMode) {
        _signatureMode.value = mode
    }

    fun saveDrawnSignature(base64Png: String) {
        if (_isSavingSignature.value) return
        viewModelScope.launch {
            _isSavingSignature.value = true
            _feedbackMessage.value = null
            val result = apiClient.saveSignatureBase64(base64Png)
            _isSavingSignature.value = false
            _isError.value = !result.success
            _feedbackMessage.value = result.message
            result.user?.let { _profile.value = it }
        }
    }

    fun uploadSignatureFile(bytes: ByteArray, fileName: String, mimeType: String) {
        if (_isSavingSignature.value) return
        viewModelScope.launch {
            _isSavingSignature.value = true
            _feedbackMessage.value = null
            val result = apiClient.uploadSignatureFile(bytes, fileName, mimeType)
            _isSavingSignature.value = false
            _isError.value = !result.success
            _feedbackMessage.value = result.message
            result.user?.let { _profile.value = it }
        }
    }

    fun deleteSignature() {
        if (_isDeletingSignature.value) return
        viewModelScope.launch {
            _isDeletingSignature.value = true
            _feedbackMessage.value = null
            val result = apiClient.deleteSignature()
            _isDeletingSignature.value = false
            _isError.value = !result.success
            _feedbackMessage.value = result.message

            val updated = result.user
            if (updated != null) {
                _profile.value = updated
            } else if (result.success) {
                _profile.value = _profile.value?.copy(signature = null)
            }
        }
    }

    fun logout() {
        sessionManager.clear()
        _profile.value = null
        _profileForm.value = TeacherProfileForm()
        _assignments.value = emptyList()
        _diaries.value = emptyList()
        _diaryAssignment.value = null
        _diaryContent.value = ""
        _marksAssignment.value = null
        _tests.value = emptyList()
        _selectedTest.value = null
        _markRows.value = emptyList()
        dirtyStudentIds.clear()
        _currentDestination.value = TeacherDrawerDestination.OVERVIEW
    }
}
