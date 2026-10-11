package com.kipsschool.chunian.data.local

import android.content.Context
import android.content.SharedPreferences
import com.kipsschool.chunian.data.model.UserProfile

class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREF_NAME = "kips_teacher_prefs"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_PHONE = "user_phone"
        private const val KEY_ROLE_ID = "role_id"
        private const val KEY_REMEMBERED_IDENTIFIER = "remembered_identifier"
        private const val KEY_BASE_URL = "base_url"

        // Default URLs
        const val DEFAULT_LOCAL_EMULATOR_URL = "http://10.0.2.2:8000/api"
        const val DEFAULT_LIVE_SERVER_URL = "https://kips.usachunian.com/api"
    }

    var baseUrl: String
        get() = prefs.getString(KEY_BASE_URL, DEFAULT_LOCAL_EMULATOR_URL) ?: DEFAULT_LOCAL_EMULATOR_URL
        set(value) = prefs.edit().putString(KEY_BASE_URL, value.trimEnd('/')).apply()

    var authToken: String?
        get() = prefs.getString(KEY_AUTH_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_AUTH_TOKEN, value).apply()

    var rememberedIdentifier: String
        get() = prefs.getString(KEY_REMEMBERED_IDENTIFIER, "") ?: ""
        set(value) = prefs.edit().putString(KEY_REMEMBERED_IDENTIFIER, value).apply()

    fun saveUser(token: String, user: UserProfile) {
        prefs.edit().apply {
            putString(KEY_AUTH_TOKEN, token)
            putLong(KEY_USER_ID, user.id)
            putString(KEY_USER_NAME, user.name)
            putString(KEY_USER_EMAIL, user.email)
            putString(KEY_USER_PHONE, user.contact_number)
            putInt(KEY_ROLE_ID, user.role_id)
            apply()
        }
    }

    fun getUser(): UserProfile? {
        val id = prefs.getLong(KEY_USER_ID, -1L)
        val name = prefs.getString(KEY_USER_NAME, null) ?: return null
        if (id == -1L) return null

        return UserProfile(
            id = id,
            name = name,
            email = prefs.getString(KEY_USER_EMAIL, null),
            contact_number = prefs.getString(KEY_USER_PHONE, null),
            role_id = prefs.getInt(KEY_ROLE_ID, 2),
            is_active = true
        )
    }

    val isLoggedIn: Boolean
        get() = !authToken.isNullOrBlank()

    fun clear() {
        val savedIdentifier = rememberedIdentifier
        val savedBaseUrl = baseUrl
        prefs.edit().clear().apply()
        rememberedIdentifier = savedIdentifier
        baseUrl = savedBaseUrl
    }
}
