package com.kipsschool.chunian.data.api

import com.kipsschool.chunian.data.local.SessionManager
import com.kipsschool.chunian.data.model.LoginResult
import com.kipsschool.chunian.data.model.UserProfile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
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
                    val userProfile = userObj?.let {
                        UserProfile(
                            id = it.optLong("id", -1),
                            name = it.optString("name", "Teacher"),
                            email = it.optString("email", email),
                            contact_number = it.optString("contact_number", null),
                            role_id = it.optInt("role_id", 2),
                            is_active = it.optBoolean("is_active", true),
                            className = it.optJSONObject("academy_class")?.optString("name"),
                            sectionName = it.optJSONObject("section")?.optString("name"),
                            majorName = it.optJSONObject("major")?.optString("name")
                        )
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

    private fun postJson(urlString: String, json: JSONObject): Pair<Int, String> {
        val url = URL(urlString)
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15000
            readTimeout = 15000
            doInput = true
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            setRequestProperty("Accept", "application/json")
            sessionManager.authToken?.let {
                if (it.isNotBlank()) setRequestProperty("Authorization", "Bearer $it")
            }
        }

        OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
            writer.write(json.toString())
            writer.flush()
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
}
