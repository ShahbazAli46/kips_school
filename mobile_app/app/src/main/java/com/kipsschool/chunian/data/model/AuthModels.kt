package com.kipsschool.chunian.data.model

data class UserProfile(
    val id: Long,
    val name: String,
    val email: String?,
    val contact_number: String?,
    val role_id: Int,
    val is_active: Boolean = true,
    val className: String? = null,
    val sectionName: String? = null,
    val majorName: String? = null,
    val permissions: List<String> = emptyList()
)

data class LoginResult(
    val success: Boolean,
    val message: String,
    val requiresOtp: Boolean = false,
    val requiresMigration: Boolean = false,
    val alreadyMigrated: Boolean = false,
    val token: String? = null,
    val user: UserProfile? = null
)

sealed class AuthScreenState {
    data object EnterIdentifier : AuthScreenState()
    data class EnterPassword(val phone: String) : AuthScreenState()
    data class VerifyOtp(val identifier: String) : AuthScreenState()
    data class MigrateEmail(val phone: String, val password: String) : AuthScreenState()
    data class Authenticated(val user: UserProfile) : AuthScreenState()
}
