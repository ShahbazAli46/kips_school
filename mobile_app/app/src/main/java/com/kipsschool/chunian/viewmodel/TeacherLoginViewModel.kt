package com.kipsschool.chunian.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kipsschool.chunian.data.api.ApiClient
import com.kipsschool.chunian.data.local.SessionManager
import com.kipsschool.chunian.data.model.AuthScreenState
import com.kipsschool.chunian.data.model.UserProfile
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class TeacherLoginViewModel(
    private val apiClient: ApiClient,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _screenState = MutableStateFlow<AuthScreenState>(
        if (sessionManager.isLoggedIn && sessionManager.getUser() != null) {
            AuthScreenState.Authenticated(sessionManager.getUser()!!)
        } else {
            AuthScreenState.EnterIdentifier
        }
    )
    val screenState: StateFlow<AuthScreenState> = _screenState.asStateFlow()

    private val _identifier = MutableStateFlow(sessionManager.rememberedIdentifier)
    val identifier: StateFlow<String> = _identifier.asStateFlow()

    private val _password = MutableStateFlow("")
    val password: StateFlow<String> = _password.asStateFlow()

    private val _otp = MutableStateFlow("")
    val otp: StateFlow<String> = _otp.asStateFlow()

    private val _migrateEmail = MutableStateFlow("")
    val migrateEmail: StateFlow<String> = _migrateEmail.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    private val _resendCountdown = MutableStateFlow(0)
    val resendCountdown: StateFlow<Int> = _resendCountdown.asStateFlow()

    private val _serverUrl = MutableStateFlow(sessionManager.baseUrl)
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    private var countdownJob: Job? = null

    fun setIdentifier(value: String) {
        _identifier.value = value.trim()
        _errorMessage.value = null
    }

    fun setPassword(value: String) {
        _password.value = value
        _errorMessage.value = null
    }

    fun setOtp(value: String) {
        _otp.value = value
        _errorMessage.value = null
    }

    fun setMigrateEmail(value: String) {
        _migrateEmail.value = value.trim()
        _errorMessage.value = null
    }

    fun setServerUrl(url: String) {
        sessionManager.baseUrl = url
        _serverUrl.value = sessionManager.baseUrl
    }

    val isEmailFormat: Boolean
        get() = android.util.Patterns.EMAIL_ADDRESS.matcher(_identifier.value).matches()

    val isPhoneFormat: Boolean
        get() = _identifier.value.isNotEmpty() && !isEmailFormat

    fun submitLogin() {
        val currentId = _identifier.value.trim()
        if (currentId.isEmpty()) {
            _errorMessage.value = "Please enter your email or mobile number"
            return
        }

        // If phone format and password not yet prompted, advance to password step
        if (isPhoneFormat && _screenState.value !is AuthScreenState.EnterPassword) {
            _screenState.value = AuthScreenState.EnterPassword(currentId)
            return
        }

        if (isPhoneFormat && _password.value.isEmpty()) {
            _errorMessage.value = "Please enter your password"
            return
        }

        _isLoading.value = true
        _errorMessage.value = null
        _successMessage.value = null

        viewModelScope.launch {
            val result = apiClient.login(
                identifier = currentId,
                password = if (isPhoneFormat) _password.value else null
            )
            _isLoading.value = false

            if (result.success && result.requiresOtp) {
                sessionManager.rememberedIdentifier = currentId
                _otp.value = ""
                _successMessage.value = result.message
                _screenState.value = AuthScreenState.VerifyOtp(currentId)
                startResendCountdown()
            } else if (result.requiresMigration) {
                _screenState.value = AuthScreenState.MigrateEmail(currentId, _password.value)
                _errorMessage.value = result.message
            } else if (result.alreadyMigrated) {
                _errorMessage.value = result.message
            } else {
                _errorMessage.value = result.message
            }
        }
    }

    fun submitMigration() {
        val email = _migrateEmail.value.trim()
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            _errorMessage.value = "Please enter a valid email address"
            return
        }

        val state = _screenState.value as? AuthScreenState.MigrateEmail ?: return

        _isLoading.value = true
        _errorMessage.value = null

        viewModelScope.launch {
            val result = apiClient.migrateEmail(state.phone, state.password, email)
            _isLoading.value = false

            if (result.success) {
                _identifier.value = email
                _otp.value = ""
                _successMessage.value = result.message
                _screenState.value = AuthScreenState.VerifyOtp(email)
                startResendCountdown()
            } else {
                _errorMessage.value = result.message
            }
        }
    }

    fun verifyOtp() {
        val currentOtp = _otp.value.trim()
        if (currentOtp.length != 6) {
            _errorMessage.value = "Please enter complete 6-digit code"
            return
        }

        val emailToVerify = _identifier.value.trim()

        _isLoading.value = true
        _errorMessage.value = null

        viewModelScope.launch {
            val result = apiClient.verifyOtp(emailToVerify, currentOtp)
            _isLoading.value = false

            if (result.success && result.user != null) {
                _successMessage.value = "Welcome back, ${result.user.name}!"
                _screenState.value = AuthScreenState.Authenticated(result.user)
            } else {
                _errorMessage.value = result.message
            }
        }
    }

    fun resendOtp() {
        if (_resendCountdown.value > 0 || _isLoading.value) return

        val id = _identifier.value.trim()
        _isLoading.value = true
        _errorMessage.value = null

        viewModelScope.launch {
            val result = apiClient.login(id, null)
            _isLoading.value = false

            if (result.success) {
                _successMessage.value = "New verification code sent!"
                startResendCountdown()
            } else {
                _errorMessage.value = result.message
            }
        }
    }

    private fun startResendCountdown(seconds: Int = 60) {
        countdownJob?.cancel()
        _resendCountdown.value = seconds
        countdownJob = viewModelScope.launch {
            while (_resendCountdown.value > 0) {
                delay(1000)
                _resendCountdown.value -= 1
            }
        }
    }

    fun backToIdentifier() {
        _errorMessage.value = null
        _successMessage.value = null
        _password.value = ""
        _otp.value = ""
        _screenState.value = AuthScreenState.EnterIdentifier
    }

    fun logout() {
        sessionManager.clear()
        _otp.value = ""
        _password.value = ""
        _screenState.value = AuthScreenState.EnterIdentifier
    }
}
