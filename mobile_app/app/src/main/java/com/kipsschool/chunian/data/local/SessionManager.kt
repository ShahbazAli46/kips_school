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
        private const val KEY_QUALIFICATION = "qualification"
        private const val KEY_EMERGENCY_CONTACT = "emergency_contact"
        private const val KEY_USER_IMAGE = "user_image"
        private const val KEY_USER_SIGNATURE = "user_signature"
        private const val KEY_REMEMBERED_IDENTIFIER = "remembered_identifier"
        private const val KEY_BASE_URL = "base_url"

        // Default URLs
        const val DEFAULT_LOCAL_EMULATOR_URL = "http://10.0.2.2:8000/api"
        const val DEFAULT_LOCAL_DEVICE_URL = "http://127.0.0.1:8000/api"
        const val DEFAULT_LIVE_SERVER_URL = "https://kips.usachunian.com/api"

        private val isEmulator: Boolean
            get() = (android.os.Build.BRAND.startsWith("generic") && android.os.Build.DEVICE.startsWith("generic"))
                    || android.os.Build.FINGERPRINT.startsWith("generic")
                    || android.os.Build.HARDWARE.contains("goldfish")
                    || android.os.Build.HARDWARE.contains("ranchu")
                    || android.os.Build.PRODUCT.contains("sdk")
                    || android.os.Build.PRODUCT.contains("emulator")

        /** Default backend base URL. Emulator → 10.0.2.2 (host loopback); physical device → dev API
         * (192.168.100.56:8001) for testing on the dev database. `127.0.0.1` on a phone refers to
         * the phone itself, never the dev Mac. Switch to live server when ready to merge to main. */
        val DEFAULT_LOCAL_URL: String
            get() = if (isEmulator) DEFAULT_LOCAL_EMULATOR_URL else "http://192.168.100.56:8001/api"
    }

    var baseUrl: String
        get() {
            var url = prefs.getString(KEY_BASE_URL, DEFAULT_LOCAL_URL) ?: DEFAULT_LOCAL_URL
            // Migrate stale localhost URLs stored on physical devices → dev API,
            // because 127.0.0.1 on a phone refers to the phone, not the dev Mac.
            if (!isEmulator && (url.contains("127.0.0.1") || url.contains("localhost"))) {
                url = "http://192.168.100.56:8001/api"
                prefs.edit().putString(KEY_BASE_URL, url).apply()
            }
            return url.trimEnd('/')
        }
        set(value) = prefs.edit().putString(KEY_BASE_URL, value.trimEnd('/')).apply()

    var authToken: String?
        get() = prefs.getString(KEY_AUTH_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_AUTH_TOKEN, value).apply()

    var rememberedIdentifier: String
        get() = prefs.getString(KEY_REMEMBERED_IDENTIFIER, "") ?: ""
        set(value) = prefs.edit().putString(KEY_REMEMBERED_IDENTIFIER, value).apply()

    fun saveUser(token: String, user: UserProfile) {
        authToken = token
        updateUser(user)
    }

    /** Updates the cached profile fields without touching the auth token. */
    fun updateUser(user: UserProfile) {
        prefs.edit().apply {
            putLong(KEY_USER_ID, user.id)
            putString(KEY_USER_NAME, user.name)
            putString(KEY_USER_EMAIL, user.email)
            putString(KEY_USER_PHONE, user.contact_number)
            putInt(KEY_ROLE_ID, user.role_id)
            putString(KEY_QUALIFICATION, user.qualification)
            putString(KEY_EMERGENCY_CONTACT, user.emergency_contact)
            putString(KEY_USER_IMAGE, user.image)
            putString(KEY_USER_SIGNATURE, user.signature)
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
            is_active = true,
            qualification = prefs.getString(KEY_QUALIFICATION, null),
            emergency_contact = prefs.getString(KEY_EMERGENCY_CONTACT, null),
            image = prefs.getString(KEY_USER_IMAGE, null),
            signature = prefs.getString(KEY_USER_SIGNATURE, null)
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
