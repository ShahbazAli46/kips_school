package com.kipsschool.chunian.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.kipsschool.chunian.data.model.SignatureInputMode
import com.kipsschool.chunian.data.model.TeacherProfileForm
import com.kipsschool.chunian.data.model.UserProfile
import com.kipsschool.chunian.data.util.ImageUtils
import com.kipsschool.chunian.ui.components.RemoteImage
import com.kipsschool.chunian.ui.components.SignaturePad
import com.kipsschool.chunian.ui.components.rememberSignatureState
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
import com.kipsschool.chunian.ui.theme.CoralError
import com.kipsschool.chunian.ui.theme.EmeraldSuccess
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

@Composable
fun TeacherProfileContent(
    profile: UserProfile?,
    form: TeacherProfileForm,
    isLoading: Boolean,
    isSaving: Boolean,
    isUploadingImage: Boolean,
    isSavingSignature: Boolean,
    isDeletingSignature: Boolean,
    signatureMode: SignatureInputMode,
    feedbackMessage: String?,
    feedbackIsError: Boolean,
    resolveMediaUrl: (String?) -> String?,
    onNameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onEmergencyChange: (String) -> Unit,
    onQualificationChange: (String) -> Unit,
    onSaveProfile: () -> Unit,
    onProfileImagePicked: (ByteArray, String, String) -> Unit,
    onSignatureModeChange: (SignatureInputMode) -> Unit,
    onDrawnSignature: (String) -> Unit,
    onSignatureFilePicked: (ByteArray, String, String) -> Unit,
    onDeleteSignature: () -> Unit
) {
    val context = LocalContext.current
    var showSignatureSheet by remember { mutableStateOf(false) }

    val avatarPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        val bytes = ImageUtils.readScaledJpeg(context, uri) ?: return@rememberLauncherForActivityResult
        onProfileImagePicked(bytes, "avatar_${System.currentTimeMillis()}.jpg", "image/jpeg")
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
    ) {
        Spacer(modifier = Modifier.height(12.dp))

        // ─── Identity header ───────────────────────────────────────
        IdentityHeader(
            profile = profile,
            isUploadingImage = isUploadingImage,
            resolveMediaUrl = resolveMediaUrl,
            onChangePhoto = { avatarPicker.launch("image/*") }
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (feedbackMessage != null) {
            FeedbackBanner(message = feedbackMessage, isError = feedbackIsError)
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (isLoading && profile == null) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = SkyGlow, strokeWidth = 2.5.dp)
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Loading faculty profile...", color = TextSubheading, fontSize = 12.sp)
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
            return@Column
        }

        // ─── Profile settings form ─────────────────────────────────
        SectionCard(title = "👤 Faculty Profile Settings") {
            ProfileField(
                label = "FULL NAME *",
                value = form.name,
                onValueChange = onNameChange,
                placeholder = "e.g. Ahmed Raza"
            )
            Spacer(modifier = Modifier.height(12.dp))
            ProfileField(
                label = "EMAIL ADDRESS",
                value = form.email,
                onValueChange = onEmailChange,
                placeholder = "teacher@example.com",
                keyboardType = KeyboardType.Email
            )
            Spacer(modifier = Modifier.height(12.dp))
            ProfileField(
                label = "CONTACT PHONE",
                value = form.contactNumber,
                onValueChange = onPhoneChange,
                placeholder = "03001234567",
                keyboardType = KeyboardType.Phone
            )
            Spacer(modifier = Modifier.height(12.dp))
            ProfileField(
                label = "EMERGENCY CONTACT",
                value = form.emergencyContact,
                onValueChange = onEmergencyChange,
                placeholder = "Next of kin phone number",
                keyboardType = KeyboardType.Phone
            )
            Spacer(modifier = Modifier.height(12.dp))
            ProfileField(
                label = "QUALIFICATION & SPECIALIZATION",
                value = form.qualification,
                onValueChange = onQualificationChange,
                placeholder = "e.g. M.Phil Physics, B.Sc Mathematics"
            )

            Spacer(modifier = Modifier.height(18.dp))

            PrimaryActionButton(
                text = "Save Profile Changes",
                icon = "💾",
                isLoading = isSaving,
                onClick = onSaveProfile
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // ─── Digital signature ─────────────────────────────────────
        SectionCard(title = "✒️ Digital Signature") {
            Text(
                text = "Your official signature is automatically rendered on the Result Cards of the classes you teach.",
                color = TextMuted,
                fontSize = 11.sp,
                lineHeight = 16.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White)
                    .border(1.dp, Color(0x33475569), RoundedCornerShape(12.dp))
                    .padding(10.dp),
                contentAlignment = Alignment.Center
            ) {
                if (profile?.hasSignature == true) {
                    RemoteImage(
                        url = resolveMediaUrl(profile.signature),
                        contentDescription = "Teacher signature",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit,
                        placeholder = { CircularProgressIndicator(color = Brand900, strokeWidth = 2.dp) },
                        fallback = {
                            Text("Signature unavailable", color = Color(0xFF94A3B8), fontSize = 12.sp)
                        }
                    )
                } else {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "✒️", fontSize = 26.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "No signature uploaded yet",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp
                        )
                    }
                }
            }

            if (profile?.hasSignature == true) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "✓ Active on Result Cards",
                    color = EmeraldSuccess,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    PrimaryActionButton(
                        text = if (profile?.hasSignature == true) "Update Signature" else "Add Signature",
                        icon = "✒️",
                        isLoading = false,
                        onClick = { showSignatureSheet = true }
                    )
                }

                if (profile?.hasSignature == true) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(50.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(BannerErrorBg)
                            .border(1.dp, BannerErrorBorder, RoundedCornerShape(12.dp))
                            .clickable(enabled = !isDeletingSignature, onClick = onDeleteSignature)
                    ) {
                        if (isDeletingSignature) {
                            CircularProgressIndicator(color = CoralError, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                        } else {
                            Text(text = "🗑", fontSize = 18.sp)
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(30.dp))
    }

    if (showSignatureSheet) {
        SignatureSheet(
            signatureMode = signatureMode,
            isSaving = isSavingSignature,
            onModeChange = onSignatureModeChange,
            onDismiss = { showSignatureSheet = false },
            onSaveDrawn = { base64 ->
                onDrawnSignature(base64)
                showSignatureSheet = false
            },
            onSaveUploaded = { bytes, name, mime ->
                onSignatureFilePicked(bytes, name, mime)
                showSignatureSheet = false
            }
        )
    }
}

@Composable
private fun IdentityHeader(
    profile: UserProfile?,
    isUploadingImage: Boolean,
    resolveMediaUrl: (String?) -> String?,
    onChangePhoto: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Brand900.copy(alpha = 0.85f))
            .border(1.dp, Color(0x4D38BDF8), RoundedCornerShape(18.dp))
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(84.dp)
                    .clip(CircleShape)
                    .background(Color(0x1F38BDF8))
                    .border(2.dp, SkyGlow, CircleShape)
            ) {
                RemoteImage(
                    url = resolveMediaUrl(profile?.image),
                    contentDescription = profile?.name,
                    modifier = Modifier.fillMaxSize().clip(CircleShape),
                    contentScale = ContentScale.Crop,
                    placeholder = {
                        Text(text = profile?.initials ?: "T", color = TextHeading, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
                    },
                    fallback = {
                        Text(text = profile?.initials ?: "T", color = TextHeading, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
                    }
                )

                if (isUploadingImage) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color(0x99000000)),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = TextHeading, strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = profile?.name ?: "Teacher",
                    color = TextHeading,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = profile?.email ?: "KIPS Chunian Campus",
                    color = TextMuted,
                    fontSize = 11.sp,
                    maxLines = 1
                )

                if (!profile?.qualification.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(100.dp))
                            .background(AuraGold.copy(alpha = 0.14f))
                            .border(1.dp, AuraGold.copy(alpha = 0.4f), RoundedCornerShape(100.dp))
                            .padding(horizontal = 10.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = profile?.qualification ?: "",
                            color = AuraGold,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                TextButton(
                    onClick = onChangePhoto,
                    enabled = !isUploadingImage,
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 0.dp, vertical = 0.dp)
                ) {
                    Text(
                        text = if (isUploadingImage) "Uploading..." else "📷  Change Photo",
                        color = SkyGlow,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun FeedbackBanner(message: String, isError: Boolean) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (isError) BannerErrorBg else BannerSuccessBg)
            .border(1.dp, if (isError) BannerErrorBorder else BannerSuccessBorder, RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Text(
            text = (if (isError) "⚠️ " else "✅ ") + message,
            color = if (isError) BannerErrorText else BannerSuccessText,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0x1A0F172A))
            .border(1.dp, Color(0x2638BDF8), RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Column {
            Text(
                text = title,
                color = TextHeading,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Color(0x1A38BDF8))
            )
            Spacer(modifier = Modifier.height(14.dp))
            content()
        }
    }
}

@Composable
private fun ProfileField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            color = TextLabel,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.6.sp
        )
        Spacer(modifier = Modifier.height(5.dp))
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(placeholder, color = InputPlaceholder, fontSize = 12.sp) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
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

@Composable
private fun PrimaryActionButton(
    text: String,
    icon: String,
    isLoading: Boolean,
    onClick: () -> Unit
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(ButtonGradientStart, ButtonGradientMid, ButtonGradientEnd)
                )
            )
            .border(1.dp, ButtonBorderSky, RoundedCornerShape(14.dp))
            .clickable(enabled = !isLoading, onClick = onClick)
    ) {
        if (isLoading) {
            CircularProgressIndicator(color = TextHeading, strokeWidth = 2.5.dp, modifier = Modifier.size(22.dp))
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = icon, fontSize = 14.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = text,
                    color = TextHeading,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.3.sp
                )
            }
        }
    }
}

@Composable
private fun SignatureSheet(
    signatureMode: SignatureInputMode,
    isSaving: Boolean,
    onModeChange: (SignatureInputMode) -> Unit,
    onDismiss: () -> Unit,
    onSaveDrawn: (String) -> Unit,
    onSaveUploaded: (ByteArray, String, String) -> Unit
) {
    val context = LocalContext.current
    val signatureState = rememberSignatureState()
    var pickedFileName by remember { mutableStateOf<String?>(null) }
    var pickedMime by remember { mutableStateOf("image/*") }
    var pickedBytes by remember { mutableStateOf<ByteArray?>(null) }
    var localError by remember { mutableStateOf<String?>(null) }

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        val bytes = ImageUtils.readBytes(context, uri) ?: return@rememberLauncherForActivityResult
        pickedBytes = bytes
        pickedMime = ImageUtils.mimeTypeOf(context, uri)
        pickedFileName = "signature_${System.currentTimeMillis()}.${pickedMime.substringAfterLast("/", "png")}"
        localError = null
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(0.94f)
                .clip(RoundedCornerShape(20.dp))
                .background(Brand900)
                .border(1.dp, Color(0x6638BDF8), RoundedCornerShape(20.dp))
                .padding(18.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "✒️  Manage Teacher Signature",
                        color = TextHeading,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f)
                    )
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .clickable(onClick = onDismiss)
                    ) {
                        Text(text = "✕", color = TextMuted, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Mode toggle
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0x33000000))
                        .padding(4.dp)
                ) {
                    SignatureInputMode.values().forEach { mode ->
                        val selected = signatureMode == mode
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(9.dp))
                                .background(if (selected) SkyGlow.copy(alpha = 0.22f) else Color.Transparent)
                                .clickable(enabled = !isSaving) {
                                    onModeChange(mode)
                                    localError = null
                                }
                                .padding(vertical = 8.dp)
                        ) {
                            Text(
                                text = mode.label,
                                color = if (selected) SkyGlow else TextMuted,
                                fontSize = 12.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                if (signatureMode == SignatureInputMode.DRAW) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(170.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color.White)
                            .border(2.dp, Color(0x33475569), RoundedCornerShape(14.dp))
                    ) {
                        SignaturePad(
                            state = signatureState,
                            modifier = Modifier.fillMaxSize()
                        )

                        if (signatureState.isEmpty) {
                            Text(
                                text = "Sign inside this box",
                                color = Color(0xFF94A3B8),
                                fontSize = 12.sp,
                                modifier = Modifier.align(Alignment.Center)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        TextButton(onClick = { signatureState.clear() }, enabled = !isSaving) {
                            Text(text = "Clear Canvas", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color(0x14FFFFFF))
                            .border(2.dp, Color(0x33FFFFFF), RoundedCornerShape(14.dp))
                            .padding(20.dp)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(text = "🖼", fontSize = 30.sp)
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Choose a transparent PNG signature",
                                color = TextHeading,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = "Max size: 2MB (JPG, PNG, WEBP)",
                                color = TextMuted,
                                fontSize = 10.sp
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Color(0x3338BDF8))
                                    .border(1.dp, SkyGlow, RoundedCornerShape(10.dp))
                                    .clickable(enabled = !isSaving) { filePicker.launch("image/*") }
                                    .padding(horizontal = 16.dp, vertical = 9.dp)
                            ) {
                                Text(
                                    text = "📂  Select Image File",
                                    color = SkyGlow,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            pickedFileName?.let { name ->
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = "Selected: $name",
                                    color = BannerSuccessText,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                }

                localError?.let { error ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(BannerErrorBg)
                            .border(1.dp, BannerErrorBorder, RoundedCornerShape(10.dp))
                            .padding(10.dp)
                    ) {
                        Text(
                            text = "⚠️ $error",
                            color = BannerErrorText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss, enabled = !isSaving) {
                        Text(text = "Cancel", color = TextMuted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                Brush.horizontalGradient(
                                    listOf(ButtonGradientStart, ButtonGradientEnd)
                                )
                            )
                            .border(1.dp, ButtonBorderSky, RoundedCornerShape(12.dp))
                            .clickable(enabled = !isSaving) {
                                localError = null
                                if (signatureMode == SignatureInputMode.DRAW) {
                                    val dataUri = signatureState.toPngBase64DataUri()
                                    if (dataUri == null) {
                                        localError = "Please draw your signature before saving."
                                    } else {
                                        onSaveDrawn(dataUri)
                                    }
                                } else {
                                    val bytes = pickedBytes
                                    val name = pickedFileName
                                    if (bytes == null || name == null) {
                                        localError = "Please select a signature image file first."
                                    } else {
                                        onSaveUploaded(bytes, name, pickedMime)
                                    }
                                }
                            }
                            .padding(horizontal = 18.dp, vertical = 11.dp)
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(color = TextHeading, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                        } else {
                            Text(
                                text = "Save Signature",
                                color = TextHeading,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
