package com.kipsschool.chunian.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
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
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
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
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import kotlinx.coroutines.delay
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kipsschool.chunian.data.local.SessionManager
import com.kipsschool.chunian.data.model.AuthScreenState
import com.kipsschool.chunian.ui.components.AnimatedFireflyField
import com.kipsschool.chunian.ui.components.AnimatedGlassCard
import com.kipsschool.chunian.ui.components.AnimatedOtpInput
import com.kipsschool.chunian.ui.components.GlowingKipsLogo
import com.kipsschool.chunian.ui.theme.AuraGold
import com.kipsschool.chunian.ui.theme.BannerErrorBg
import com.kipsschool.chunian.ui.theme.BannerErrorBorder
import com.kipsschool.chunian.ui.theme.BannerErrorText
import com.kipsschool.chunian.ui.theme.BannerSuccessBg
import com.kipsschool.chunian.ui.theme.BannerSuccessBorder
import com.kipsschool.chunian.ui.theme.BannerSuccessText
import com.kipsschool.chunian.ui.theme.Brand900
import com.kipsschool.chunian.ui.theme.ButtonBorderSky
import com.kipsschool.chunian.ui.theme.ButtonGradientEnd
import com.kipsschool.chunian.ui.theme.ButtonGradientMid
import com.kipsschool.chunian.ui.theme.ButtonGradientStart
import com.kipsschool.chunian.ui.theme.InputBg
import com.kipsschool.chunian.ui.theme.InputBgFocus
import com.kipsschool.chunian.ui.theme.InputBorderFocus
import com.kipsschool.chunian.ui.theme.InputBorderIdle
import com.kipsschool.chunian.ui.theme.InputPlaceholder
import com.kipsschool.chunian.ui.theme.SkyGlow
import com.kipsschool.chunian.ui.theme.TextHeading
import com.kipsschool.chunian.ui.theme.TextLabel
import com.kipsschool.chunian.ui.theme.TextMuted
import com.kipsschool.chunian.ui.theme.TextSubheading
import com.kipsschool.chunian.ui.theme.WebBackground
import com.kipsschool.chunian.viewmodel.TeacherLoginViewModel
import com.kipsschool.chunian.viewmodel.TeacherPortalViewModel

@Composable
fun TeacherLoginScreen(
    viewModel: TeacherLoginViewModel,
    portalViewModel: TeacherPortalViewModel? = null,
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

    val focusManager = LocalFocusManager.current
    val density = LocalDensity.current
    val imeInsets = WindowInsets.ime
    val isImeOpen = imeInsets.getBottom(density) > 0
    val isOtp = screenState is AuthScreenState.VerifyOtp
    val isCompact = isImeOpen || isOtp
    val scrollState = rememberScrollState()

    LaunchedEffect(isOtp, isImeOpen) {
        if (isOtp || isImeOpen) {
            delay(120)
            scrollState.animateScrollTo(scrollState.maxValue)
        }
    }

    if (screenState is AuthScreenState.Authenticated) {
        val user = (screenState as AuthScreenState.Authenticated).user
        if (portalViewModel != null) {
            TeacherPortalScreen(
                user = user,
                viewModel = portalViewModel,
                onLogout = { viewModel.logout() }
            )
        } else {
            TeacherWelcomeScreen(
                user = user,
                onLogout = { viewModel.logout() }
            )
        }
        return
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(WebBackground)
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() }
            ) { focusManager.clearFocus() }
    ) {
        // Layer 0: Bioluminescent Fireflies Field with web-exact colors & blooms
        AnimatedFireflyField(particleCount = 38)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(
                    horizontal = 24.dp,
                    vertical = if (isCompact) 12.dp else 28.dp
                ),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = if (isCompact) Arrangement.Top else Arrangement.Center
        ) {
            Spacer(modifier = Modifier.height(if (isCompact) 6.dp else 16.dp))

            // Animated Floating KIPS Logo & Header
            GlowingKipsLogo(compact = isCompact)

            Spacer(modifier = Modifier.height(if (isCompact) 10.dp else 24.dp))

            // Crystal Glass Card
            AnimatedGlassCard(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Feedback Banners (exact web bg-red-950/40 and bg-emerald-950/40)
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
                                    .background(BannerErrorBg)
                                    .border(1.dp, BannerErrorBorder, RoundedCornerShape(12.dp))
                                    .padding(12.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(text = "⚠️", fontSize = 14.sp)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = msg,
                                        color = BannerErrorText,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold
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
                                    .background(BannerSuccessBg)
                                    .border(1.dp, BannerSuccessBorder, RoundedCornerShape(12.dp))
                                    .padding(12.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(text = "✅", fontSize = 14.sp)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = msg,
                                        color = BannerSuccessText,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold
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

                    // Exact Web Footer Note (page.tsx line 850)
                    Spacer(modifier = Modifier.height(18.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(Color(0x1AFFFFFF))
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Powered by KIPS Management System",
                        color = TextMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Spacer(modifier = Modifier.height(30.dp))
        }
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
            color = TextHeading,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Enter your registered email address or phone",
            color = TextSubheading,
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(18.dp))

        // Web exact input tokens: bg-white/[0.04], border-white/15, focus:border-sky-400
        OutlinedTextField(
            value = identifier,
            onValueChange = onIdentifierChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Email or Mobile Number", color = TextLabel, fontSize = 12.sp, fontWeight = FontWeight.Bold) },
            placeholder = { Text("teacher@example.com or 03001234567", color = InputPlaceholder, fontSize = 13.sp) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = if (isPhone) ImeAction.Next else ImeAction.Done
            ),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextHeading,
                unfocusedTextColor = TextHeading,
                focusedBorderColor = InputBorderFocus,
                unfocusedBorderColor = InputBorderIdle,
                focusedContainerColor = InputBgFocus,
                unfocusedContainerColor = InputBg
            ),
            shape = RoundedCornerShape(12.dp)
        )

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
                    label = { Text("Account Password / ID", color = TextLabel, fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                    placeholder = { Text("Enter your account password/ID", color = InputPlaceholder, fontSize = 13.sp) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Password,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(onDone = { onSubmit() }),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextHeading,
                        unfocusedTextColor = TextHeading,
                        focusedBorderColor = InputBorderFocus,
                        unfocusedBorderColor = InputBorderIdle,
                        focusedContainerColor = InputBgFocus,
                        unfocusedContainerColor = InputBg
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Web exact button gradient: linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #1d4ed8 100%)
        AnimatedGradientButton(
            text = if (isPhone) "Sign In to Portal" else "Send OTP Code",
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
            text = "Verify Code",
            color = TextHeading,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = "We sent a 6-digit verification code to",
            color = TextSubheading,
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(4.dp))

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

        Spacer(modifier = Modifier.height(14.dp))

        AnimatedOtpInput(
            otpValue = otp,
            onOtpChange = onOtpChange,
            isError = isError,
            onComplete = onSubmit
        )

        Spacer(modifier = Modifier.height(14.dp))

        AnimatedGradientButton(
            text = "Verify & Sign In",
            isLoading = isLoading,
            enabled = otp.length == 6,
            onClick = onSubmit
        )

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (resendCountdown > 0) {
                Text(
                    text = "Resend code in ${resendCountdown}s",
                    color = TextMuted,
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
                text = "← Start Over with Different Account",
                color = TextSubheading,
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
            color = TextHeading,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Please link your email address to continue securely.",
            color = TextSubheading,
            fontSize = 12.sp
        )

        Spacer(modifier = Modifier.height(18.dp))

        OutlinedTextField(
            value = migrateEmail,
            onValueChange = onMigrateEmailChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("New Email Address", color = TextLabel, fontSize = 12.sp, fontWeight = FontWeight.Bold) },
            placeholder = { Text("you@example.com", color = InputPlaceholder, fontSize = 13.sp) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextHeading,
                unfocusedTextColor = TextHeading,
                focusedBorderColor = InputBorderFocus,
                unfocusedBorderColor = InputBorderIdle,
                focusedContainerColor = InputBgFocus,
                unfocusedContainerColor = InputBg
            ),
            shape = RoundedCornerShape(12.dp)
        )

        Spacer(modifier = Modifier.height(20.dp))

        AnimatedGradientButton(
            text = "Link Email & Send OTP",
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
                color = TextSubheading,
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
        animationSpec = spring(),
        label = "btn_scale"
    )

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .scale(scale)
            .clip(RoundedCornerShape(12.dp))
            // Exact web button: linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #1d4ed8 100%)
            .background(
                brush = Brush.horizontalGradient(
                    colors = if (enabled) listOf(
                        ButtonGradientStart,
                        ButtonGradientMid,
                        ButtonGradientEnd
                    ) else listOf(
                        Color(0xFF334155),
                        Color(0xFF1E293B)
                    )
                )
            )
            // Exact web button border: border-sky-400/40
            .border(
                width = 1.dp,
                color = if (enabled) ButtonBorderSky else Color(0x33FFFFFF),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(enabled = enabled && !isLoading) {
                isPressed = true
                onClick()
                isPressed = false
            }
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                color = TextHeading,
                strokeWidth = 2.5.dp,
                modifier = Modifier.size(24.dp)
            )
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = text,
                    color = if (enabled) TextHeading else TextMuted,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "→",
                    color = if (enabled) TextSubheading else TextMuted,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
