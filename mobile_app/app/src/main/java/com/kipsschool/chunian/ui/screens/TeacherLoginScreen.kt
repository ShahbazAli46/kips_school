package com.kipsschool.chunian.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kipsschool.chunian.data.local.SessionManager
import com.kipsschool.chunian.data.model.AuthScreenState
import com.kipsschool.chunian.ui.components.AnimatedFireflyField
import com.kipsschool.chunian.ui.components.AnimatedGlassCard
import com.kipsschool.chunian.ui.components.AnimatedOtpInput
import com.kipsschool.chunian.ui.components.GlowingKipsLogo
import com.kipsschool.chunian.ui.theme.AuraGold
import com.kipsschool.chunian.ui.theme.CobaltBlue
import com.kipsschool.chunian.ui.theme.CoralError
import com.kipsschool.chunian.ui.theme.EmeraldSuccess
import com.kipsschool.chunian.ui.theme.MidnightNavy
import com.kipsschool.chunian.ui.theme.SkyGlow
import com.kipsschool.chunian.ui.theme.SkyPrimary
import com.kipsschool.chunian.ui.theme.TextSkyMuted
import com.kipsschool.chunian.ui.theme.TextSlate
import com.kipsschool.chunian.ui.theme.TextWhite
import com.kipsschool.chunian.viewmodel.TeacherLoginViewModel

@Composable
fun TeacherLoginScreen(
    viewModel: TeacherLoginViewModel,
    modifier: Modifier = Modifier
) {
    val screenState by viewModel.screenState.collectAsState()
    val identifier by viewModel.identifier.collectAsState()
    val password by viewModel.password.collectAsState()
    val otp by viewModel.otp.collectAsState()
    val migrateEmail by viewModel.migrateEmail.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val successMessage by viewModel.successMessage.collectAsState()
    val resendCountdown by viewModel.resendCountdown.collectAsState()
    val serverUrl by viewModel.serverUrl.collectAsState()

    val focusManager = LocalFocusManager.current
    var showServerDialog by remember { mutableStateOf(false) }

    // If authenticated, show Teacher Welcome Screen
    if (screenState is AuthScreenState.Authenticated) {
        val user = (screenState as AuthScreenState.Authenticated).user
        TeacherWelcomeScreen(
            user = user,
            onLogout = { viewModel.logout() }
        )
        return
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MidnightNavy)
    ) {
        // Layer 0: Bioluminescent Fireflies Field Animation
        AnimatedFireflyField(particleCount = 38)

        // Main Scrollable Container
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // Animated Floating KIPS Logo & Faculty Header
            GlowingKipsLogo()

            Spacer(modifier = Modifier.height(26.dp))

            // Animated Crystal Glass Card
            AnimatedGlassCard(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Feedback Messages (Animated Error & Success Banners)
                    AnimatedVisibility(
                        visible = errorMessage != null,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        errorMessage?.let { msg ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 14.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(CoralError.copy(alpha = 0.15f))
                                    .border(1.dp, CoralError.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                                    .padding(12.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(text = "⚠️", fontSize = 14.sp)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = msg,
                                        color = Color(0xFFFCA5A5),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }

                    AnimatedVisibility(
                        visible = successMessage != null,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        successMessage?.let { msg ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 14.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(EmeraldSuccess.copy(alpha = 0.15f))
                                    .border(1.dp, EmeraldSuccess.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                                    .padding(12.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(text = "✅", fontSize = 14.sp)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = msg,
                                        color = Color(0xFF6EE7B7),
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }

                    // Multi-Stage Animated Content Transitions
                    AnimatedContent(
                        targetState = screenState,
                        transitionSpec = {
                            if (targetState is AuthScreenState.VerifyOtp) {
                                (slideInHorizontally { width -> width } + fadeIn()).togetherWith(
                                    slideOutHorizontally { width -> -width } + fadeOut()
                                )
                            } else {
                                (slideInHorizontally { width -> -width } + fadeIn()).togetherWith(
                                    slideOutHorizontally { width -> width } + fadeOut()
                                )
                            }
                        },
                        label = "auth_stage_transition"
                    ) { targetState ->
                        when (targetState) {
                            is AuthScreenState.EnterIdentifier, is AuthScreenState.EnterPassword -> {
                                StageIdentifier(
                                    identifier = identifier,
                                    onIdentifierChange = { viewModel.setIdentifier(it) },
                                    password = password,
                                    onPasswordChange = { viewModel.setPassword(it) },
                                    isPhone = viewModel.isPhoneFormat,
                                    isLoading = isLoading,
                                    onSubmit = {
                                        focusManager.clearFocus()
                                        viewModel.submitLogin()
                                    }
                                )
                            }

                            is AuthScreenState.VerifyOtp -> {
                                StageOtp(
                                    identifier = targetState.identifier,
                                    otp = otp,
                                    onOtpChange = { viewModel.setOtp(it) },
                                    isError = errorMessage != null,
                                    isLoading = isLoading,
                                    resendCountdown = resendCountdown,
                                    onResend = { viewModel.resendOtp() },
                                    onBack = { viewModel.backToIdentifier() },
                                    onSubmit = {
                                        focusManager.clearFocus()
                                        viewModel.verifyOtp()
                                    }
                                )
                            }

                            is AuthScreenState.MigrateEmail -> {
                                StageMigrateEmail(
                                    migrateEmail = migrateEmail,
                                    onMigrateEmailChange = { viewModel.setMigrateEmail(it) },
                                    isLoading = isLoading,
                                    onBack = { viewModel.backToIdentifier() },
                                    onSubmit = {
                                        focusManager.clearFocus()
                                        viewModel.submitMigration()
                                    }
                                )
                            }

                            is AuthScreenState.Authenticated -> {
                                Box(modifier = Modifier.size(1.dp))
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Bottom Server Environment Switcher Pill
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(100.dp))
                    .background(Color(0x1AFFFFFF))
                    .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(100.dp))
                    .clickable { showServerDialog = !showServerDialog }
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(7.dp)
                        .clip(CircleShape)
                        .background(if (serverUrl.contains("kips.usachunian.com")) AuraGold else EmeraldSuccess)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (serverUrl.contains("kips.usachunian.com")) "Server: Live VPS" else "Server: Local (${serverUrl.substringAfter("://").substringBefore("/")})",
                    color = TextSkyMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = "⚙️", fontSize = 10.sp)
            }

            // Server Dialog
            AnimatedVisibility(visible = showServerDialog) {
                Column(
                    modifier = Modifier
                        .padding(top = 10.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xEE0B132B))
                        .border(1.dp, SkyGlow.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
                        .padding(12.dp)
                ) {
                    Text(
                        text = "Select Backend Endpoint",
                        color = TextWhite,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    ServerOption(
                        title = "Android Emulator (10.0.2.2:8000)",
                        selected = serverUrl == SessionManager.DEFAULT_LOCAL_EMULATOR_URL,
                        onClick = {
                            viewModel.setServerUrl(SessionManager.DEFAULT_LOCAL_EMULATOR_URL)
                            showServerDialog = false
                        }
                    )
                    ServerOption(
                        title = "Live Production (kips.usachunian.com)",
                        selected = serverUrl == SessionManager.DEFAULT_LIVE_SERVER_URL,
                        onClick = {
                            viewModel.setServerUrl(SessionManager.DEFAULT_LIVE_SERVER_URL)
                            showServerDialog = false
                        }
                    )
                    ServerOption(
                        title = "Localhost Direct (127.0.0.1:8000)",
                        selected = serverUrl == "http://127.0.0.1:8000/api",
                        onClick = {
                            viewModel.setServerUrl("http://127.0.0.1:8000/api")
                            showServerDialog = false
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun ServerOption(title: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(if (selected) SkyPrimary.copy(alpha = 0.25f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = if (selected) "✓" else "•",
            color = if (selected) SkyGlow else TextSlate,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.width(18.dp)
        )
        Text(
            text = title,
            color = if (selected) TextWhite else TextSkyMuted,
            fontSize = 12.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
        )
    }
}

@Composable
private fun StageIdentifier(
    identifier: String,
    onIdentifierChange: (String) -> Unit,
    password: String,
    onPasswordChange: (String) -> Unit,
    isPhone: Boolean,
    isLoading: Boolean,
    onSubmit: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Official Faculty Sign In",
            color = TextWhite,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Enter your registered email address or phone",
            color = TextSkyMuted.copy(alpha = 0.8f),
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(18.dp))

        // Identifier input
        OutlinedTextField(
            value = identifier,
            onValueChange = onIdentifierChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Email or Mobile Number", color = TextSkyMuted) },
            placeholder = { Text("teacher@example.com or 03001234567", color = TextSlate) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = if (isPhone) ImeAction.Next else ImeAction.Done
            ),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextWhite,
                unfocusedTextColor = TextWhite,
                focusedBorderColor = SkyGlow,
                unfocusedBorderColor = Color(0x3338BDF8),
                focusedContainerColor = Color(0x0EFFFFFF),
                unfocusedContainerColor = Color(0x06FFFFFF)
            ),
            shape = RoundedCornerShape(14.dp)
        )

        // Smooth Animated Expand for Password when Phone Number entered
        AnimatedVisibility(
            visible = isPhone,
            enter = expandVertically(spring(dampingRatio = 0.6f, stiffness = 300f)) + fadeIn(),
            exit = shrinkVertically() + fadeOut()
        ) {
            Column {
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = password,
                    onValueChange = onPasswordChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Account Password / ID", color = TextSkyMuted) },
                    placeholder = { Text("Enter your password", color = TextSlate) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(onDone = { onSubmit() }),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite,
                        focusedBorderColor = SkyGlow,
                        unfocusedBorderColor = Color(0x3338BDF8),
                        focusedContainerColor = Color(0x0EFFFFFF),
                        unfocusedContainerColor = Color(0x06FFFFFF)
                    ),
                    shape = RoundedCornerShape(14.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Animated Radiant Action Button
        AnimatedGradientButton(
            text = if (isPhone) "Sign In to Portal" else "Send Verification Code",
            isLoading = isLoading,
            onClick = onSubmit
        )
    }
}

@Composable
private fun StageOtp(
    identifier: String,
    otp: String,
    onOtpChange: (String) -> Unit,
    isError: Boolean,
    isLoading: Boolean,
    resendCountdown: Int,
    onResend: () -> Unit,
    onBack: () -> Unit,
    onSubmit: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Enter Verification Code",
            color = TextWhite,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "We sent a 6-digit OTP code to",
            color = TextSkyMuted,
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(4.dp))

        // Email pill
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(SkyGlow.copy(alpha = 0.12f))
                .border(1.dp, SkyGlow.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                .padding(horizontal = 10.dp, vertical = 3.dp)
        ) {
            Text(
                text = identifier,
                color = SkyGlow,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Animated 6-box OTP input
        AnimatedOtpInput(
            otpValue = otp,
            onOtpChange = onOtpChange,
            isError = isError,
            onComplete = onSubmit
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Verify button
        AnimatedGradientButton(
            text = "Verify & Access Portal",
            isLoading = isLoading,
            enabled = otp.length == 6,
            onClick = onSubmit
        )

        Spacer(modifier = Modifier.height(14.dp))

        // Resend Timer Row
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (resendCountdown > 0) {
                Text(
                    text = "Resend code in ${resendCountdown}s",
                    color = TextSlate,
                    fontSize = 12.sp
                )
            } else {
                TextButton(onClick = onResend) {
                    Text(
                        text = "Resend Code",
                        color = SkyGlow,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        TextButton(onClick = onBack) {
            Text(
                text = "← Use Different Account",
                color = TextSkyMuted.copy(alpha = 0.8f),
                fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun StageMigrateEmail(
    migrateEmail: String,
    onMigrateEmailChange: (String) -> Unit,
    isLoading: Boolean,
    onBack: () -> Unit,
    onSubmit: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "Account Security Setup",
            color = TextWhite,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Please link your official email address to proceed.",
            color = TextSkyMuted,
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(18.dp))

        OutlinedTextField(
            value = migrateEmail,
            onValueChange = onMigrateEmailChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("New Email Address", color = TextSkyMuted) },
            placeholder = { Text("your.email@example.com", color = TextSlate) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextWhite,
                unfocusedTextColor = TextWhite,
                focusedBorderColor = SkyGlow,
                unfocusedBorderColor = Color(0x3338BDF8),
                focusedContainerColor = Color(0x0EFFFFFF),
                unfocusedContainerColor = Color(0x06FFFFFF)
            ),
            shape = RoundedCornerShape(14.dp)
        )

        Spacer(modifier = Modifier.height(20.dp))

        AnimatedGradientButton(
            text = "Link Email & Send Code",
            isLoading = isLoading,
            onClick = onSubmit
        )

        Spacer(modifier = Modifier.height(8.dp))

        TextButton(
            onClick = onBack,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        ) {
            Text(
                text = "← Back to Login",
                color = TextSkyMuted,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun AnimatedGradientButton(
    text: String,
    isLoading: Boolean,
    enabled: Boolean = true,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isPressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "btn_scale"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .scale(scale)
            .clip(RoundedCornerShape(14.dp))
            .background(
                brush = Brush.horizontalGradient(
                    colors = if (enabled) listOf(
                        SkyPrimary,
                        CobaltBlue,
                        SkyPrimary
                    ) else listOf(
                        Color(0xFF334155),
                        Color(0xFF1E293B)
                    )
                )
            )
            .border(
                width = 1.dp,
                brush = Brush.horizontalGradient(
                    listOf(SkyGlow.copy(alpha = 0.8f), AuraGold.copy(alpha = 0.5f))
                ),
                shape = RoundedCornerShape(14.dp)
            )
            .clickable(enabled = enabled && !isLoading) {
                isPressed = true
                onClick()
                isPressed = false
            }
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                color = TextWhite,
                strokeWidth = 2.5.dp,
                modifier = Modifier.size(24.dp)
            )
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = text,
                    color = if (enabled) TextWhite else TextSlate,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "→",
                    color = if (enabled) AuraGold else TextSlate,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
