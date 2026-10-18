package com.kipsschool.chunian.data.api

import com.kipsschool.chunian.data.local.SessionManager
import com.kipsschool.chunian.data.model.ApiActionResult
import com.kipsschool.chunian.data.model.LoginResult
import com.kipsschool.chunian.data.model.TeacherProfileForm
import com.kipsschool.chunian.data.model.UserProfile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class ApiClient(private val sessionManager: SessionManager) {

    suspend fun login(identifier: String, password: String? = null): LoginResult =
        withContext(Dispatchers.IO) {
            try {
                val json = JSONObject().apply {
                    put("identifier", identifier)
                    if (!password.isNullOrBlank()) {
                        put("password", password)
                    }
                }

                val (code, responseText) = postJson("${sessionManager.baseUrl}/login", json)
                val responseJson = parseJson(responseText)
                val message = responseJson?.optString("message", "Response received") ?: "Response received"

                when (code) {
                    200 -> LoginResult(
                        success = true,
                        message = message,
                        requiresOtp = responseJson?.optBoolean("requires_otp", true) ?: true
                    )
                    403 -> {
                        val requiresMigration = responseJson?.optBoolean("requires_migration", false) ?: false
                        val alreadyMigrated = responseJson?.optBoolean("already_migrated", false) ?: false
                        LoginResult(
                            success = false,
                            message = message,
                            requiresMigration = requiresMigration,
                            alreadyMigrated = alreadyMigrated
                        )
                    }
                    else -> LoginResult(
                        success = false,
                        message = message
                    )
                }
            } catch (e: Exception) {
                LoginResult(
                    success = false,
                    message = "Network error: ${e.localizedMessage ?: "Unable to connect to server"}"
                )
            }
        }

    suspend fun verifyOtp(email: String, otp: String): LoginResult =
        withContext(Dispatchers.IO) {
            try {
                val json = JSONObject().apply {
                    put("email", email)
                    put("otp", otp)
                }

                val (code, responseText) = postJson("${sessionManager.baseUrl}/verify-otp", json)
                val responseJson = parseJson(responseText)
                val message = responseJson?.optString("message", "") ?: ""

                if (code == 200 && responseJson != null) {
                    val token = responseJson.optString("token", "")
                    val userObj = responseJson.optJSONObject("user")
                    val userProfile = parseUser(userObj)?.let { parsed ->
                        if (parsed.email.isNullOrBlank()) parsed.copy(email = email) else parsed
                    }

                    if (userProfile != null && token.isNotBlank()) {
                        sessionManager.saveUser(token, userProfile)
                    }

                    LoginResult(
                        success = true,
                        message = message.ifBlank { "Login successful" },
                        token = token,
                        user = userProfile
                    )
                } else {
                    LoginResult(
                        success = false,
                        message = message.ifBlank { "Invalid or expired verification code" }
                    )
                }
            } catch (e: Exception) {
                LoginResult(
                    success = false,
                    message = "Verification failed: ${e.localizedMessage ?: "Connection error"}"
                )
            }
        }

    suspend fun migrateEmail(phone: String, password: String, email: String): LoginResult =
        withContext(Dispatchers.IO) {
            try {
                val json = JSONObject().apply {
                    put("phone", phone)
                    put("password", password)
                    put("email", email)
                }

                val (code, responseText) = postJson("${sessionManager.baseUrl}/migrate-email", json)
                val responseJson = parseJson(responseText)
                val message = responseJson?.optString("message", "") ?: ""

                if (code == 200) {
                    LoginResult(
                        success = true,
                        message = message.ifBlank { "Account linked. OTP sent to your new email." },
                        requiresOtp = true
                    )
                } else {
                    LoginResult(
                        success = false,
                        message = message.ifBlank { "Failed to link email address." }
                    )
                }
            } catch (e: Exception) {
                LoginResult(
                    success = false,
                    message = "Migration error: ${e.localizedMessage ?: "Connection error"}"
                )
            }
        }

    suspend fun getTeacherAssignments(): List<com.kipsschool.chunian.data.model.TeacherAssignment> = withContext(Dispatchers.IO) {
        try {
            val (code, responseText) = getJson("${sessionManager.baseUrl}/teacher/subject-attendance/assignments")
            if (code == 200) {
                val json = parseJson(responseText)
                val data = json?.optJSONArray("data") ?: org.json.JSONArray()
                val list = mutableListOf<com.kipsschool.chunian.data.model.TeacherAssignment>()
                for (i in 0 until data.length()) {
                    val item = data.optJSONObject(i) ?: continue
                    val classObj = item.optJSONObject("academy_class")
                    val sectionObj = item.optJSONObject("section")
                    val subjectObj = item.optJSONObject("subject")
                    val majorObj = item.optJSONObject("major")

                    list.add(
                        com.kipsschool.chunian.data.model.TeacherAssignment(
                            id = item.optLong("id"),
                            classId = item.optLong("class_id"),
                            className = classObj?.optString("name") ?: "Class ${item.optLong("class_id")}",
                            sectionId = item.optLong("section_id"),
                            sectionName = sectionObj?.optString("name") ?: "Section ${item.optLong("section_id")}",
                            subjectId = item.optLong("subject_id"),
                            subjectName = subjectObj?.optString("name") ?: "Subject ${item.optLong("subject_id")}",
                            majorId = if (item.has("major_id") && !item.isNull("major_id")) item.optLong("major_id") else null,
                            majorName = majorObj?.optString("name"),
                            paymentType = item.stringOrNull("payment_type")
                        )
                    )
                }
                list
            } else {
                emptyList()
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    /** Teacher's own self-attendance for a given month (YYYY-MM). */
    suspend fun getTeacherAttendance(month: String): List<com.kipsschool.chunian.data.model.TeacherAttendanceRecord> =
        withContext(Dispatchers.IO) {
            try {
                val (code, responseText) = getJson("${sessionManager.baseUrl}/teacher-attendance?month=$month")
                if (code == 200) {
                    val arr = parseJsonArray(responseText)
                        ?: parseJson(responseText)?.optJSONArray("data")
                        ?: org.json.JSONArray()
                    val list = mutableListOf<com.kipsschool.chunian.data.model.TeacherAttendanceRecord>()
                    for (i in 0 until arr.length()) {
                        val item = arr.optJSONObject(i) ?: continue
                        val inTime = if (item.isNull("check_in_time")) null else item.optString("check_in_time", "").takeIf { it.isNotBlank() }
                        val outTime = if (item.isNull("check_out_time")) null else item.optString("check_out_time", "").takeIf { it.isNotBlank() }
                        list.add(
                            com.kipsschool.chunian.data.model.TeacherAttendanceRecord(
                                id = item.optLong("id", 0),
                                date = item.optString("date", "").take(10),
                                status = item.optString("status", "Absent"),
                                checkInTime = inTime,
                                checkOutTime = outTime
                            )
                        )
                    }
                    list
                } else {
                    emptyList()
                }
            } catch (_: Exception) {
                emptyList()
            }
        }

    /** Allows a teacher to punch in / mark self present for today. */
    suspend fun markSelfPresent(date: String, checkInTime: String): Pair<Boolean, String> =
        withContext(Dispatchers.IO) {
            try {
                val body = JSONObject().apply {
                    put("date", date)
                    put("check_in_time", checkInTime)
                }
                val (code, responseText) = postJson("${sessionManager.baseUrl}/teacher-attendance/mark-self-present", body)
                val resJson = parseJson(responseText)
                val msg = resJson?.optString("message", "")?.takeIf { it.isNotBlank() }
                    ?: if (code in 200..299) "Attendance marked present successfully." else "Failed to mark attendance."
                Pair(code in 200..299, msg)
            } catch (e: Exception) {
                Pair(false, "Network error: ${e.localizedMessage ?: "Unable to connect"}")
            }
        }

    suspend fun getSubjectStudents(
        classId: Long,
        sectionId: Long,
        subjectId: Long,
        majorId: Long? = null,
        date: String
    ): List<com.kipsschool.chunian.data.model.StudentAttendanceItem> = withContext(Dispatchers.IO) {
        try {
            var url = "${sessionManager.baseUrl}/teacher/subject-attendance/students?class_id=$classId&section_id=$sectionId&subject_id=$subjectId&date=$date"
            if (majorId != null) {
                url += "&major_id=$majorId"
            }
            val (code, responseText) = getJson(url)
            if (code == 200) {
                val json = parseJson(responseText)
                val data = json?.optJSONArray("data") ?: org.json.JSONArray()
                val list = mutableListOf<com.kipsschool.chunian.data.model.StudentAttendanceItem>()
                for (i in 0 until data.length()) {
                    val item = data.optJSONObject(i) ?: continue
                    list.add(
                        com.kipsschool.chunian.data.model.StudentAttendanceItem(
                            id = item.optLong("id"),
                            name = item.optString("name", "Student"),
                            fatherName = if (item.has("father_name") && !item.isNull("father_name")) item.optString("father_name") else null,
                            rollNumber = if (item.has("roll_number") && !item.isNull("roll_number")) item.optString("roll_number") else null,
                            status = item.optString("current_attendance_status", "present")
                        )
                    )
                }
                list
            } else {
                emptyList()
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun saveSubjectAttendance(
        subjectId: Long,
        date: String,
        attendances: List<Pair<Long, String>>
    ): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        try {
            val jsonArray = org.json.JSONArray()
            for (att in attendances) {
                val item = JSONObject().apply {
                    put("student_id", att.first)
                    put("status", att.second)
                }
                jsonArray.put(item)
            }

            val body = JSONObject().apply {
                put("subject_id", subjectId)
                put("date", date)
                put("attendances", jsonArray)
            }

            val (code, responseText) = postJson("${sessionManager.baseUrl}/teacher/subject-attendance", body)
            val resJson = parseJson(responseText)
            val msg = resJson?.optString("message", if (code == 200) "Attendance saved successfully" else "Failed to save attendance")
                ?: if (code == 200) "Attendance saved successfully" else "Failed to save attendance"
            Pair(code == 200, msg)
        } catch (e: Exception) {
            Pair(false, "Network error: ${e.localizedMessage ?: "Unable to connect"}")
        }
    }

    // ─── Class Diary ───────────────────────────────────────────────

    /** Diaries created by the authenticated teacher, optionally filtered to one date (`yyyy-MM-dd`). */
    suspend fun getTeacherDiaries(date: String? = null): List<com.kipsschool.chunian.data.model.ClassDiaryEntry> =
        withContext(Dispatchers.IO) {
            try {
                var url = "${sessionManager.baseUrl}/teacher/diaries"
                if (!date.isNullOrBlank()) url += "?date=$date"
                val (code, responseText) = getJson(url)
                if (code == 200) {
                    val data = parseJsonArray(responseText) ?: org.json.JSONArray()
                    val list = mutableListOf<com.kipsschool.chunian.data.model.ClassDiaryEntry>()
                    for (i in 0 until data.length()) {
                        val item = data.optJSONObject(i) ?: continue
                        list.add(
                            com.kipsschool.chunian.data.model.ClassDiaryEntry(
                                id = item.optLong("id"),
                                classId = item.optLong("class_id"),
                                className = item.optJSONObject("academy_class")?.optString("name")
                                    ?: "Class ${item.optLong("class_id")}",
                                subjectId = item.optLong("subject_id"),
                                subjectName = item.optJSONObject("subject")?.optString("name")
                                    ?: "Subject ${item.optLong("subject_id")}",
                                sectionName = item.optJSONObject("section")?.optString("name"),
                                teacherName = item.optJSONObject("teacher")?.optString("name"),
                                diaryDate = item.optString("diary_date", "").take(10),
                                content = item.optString("content", ""),
                                createdAt = item.optString("created_at", "").takeIf { it.isNotBlank() }
                            )
                        )
                    }
                    list
                } else {
                    emptyList()
                }
            } catch (_: Exception) {
                emptyList()
            }
        }

    /** Publishes a new class diary entry. Returns (success, message). */
    suspend fun createDiary(
        classId: Long,
        subjectId: Long,
        sectionId: Long?,
        diaryDate: String,
        content: String
    ): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        try {
            val body = JSONObject().apply {
                put("class_id", classId)
                put("subject_id", subjectId)
                put("section_id", if (sectionId != null) sectionId else JSONObject.NULL)
                put("diary_date", diaryDate)
                put("content", content)
            }

            val (code, responseText) = postJson("${sessionManager.baseUrl}/teacher/diaries", body)
            val resJson = parseJson(responseText)
            val msg = resJson?.optString("message", "")?.takeIf { it.isNotBlank() }
                ?: if (code in 200..299) "Diary published successfully!" else "Failed to publish diary"
            Pair(code in 200..299, msg)
        } catch (e: Exception) {
            Pair(false, "Network error: ${e.localizedMessage ?: "Unable to connect"}")
        }
    }

    /** Deletes a diary entry created by the teacher. Returns (success, message). */
    suspend fun deleteDiary(id: Long): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        try {
            val (code, responseText) = sendRaw(
                "${sessionManager.baseUrl}/teacher/diaries/$id",
                "DELETE",
                contentType = null,
                body = null
            )
            val resJson = parseJson(responseText)
            val msg = resJson?.optString("message", "")?.takeIf { it.isNotBlank() }
                ?: if (code in 200..299) "Diary entry deleted." else "Failed to delete diary"
            Pair(code in 200..299, msg)
        } catch (e: Exception) {
            Pair(false, "Network error: ${e.localizedMessage ?: "Unable to connect"}")
        }
    }

    // ─── Test Marks Entry ──────────────────────────────────────────

    /**
     * Tests for the teacher's selected assignment. Server already scopes tests to
     * the teacher's assigned class & subject; section/major compatibility is
     * double-checked here as a safety net.
     */
    suspend fun getTeacherTests(assignment: com.kipsschool.chunian.data.model.TeacherAssignment): List<com.kipsschool.chunian.data.model.TeacherTest> =
        withContext(Dispatchers.IO) {
            try {
                val url = "${sessionManager.baseUrl}/tests" +
                    "?academy_class_id=${assignment.classId}&subject_id=${assignment.subjectId}"
                val (code, responseText) = getJson(url)
                if (code == 200) {
                    val arr = parseJsonArray(responseText) ?: org.json.JSONArray()
                    val list = mutableListOf<com.kipsschool.chunian.data.model.TeacherTest>()
                    for (i in 0 until arr.length()) {
                        val item = arr.optJSONObject(i) ?: continue

                        val testSectionId = if (item.isNull("section_id")) null else item.optLong("section_id")
                        val testMajorId = if (item.isNull("major_id")) null else item.optLong("major_id")

                        val sectionOk = testSectionId == null || assignment.sectionId <= 0L || testSectionId == assignment.sectionId
                        val majorOk = testMajorId == null || (assignment.majorId != null && testMajorId == assignment.majorId)
                        if (!sectionOk || !majorOk) continue

                        list.add(
                            com.kipsschool.chunian.data.model.TeacherTest(
                                id = item.optLong("id"),
                                title = if (item.isNull("title")) "Test" else item.optString("title", "Test"),
                                date = item.optString("date", "").take(10),
                                totalMarks = item.optDouble("total_marks", 0.0),
                                passingMarks = item.optDouble("passing_marks", 0.0),
                                categoryName = item.optJSONObject("test_category")?.optString("name"),
                                className = item.optJSONObject("academyClass")?.optString("name") ?: assignment.className,
                                sectionName = item.optJSONObject("section")?.optString("name") ?: assignment.sectionName,
                                subjectName = item.optJSONObject("subject")?.optString("name") ?: assignment.subjectName,
                                majorName = item.optJSONObject("major")?.optString("name") ?: assignment.majorName
                            )
                        )
                    }
                    list.sortedByDescending { it.date }
                } else {
                    emptyList()
                }
            } catch (_: Exception) {
                emptyList()
            }
        }

    /** Students of a test with any existing marks (`{student, mark}` pairs). */
    suspend fun getTestStudentsForMarks(testId: Long): List<com.kipsschool.chunian.data.model.TestMarkRow> =
        withContext(Dispatchers.IO) {
            try {
                val (code, responseText) = getJson("${sessionManager.baseUrl}/tests/$testId/students")
                if (code == 200) {
                    val arr = parseJsonArray(responseText) ?: org.json.JSONArray()
                    val rows = mutableListOf<com.kipsschool.chunian.data.model.TestMarkRow>()
                    for (i in 0 until arr.length()) {
                        val item = arr.optJSONObject(i) ?: continue
                        val student = item.optJSONObject("student") ?: continue
                        val mark = item.optJSONObject("mark")

                        val isAbsent = mark?.optBoolean("is_absent", false) ?: false
                        val obtained = if (mark != null && !mark.isNull("obtained_marks")) {
                            mark.optDouble("obtained_marks", 0.0)
                        } else null

                        rows.add(
                            com.kipsschool.chunian.data.model.TestMarkRow(
                                studentId = student.optLong("id"),
                                name = student.optString("name", "Student"),
                                fatherName = if (student.has("father_name") && !student.isNull("father_name")) student.optString("father_name") else null,
                                rollNumber = if (student.has("roll_number") && !student.isNull("roll_number")) student.optString("roll_number") else null,
                                obtainedMarksText = if (!isAbsent && obtained != null) trimDouble(obtained) else "",
                                isAbsent = isAbsent,
                                existingGrade = mark?.stringOrNull("grade")
                            )
                        )
                    }
                    rows
                } else {
                    emptyList()
                }
            } catch (_: Exception) {
                emptyList()
            }
        }

    /**
     * Bulk-saves marks for a test via `POST /tests/{id}/marks/bulk`.
     * Rows must already be validated by the caller (range & emptiness).
     */
    suspend fun saveTestMarks(
        testId: Long,
        rows: List<com.kipsschool.chunian.data.model.TestMarkRow>
    ): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        try {
            val marksArray = org.json.JSONArray()
            for (row in rows) {
                val entry = JSONObject().apply {
                    put("student_id", row.studentId)
                    if (row.isAbsent) {
                        put("is_absent", true)
                        put("obtained_marks", JSONObject.NULL)
                    } else {
                        val value = row.obtainedMarksText.trim().toDoubleOrNull() ?: return@withContext Pair(false, "Marks values are invalid. Please re-enter them.")
                        put("obtained_marks", value)
                        put("is_absent", false)
                    }
                }
                marksArray.put(entry)
            }

            val body = JSONObject().apply { put("marks", marksArray) }
            val (code, responseText) = postJson("${sessionManager.baseUrl}/tests/$testId/marks/bulk", body)
            val resJson = parseJson(responseText)
            val msg = resJson?.optString("message", "")?.takeIf { it.isNotBlank() }
                ?: if (code in 200..299) "Marks saved successfully." else "Failed to save marks."
            Pair(code in 200..299, msg)
        } catch (e: Exception) {
            Pair(false, "Network error: ${e.localizedMessage ?: "Unable to connect"}")
        }
    }

    // ─── Faculty Profile & Signature ───────────────────────────────

    /** Loads the authenticated user's full profile from the API. */
    suspend fun getMyProfile(): UserProfile? = withContext(Dispatchers.IO) {
        try {
            val (code, responseText) = getJson("${sessionManager.baseUrl}/user")
            if (code == 200) {
                parseUser(parseJson(responseText)) ?: sessionManager.getUser()
            } else {
                sessionManager.getUser()
            }
        } catch (_: Exception) {
            sessionManager.getUser()
        }
    }

    /** Persists editable profile fields (name, email, phone, emergency, qualification). */
    suspend fun updateMyProfile(form: TeacherProfileForm): ApiActionResult = withContext(Dispatchers.IO) {
        try {
            val body = JSONObject().apply {
                put("name", form.name.trim())
                put("email", form.email.trim())
                put("contact_number", form.contactNumber.trim())
                put("emergency_contact", form.emergencyContact.trim())
                put("qualification", form.qualification.trim())
            }

            val (code, responseText) = sendJson("${sessionManager.baseUrl}/user/profile", "PUT", body)
            val resJson = parseJson(responseText)

            if (code == 200 && resJson != null) {
                val user = parseUser(resJson)
                if (user != null) sessionManager.updateUser(user)
                ApiActionResult(true, "Profile updated successfully!", user)
            } else {
                ApiActionResult(false, firstErrorMessage(resJson) ?: "Failed to update profile")
            }
        } catch (e: Exception) {
            ApiActionResult(false, "Network error: ${e.localizedMessage ?: "Unable to connect to server"}")
        }
    }

    /** Uploads a new avatar image (multipart/form-data, field `image`). */
    suspend fun uploadProfileImage(bytes: ByteArray, fileName: String, mimeType: String): ApiActionResult =
        withContext(Dispatchers.IO) {
            processMultipartUpload(
                url = "${sessionManager.baseUrl}/user/image",
                fieldName = "image",
                fileName = fileName,
                mimeType = mimeType,
                bytes = bytes,
                fallbackSuccess = "Profile picture updated!",
                userKeys = listOf("user")
            )
        }

    /** Saves a signature drawn on-screen as a base64 PNG. */
    suspend fun saveSignatureBase64(base64: String): ApiActionResult = withContext(Dispatchers.IO) {
        try {
            val body = JSONObject().apply { put("signature_base64", base64) }
            val (code, responseText) = sendJson("${sessionManager.baseUrl}/teacher/signature", "POST", body)
            val resJson = parseJson(responseText)

            if (code == 200) {
                val user = parseUser(resJson?.optJSONObject("teacher"))
                if (user != null) sessionManager.updateUser(user)
                ApiActionResult(true, "Signature saved successfully!", user)
            } else {
                ApiActionResult(false, firstErrorMessage(resJson) ?: "Failed to save signature")
            }
        } catch (e: Exception) {
            ApiActionResult(false, "Network error: ${e.localizedMessage ?: "Unable to connect to server"}")
        }
    }

    /** Uploads a signature image file (multipart/form-data, field `signature`). */
    suspend fun uploadSignatureFile(bytes: ByteArray, fileName: String, mimeType: String): ApiActionResult =
        withContext(Dispatchers.IO) {
            processMultipartUpload(
                url = "${sessionManager.baseUrl}/teacher/signature",
                fieldName = "signature",
                fileName = fileName,
                mimeType = mimeType,
                bytes = bytes,
                fallbackSuccess = "Signature uploaded successfully!",
                userKeys = listOf("teacher", "user")
            )
        }

    /** Removes the stored signature from the result cards. */
    suspend fun deleteSignature(): ApiActionResult = withContext(Dispatchers.IO) {
        try {
            val (code, responseText) = sendRaw(
                "${sessionManager.baseUrl}/teacher/signature",
                "DELETE",
                contentType = null,
                body = null
            )
            val resJson = parseJson(responseText)

            if (code == 200) {
                val updated = sessionManager.getUser()?.copy(signature = null)
                if (updated != null) sessionManager.updateUser(updated)
                ApiActionResult(true, "Signature removed.", updated)
            } else {
                ApiActionResult(false, firstErrorMessage(resJson) ?: "Failed to remove signature")
            }
        } catch (e: Exception) {
            ApiActionResult(false, "Network error: ${e.localizedMessage ?: "Unable to connect to server"}")
        }
    }

    private fun processMultipartUpload(
        url: String,
        fieldName: String,
        fileName: String,
        mimeType: String,
        bytes: ByteArray,
        fallbackSuccess: String,
        userKeys: List<String>
    ): ApiActionResult {
        return try {
            val (code, responseText) = postMultipart(url, fieldName, fileName, mimeType, bytes)
            val resJson = parseJson(responseText)

            if (code == 200) {
                var user: UserProfile? = null
                for (key in userKeys) {
                    val obj = resJson?.optJSONObject(key) ?: continue
                    user = parseUser(obj)
                    if (user != null) break
                }
                if (user != null) sessionManager.updateUser(user)

                val message = resJson?.optString("message", "")?.takeIf { it.isNotBlank() } ?: fallbackSuccess
                ApiActionResult(true, message, user)
            } else if (code == 413) {
                ApiActionResult(false, "File is too large. Please choose a smaller image.")
            } else {
                ApiActionResult(false, firstErrorMessage(resJson) ?: "Upload failed (HTTP $code)")
            }
        } catch (e: Exception) {
            ApiActionResult(false, "Network error: ${e.localizedMessage ?: "Unable to connect to server"}")
        }
    }

    // ─── JSON Helpers ──────────────────────────────────────────────

    private fun parseUser(obj: JSONObject?): UserProfile? {
        if (obj == null) return null
        val id = obj.optLong("id", -1L)
        if (id == -1L) return null

        return UserProfile(
            id = id,
            name = obj.optString("name", "Teacher"),
            email = obj.stringOrNull("email"),
            contact_number = obj.stringOrNull("contact_number"),
            role_id = obj.optInt("role_id", 2),
            is_active = obj.optBoolean("is_active", true),
            className = obj.optJSONObject("academy_class")?.optString("name"),
            sectionName = obj.optJSONObject("section")?.optString("name"),
            majorName = obj.optJSONObject("major")?.optString("name"),
            qualification = obj.stringOrNull("qualification"),
            emergency_contact = obj.stringOrNull("emergency_contact"),
            image = obj.stringOrNull("image"),
            signature = obj.stringOrNull("signature")
        )
    }

    private fun JSONObject.stringOrNull(key: String): String? =
        if (has(key) && !isNull(key)) optString(key).takeIf { it.isNotBlank() } else null

    /** Formats a double without a trailing ".0" for display / input fields. */
    private fun trimDouble(value: Double): String =
        if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()

    private fun firstErrorMessage(json: JSONObject?): String? {
        if (json == null) return null

        val direct = json.optString("message", "")
        if (direct.isNotBlank()) return direct

        val errors = json.optJSONObject("errors") ?: return null
        val keys = errors.keys()
        while (keys.hasNext()) {
            val first = errors.optJSONArray(keys.next())?.optString(0, "")
            if (!first.isNullOrBlank()) return first
        }
        return null
    }

    // ─── Low-level transport ───────────────────────────────────────

    private fun getJson(urlString: String): Pair<Int, String> {
        val url = URL(urlString)
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 15000
            readTimeout = 15000
            doInput = true
            setRequestProperty("Accept", "application/json")
            sessionManager.authToken?.let {
                if (it.isNotBlank()) setRequestProperty("Authorization", "Bearer $it")
            }
        }

        val code = conn.responseCode
        val inputStream = if (code in 200..299) conn.inputStream else conn.errorStream
        val responseText = inputStream?.let { stream ->
            BufferedReader(InputStreamReader(stream, "UTF-8")).use { it.readText() }
        } ?: ""

        conn.disconnect()
        return Pair(code, responseText)
    }

    private fun postJson(urlString: String, json: JSONObject): Pair<Int, String> =
        sendJson(urlString, "POST", json)

    private fun sendJson(urlString: String, method: String, json: JSONObject): Pair<Int, String> =
        sendRaw(
            urlString,
            method,
            contentType = "application/json; charset=UTF-8",
            body = json.toString().toByteArray(Charsets.UTF_8)
        )

    private fun postMultipart(
        urlString: String,
        fieldName: String,
        fileName: String,
        mimeType: String,
        bytes: ByteArray
    ): Pair<Int, String> {
        val boundary = "----KipsFormBoundary" + java.util.UUID.randomUUID().toString().replace("-", "")
        val header = buildString {
            append("--").append(boundary).append("\r\n")
            append("Content-Disposition: form-data; name=\"").append(fieldName)
                .append("\"; filename=\"").append(fileName).append("\"\r\n")
            append("Content-Type: ").append(mimeType).append("\r\n\r\n")
        }.toByteArray(Charsets.UTF_8)
        val footer = "\r\n--$boundary--\r\n".toByteArray(Charsets.UTF_8)

        val body = ByteArray(header.size + bytes.size + footer.size)
        System.arraycopy(header, 0, body, 0, header.size)
        System.arraycopy(bytes, 0, body, header.size, bytes.size)
        System.arraycopy(footer, 0, body, header.size + bytes.size, footer.size)

        return sendRaw(urlString, "POST", "multipart/form-data; boundary=$boundary", body)
    }

    private fun sendRaw(
        urlString: String,
        method: String,
        contentType: String?,
        body: ByteArray?
    ): Pair<Int, String> {
        val url = URL(urlString)
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 30000
            readTimeout = 30000
            doInput = true
            if (body != null) doOutput = true
            setRequestProperty("Accept", "application/json")
            if (contentType != null) setRequestProperty("Content-Type", contentType)
            sessionManager.authToken?.let {
                if (it.isNotBlank()) setRequestProperty("Authorization", "Bearer $it")
            }
        }

        if (body != null) {
            conn.outputStream.use { out ->
                out.write(body)
                out.flush()
            }
        }

        val code = conn.responseCode
        val inputStream = if (code in 200..299) conn.inputStream else conn.errorStream
        val responseText = inputStream?.let { stream ->
            BufferedReader(InputStreamReader(stream, "UTF-8")).use { it.readText() }
        } ?: ""

        conn.disconnect()
        return Pair(code, responseText)
    }

    private fun parseJson(text: String): JSONObject? {
        return try {
            if (text.isNotBlank()) JSONObject(text) else null
        } catch (_: Exception) {
            null
        }
    }

    private fun parseJsonArray(text: String): org.json.JSONArray? {
        return try {
            if (text.isNotBlank()) org.json.JSONArray(text) else null
        } catch (_: Exception) {
            null
        }
    }
}
