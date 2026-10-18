package com.kipsschool.chunian.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.kipsschool.chunian.data.model.ClassDiaryEntry
import com.kipsschool.chunian.data.model.SignatureInputMode
import com.kipsschool.chunian.data.model.TeacherAssignment
import com.kipsschool.chunian.data.model.TeacherAttendanceRecord
import com.kipsschool.chunian.data.model.TeacherDrawerDestination
import com.kipsschool.chunian.data.model.TeacherProfileForm
import com.kipsschool.chunian.data.model.UserProfile
import com.kipsschool.chunian.data.util.ImageUtils
import com.kipsschool.chunian.ui.components.AnimatedFireflyField
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
import com.kipsschool.chunian.ui.theme.Brand950
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
import com.kipsschool.chunian.ui.theme.WebBackground
import com.kipsschool.chunian.viewmodel.TeacherPortalViewModel
import kotlinx.coroutines.launch

@Composable
fun TeacherPortalScreen(
    user: UserProfile,
    viewModel: TeacherPortalViewModel,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val currentDestination by viewModel.currentDestination.collectAsState()
    val assignments by viewModel.assignments.collectAsState()
    val isLoadingAssignments by viewModel.isLoadingAssignments.collectAsState()
    val feedbackMessage by viewModel.feedbackMessage.collectAsState()
    val isError by viewModel.isError.collectAsState()
    val teacherAttendances by viewModel.teacherAttendances.collectAsState()
    val isLoadingTeacherAttendance by viewModel.isLoadingTeacherAttendance.collectAsState()
    val attendanceMonth by viewModel.attendanceMonth.collectAsState()

    val diaries by viewModel.diaries.collectAsState()
    val isLoadingDiaries by viewModel.isLoadingDiaries.collectAsState()
    val isSavingDiary by viewModel.isSavingDiary.collectAsState()
    val deletingDiaryId by viewModel.deletingDiaryId.collectAsState()
    val diaryAssignment by viewModel.diaryAssignment.collectAsState()
    val diaryDate by viewModel.diaryDate.collectAsState()
    val diaryContent by viewModel.diaryContent.collectAsState()

    val marksAssignment by viewModel.marksAssignment.collectAsState()
    val tests by viewModel.tests.collectAsState()
    val isLoadingTests by viewModel.isLoadingTests.collectAsState()
    val selectedTest by viewModel.selectedTest.collectAsState()
    val markRows by viewModel.markRows.collectAsState()
    val isLoadingMarkStudents by viewModel.isLoadingMarkStudents.collectAsState()
    val isSavingMarks by viewModel.isSavingMarks.collectAsState()

    val profile by viewModel.profile.collectAsState()
    val profileForm by viewModel.profileForm.collectAsState()
    val isLoadingProfile by viewModel.isLoadingProfile.collectAsState()
    val isSavingProfile by viewModel.isSavingProfile.collectAsState()
    val isUploadingImage by viewModel.isUploadingImage.collectAsState()
    val signatureMode by viewModel.signatureMode.collectAsState()
    val isSavingSignature by viewModel.isSavingSignature.collectAsState()
    val isDeletingSignature by viewModel.isDeletingSignature.collectAsState()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = Brand950,
                modifier = Modifier.width(310.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    TeacherDrawerHeader(
                        user = profile ?: user,
                        avatarUrl = viewModel.resolveMediaUrl((profile ?: user).image)
                    )

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider(color = Color(0x3338BDF8), thickness = 1.dp)
                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "TEACHER PORTAL MENU",
                        color = SkyGlow,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.2.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )

                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(TeacherDrawerDestination.values()) { dest ->
                            val isSelected = currentDestination == dest
                            TeacherDrawerItem(
                                destination = dest,
                                isSelected = isSelected,
                                onClick = {
                                    viewModel.selectDestination(dest)
                                    scope.launch { drawerState.close() }
                                }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    HorizontalDivider(color = Color(0x3338BDF8), thickness = 1.dp)
                    Spacer(modifier = Modifier.height(8.dp))

                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(BannerErrorBg)
                            .border(1.dp, BannerErrorBorder, RoundedCornerShape(12.dp))
                            .clickable {
                                onLogout()
                            }
                            .padding(vertical = 12.dp)
                    ) {
                        Text(
                            text = "🚪 Sign Out from Portal",
                            color = BannerErrorText,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    ) {
        Scaffold(
            topBar = {
                TeacherTopBar(
                    title = currentDestination.title,
                    subtitle = currentDestination.subtitle,
                    onOpenDrawer = {
                        scope.launch { drawerState.open() }
                    },
                    onRefresh = {
                        when (currentDestination) {
                            TeacherDrawerDestination.PROFILE -> viewModel.loadProfile()
                            TeacherDrawerDestination.CLASS_DIARY -> {
                                viewModel.loadAssignments()
                                viewModel.loadDiaries()
                            }
                            TeacherDrawerDestination.TEST_MARKS -> {
                                if (viewModel.selectedTest.value != null) {
                                    viewModel.loadTestStudents()
                                } else {
                                    viewModel.loadTeacherTests()
                                }
                            }
                            TeacherDrawerDestination.MY_ATTENDANCE -> {
                                viewModel.loadTeacherAttendance()
                            }
                            else -> viewModel.loadAssignments()
                        }
                    }
                )
            },
            containerColor = WebBackground,
            contentWindowInsets = WindowInsets(0, 0, 0, 0)
        ) { paddingValues ->
            Box(
                modifier = modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .windowInsetsPadding(
                        WindowInsets.safeDrawing.only(
                            WindowInsetsSides.Bottom + WindowInsetsSides.Horizontal
                        )
                    )
                    .background(WebBackground)
            ) {
                AnimatedFireflyField(particleCount = 18)

                when (currentDestination) {
                    TeacherDrawerDestination.OVERVIEW -> {
                        TeacherOverviewScreenContent(
                            user = profile ?: user,
                            assignments = assignments,
                            teacherAttendances = teacherAttendances,
                            isLoadingAttendance = isLoadingTeacherAttendance,
                            onNavigate = { dest -> viewModel.selectDestination(dest) },
                            onDiaryClick = { assign ->
                                viewModel.selectDiaryAssignment(assign)
                                viewModel.selectDestination(TeacherDrawerDestination.CLASS_DIARY)
                            },
                            onMarksClick = { assign ->
                                viewModel.selectMarksAssignment(assign)
                                viewModel.selectDestination(TeacherDrawerDestination.TEST_MARKS)
                            }
                        )
                    }

                    TeacherDrawerDestination.ASSIGNMENTS -> {
                        MyClassesScreenContent(
                            assignments = assignments,
                            isLoading = isLoadingAssignments,
                            onDiaryClick = { assign ->
                                viewModel.selectDiaryAssignment(assign)
                                viewModel.selectDestination(TeacherDrawerDestination.CLASS_DIARY)
                            },
                            onMarksClick = { assign ->
                                viewModel.selectMarksAssignment(assign)
                                viewModel.selectDestination(TeacherDrawerDestination.TEST_MARKS)
                            }
                        )
                    }

                    TeacherDrawerDestination.CLASS_DIARY -> {
                        ClassDiaryScreenContent(
                            assignments = assignments,
                            diaries = diaries,
                            selectedAssignment = diaryAssignment,
                            onSelectAssignment = { viewModel.selectDiaryAssignment(it) },
                            displayDate = viewModel.getFormattedDiaryDate(),
                            initialDateMillis = viewModel.currentDiaryDateMillis(),
                            onDatePicked = { millis -> viewModel.setDiaryDateFromMillis(millis) },
                            onPreviousDay = { viewModel.shiftDiaryDate(-1) },
                            onNextDay = { viewModel.shiftDiaryDate(1) },
                            onToday = { viewModel.setDiaryDateToToday() },
                            content = diaryContent,
                            onContentChange = { viewModel.setDiaryContent(it) },
                            isLoadingAssignments = isLoadingAssignments,
                            isLoadingDiaries = isLoadingDiaries,
                            isSaving = isSavingDiary,
                            deletingDiaryId = deletingDiaryId,
                            feedbackMessage = feedbackMessage,
                            isError = isError,
                            onPost = { viewModel.postDiary() },
                            onDeleteDiary = { id -> viewModel.deleteDiary(id) },
                            selectedDateStr = diaryDate,
                            onRefreshDiaries = { viewModel.loadDiaries() }
                        )
                    }

                    TeacherDrawerDestination.TEST_MARKS -> {
                        TestMarksScreenContent(
                            assignments = assignments,
                            selectedAssignment = marksAssignment,
                            onSelectAssignment = { assign -> viewModel.selectMarksAssignment(assign) },
                            isLoadingAssignments = isLoadingAssignments,
                            tests = tests,
                            isLoadingTests = isLoadingTests,
                            selectedTest = selectedTest,
                            rows = markRows,
                            isLoadingStudents = isLoadingMarkStudents,
                            isSaving = isSavingMarks,
                            feedbackMessage = feedbackMessage,
                            isError = isError,
                            onSelectTest = { test -> viewModel.selectTest(test) },
                            onBackToTests = { viewModel.clearSelectedTest() },
                            onMarksChange = { studentId, text -> viewModel.setObtainedMarks(studentId, text) },
                            onToggleAbsent = { studentId -> viewModel.toggleStudentAbsent(studentId) },
                            onSave = { viewModel.saveTestMarks() },
                            onRefresh = {
                                if (viewModel.selectedTest.value != null) {
                                    viewModel.loadTestStudents()
                                } else {
                                    viewModel.loadTeacherTests()
                                }
                            }
                        )
                    }

                    TeacherDrawerDestination.MY_ATTENDANCE -> {
                        MyAttendanceScreenContent(
                            attendances = teacherAttendances,
                            isLoading = isLoadingTeacherAttendance,
                            formattedMonth = viewModel.getFormattedAttendanceMonth(),
                            rawMonth = attendanceMonth,
                            isCurrentMonth = viewModel.isCurrentAttendanceMonth(),
                            onPreviousMonth = { viewModel.shiftAttendanceMonth(-1) },
                            onNextMonth = { viewModel.shiftAttendanceMonth(1) },
                            onCurrentMonth = { viewModel.setAttendanceMonthToCurrent() },
                            onSelectMonth = { month -> viewModel.setAttendanceMonth(month) },
                            onRefresh = { viewModel.loadTeacherAttendance() },
                            feedbackMessage = feedbackMessage,
                            isError = isError
                        )
                    }

                    TeacherDrawerDestination.PROFILE -> {
                        TeacherProfileContent(
                            profile = profile,
                            form = profileForm,
                            isLoading = isLoadingProfile,
                            isSaving = isSavingProfile,
                            isUploadingImage = isUploadingImage,
                            isSavingSignature = isSavingSignature,
                            isDeletingSignature = isDeletingSignature,
                            signatureMode = signatureMode,
                            feedbackMessage = feedbackMessage,
                            feedbackIsError = isError,
                            resolveMediaUrl = { path -> viewModel.resolveMediaUrl(path) },
                            onNameChange = { value -> viewModel.setProfileName(value) },
                            onEmailChange = { value -> viewModel.setProfileEmail(value) },
                            onPhoneChange = { value -> viewModel.setProfilePhone(value) },
                            onEmergencyChange = { value -> viewModel.setProfileEmergency(value) },
                            onQualificationChange = { value -> viewModel.setProfileQualification(value) },
                            onSaveProfile = { viewModel.saveProfile() },
                            onProfileImagePicked = { bytes: ByteArray, name: String, mime: String ->
                                viewModel.uploadProfileImage(bytes, name, mime)
                            },
                            onSignatureModeChange = { mode -> viewModel.setSignatureMode(mode) },
                            onDrawnSignature = { dataUri -> viewModel.saveDrawnSignature(dataUri) },
                            onSignatureFilePicked = { bytes: ByteArray, name: String, mime: String ->
                                viewModel.uploadSignatureFile(bytes, name, mime)
                            },
                            onDeleteSignature = { viewModel.deleteSignature() }
                        )
                    }

                    else -> {
                        GenericModulePlaceholder(
                            destination = currentDestination
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TeacherTopBar(
    title: String,
    subtitle: String,
    onOpenDrawer: () -> Unit,
    onRefresh: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brand950.copy(alpha = 0.95f))
            .windowInsetsPadding(
                WindowInsets.safeDrawing.only(
                    WindowInsetsSides.Top + WindowInsetsSides.Horizontal
                )
            )
            .border(width = 0.5.dp, color = Color(0x3338BDF8))
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0x1F38BDF8))
                    .border(1.dp, Color(0x4D38BDF8), RoundedCornerShape(12.dp))
                    .clickable(onClick = onOpenDrawer)
            ) {
                Text(text = "☰", color = SkyGlow, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    color = TextHeading,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = subtitle,
                    color = TextSubheading,
                    fontSize = 11.sp,
                    maxLines = 1
                )
            }

            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(Color(0x14FFFFFF))
                    .border(1.dp, Color(0x2638BDF8), CircleShape)
                    .clickable(onClick = onRefresh)
            ) {
                Text(text = "🔄", fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun TeacherDrawerHeader(user: UserProfile, avatarUrl: String?) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(54.dp)
                .clip(CircleShape)
                .background(Brush.linearGradient(listOf(ButtonGradientStart, Brand900)))
                .border(2.dp, SkyGlow, CircleShape)
        ) {
            RemoteImage(
                url = avatarUrl,
                contentDescription = user.name,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(CircleShape),
                contentScale = ContentScale.Crop,
                placeholder = {
                    Text(
                        text = user.initials,
                        color = TextHeading,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                },
                fallback = {
                    Text(
                        text = user.initials,
                        color = TextHeading,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(AuraGold)
                )
                Spacer(modifier = Modifier.width(5.dp))
                Text(
                    text = "TEACHER PORTAL",
                    color = AuraGold,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.2.sp
                )
            }

            Text(
                text = user.name,
                color = TextHeading,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = user.email ?: "KIPS Chunian Campus",
                color = TextMuted,
                fontSize = 11.sp,
                maxLines = 1
            )

            if (!user.qualification.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(100.dp))
                        .background(AuraGold.copy(alpha = 0.14f))
                        .border(1.dp, AuraGold.copy(alpha = 0.4f), RoundedCornerShape(100.dp))
                        .padding(horizontal = 10.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = user.qualification ?: "",
                        color = AuraGold,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            androidx.compose.material3.TextButton(
                onClick = { },
                enabled = true,
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 0.dp, vertical = 0.dp)
            ) {
                Text(
                    text = "📷  Change Photo",
                    color = SkyGlow,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun TeacherDrawerItem(
    destination: TeacherDrawerDestination,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(if (isSelected) Color(0x3338BDF8) else Color.Transparent)
            .border(
                width = 1.dp,
                color = if (isSelected) Color(0x6638BDF8) else Color.Transparent,
                shape = RoundedCornerShape(10.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 9.dp)
    ) {
        Text(text = destination.icon, fontSize = 16.sp)
        Spacer(modifier = Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = destination.title,
                color = if (isSelected) SkyGlow else TextHeading,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
            )
            Text(
                text = destination.subtitle,
                color = if (isSelected) TextSubheading else TextMuted,
                fontSize = 10.sp
            )
        }
        if (isSelected) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(SkyGlow)
            )
        }
    }
}

@Composable
private fun TeacherOverviewScreenContent(
    user: UserProfile,
    assignments: List<TeacherAssignment>,
    teacherAttendances: List<TeacherAttendanceRecord>,
    isLoadingAttendance: Boolean,
    onNavigate: (TeacherDrawerDestination) -> Unit,
    onDiaryClick: (TeacherAssignment) -> Unit,
    onMarksClick: (TeacherAssignment) -> Unit
) {
    val presentCount = teacherAttendances.count { it.status.equals("Present", ignoreCase = true) }
    val totalDays = teacherAttendances.size
    val attendancePct = if (totalDays > 0) (presentCount.toFloat() / totalDays * 100).toInt() else 0

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFF1E3A8A), Color(0xFF0F172A))
                        )
                    )
                    .border(1.dp, Color(0x4D38BDF8), RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(EmeraldSuccess)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "PORTAL OVERVIEW",
                            color = AuraGold,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.2.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Welcome, ${user.name}",
                        color = TextHeading,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "KIPS School Chunian — Full Faculty Access",
                        color = TextSubheading,
                        fontSize = 12.sp
                    )
                }
            }
        }

        item {
            if (isLoadingAttendance) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = SkyGlow, strokeWidth = 2.5.dp)
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(text = "Loading attendance...", color = TextSubheading, fontSize = 12.sp)
                    }
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MetricCard(
                        label = "ASSIGNED CLASSES",
                        value = "${assignments.size}",
                        subtitle = "Active course subjects",
                        accentColor = SkyGlow,
                        modifier = Modifier.weight(1f)
                    )
                    MetricCard(
                        label = "ATTENDANCE",
                        value = "$attendancePct%",
                        subtitle = "$presentCount Present • ${totalDays - presentCount} Absent",
                        accentColor = EmeraldSuccess,
                        modifier = Modifier.weight(1f),
                        onClick = { onNavigate(TeacherDrawerDestination.MY_ATTENDANCE) }
                    )
                }
            }
        }

        item {
            SectionTitle(text = "MY ACTIVE CLASSES")
        }

        if (assignments.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No classes or subjects assigned yet.",
                        color = TextMuted,
                        fontSize = 13.sp
                    )
                }
            }
        } else {
            items(assignments) { assign ->
                AssignmentOverviewCard(
                    assignment = assign,
                    onDiaryClick = { onDiaryClick(assign) },
                    onMarksClick = { onMarksClick(assign) }
                )
            }
        }

        item {
            Spacer(modifier = Modifier.height(16.dp))
        }

        item {
            SectionTitle(text = "QUICK SHORTCUTS")
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                QuickActionRow(
                    icon = "📖",
                    title = "Class Diary",
                    desc = "Post daily homework and student announcements",
                    onClick = { onNavigate(TeacherDrawerDestination.CLASS_DIARY) }
                )
                QuickActionRow(
                    icon = "📝",
                    title = "Test Marks Entry",
                    desc = "Enter & save test marks for your assigned classes",
                    onClick = { onNavigate(TeacherDrawerDestination.TEST_MARKS) }
                )
                QuickActionRow(
                    icon = "📅",
                    title = "My Attendance",
                    desc = "View month-wise attendance register, punch-ins & ratio",
                    onClick = { onNavigate(TeacherDrawerDestination.MY_ATTENDANCE) }
                )
                QuickActionRow(
                    icon = "💳",
                    title = "My Salary Slips",
                    desc = "View official monthly payslips and breakdown",
                    onClick = { onNavigate(TeacherDrawerDestination.SALARIES) }
                )
                QuickActionRow(
                    icon = "⏰",
                    title = "Leave Applications",
                    desc = "Submit leave requests and check approval status",
                    onClick = { onNavigate(TeacherDrawerDestination.LEAVES) }
                )
                QuickActionRow(
                    icon = "👤",
                    title = "Profile & Settings",
                    desc = "Update details, photo and digital signature",
                    onClick = { onNavigate(TeacherDrawerDestination.PROFILE) }
                )
            }
        }
    }
}

@Composable
private fun MyClassesScreenContent(
    assignments: List<TeacherAssignment>,
    isLoading: Boolean,
    onDiaryClick: (TeacherAssignment) -> Unit,
    onMarksClick: (TeacherAssignment) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Spacer(modifier = Modifier.height(6.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.linearGradient(listOf(Color(0xFF1E3A8A), Color(0xFF0F172A)))
                    )
                    .border(1.dp, Color(0x4D38BDF8), RoundedCornerShape(16.dp))
                    .padding(16.dp)
            ) {
                Column {
                    Text(
                        text = "MY ASSIGNED CLASSES & SUBJECTS",
                        color = AuraGold,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.2.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "${assignments.size} Course Assignment${if (assignments.size == 1) "" else "s"}",
                        color = TextHeading,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "These courses are configured by administration for you to teach.",
                        color = TextSubheading,
                        fontSize = 11.sp
                    )
                }
            }
        }

        when {
            isLoading && assignments.isEmpty() -> {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = SkyGlow, strokeWidth = 2.5.dp)
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(text = "Loading your assignments...", color = TextSubheading, fontSize = 12.sp)
                        }
                    }
                }
            }

            assignments.isEmpty() -> {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No assignments found. Please contact administration.",
                            color = TextMuted,
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            else -> {
                items(assignments) { assign ->
                    MyClassSubjectCard(
                        assignment = assign,
                        onDiaryClick = { onDiaryClick(assign) },
                        onMarksClick = { onMarksClick(assign) }
                    )
                }
                item { Spacer(modifier = Modifier.height(20.dp)) }
            }
        }
    }
}

@Composable
private fun MyClassSubjectCard(
    assignment: TeacherAssignment,
    onDiaryClick: () -> Unit,
    onMarksClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0x1A0F172A))
            .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(100.dp))
                        .background(SkyGlow.copy(alpha = 0.15f))
                        .border(1.dp, SkyGlow.copy(alpha = 0.5f), RoundedCornerShape(100.dp))
                        .padding(horizontal = 10.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = assignment.className,
                        color = SkyGlow,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
                Text(
                    text = "Section: ${assignment.sectionName}",
                    color = TextMuted,
                    fontSize = 11.sp
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = assignment.subjectName,
                color = TextHeading,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )

            assignment.majorName?.let {
                Text(
                    text = "Major: $it",
                    color = AuraGold,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0x14FFFFFF))
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "Salary Basis:", color = TextMuted, fontSize = 11.sp)
                Text(
                    text = assignment.salaryBasisLabel,
                    color = TextHeading,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                ActionChip(
                    text = "Diary",
                    icon = "📖",
                    accentColor = SkyGlow,
                    onClick = onDiaryClick,
                    modifier = Modifier.weight(1f)
                )
                ActionChip(
                    text = "Marks",
                    icon = "📝",
                    accentColor = AuraGold,
                    onClick = onMarksClick,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun MetricCard(
    label: String,
    value: String,
    subtitle: String,
    accentColor: Color,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0x1A0F172A))
            .border(1.dp, accentColor.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
            .then(
                if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier
            )
            .padding(14.dp)
    ) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = value,
                    color = accentColor,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Black
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = label,
                color = TextMuted,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.6.sp
            )
            Text(
                text = subtitle,
                color = TextSubheading,
                fontSize = 11.sp
            )
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = text,
            color = SkyGlow,
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.2.sp
        )
        Spacer(modifier = Modifier.height(8.dp))
    }
}

@Composable
private fun AssignmentOverviewCard(
    assignment: TeacherAssignment,
    onDiaryClick: () -> Unit,
    onMarksClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x1A0F172A))
            .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = assignment.subjectName,
                        color = TextHeading,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${assignment.className} • ${assignment.sectionName}",
                        color = TextMuted,
                        fontSize = 12.sp
                    )
                    assignment.majorName?.let {
                        Text(
                            text = it,
                            color = AuraGold,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ActionChip(
                        text = "Diary",
                        icon = "📖",
                        accentColor = SkyGlow,
                        onClick = onDiaryClick
                    )
                    ActionChip(
                        text = "Marks",
                        icon = "📝",
                        accentColor = AuraGold,
                        onClick = onMarksClick
                    )
                }
            }
        }
    }
}

@Composable
private fun ActionChip(
    text: String,
    icon: String,
    accentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(accentColor.copy(alpha = 0.15f))
            .border(1.dp, accentColor.copy(alpha = 0.6f), RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = icon,
                color = accentColor,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = text,
                color = accentColor,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun QuickActionRow(
    icon: String,
    title: String,
    desc: String,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0x1A0F172A))
            .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = icon, fontSize = 22.sp)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(text = title, color = TextHeading, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Text(text = desc, color = TextMuted, fontSize = 11.sp)
            }
            Text(text = "→", color = SkyGlow, fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun GenericModulePlaceholder(
    destination: TeacherDrawerDestination
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0x260F172A))
                .border(1.dp, Color(0x4D38BDF8), RoundedCornerShape(16.dp))
                .padding(20.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = destination.icon, fontSize = 40.sp)
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = destination.title,
                    color = TextHeading,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = destination.subtitle,
                    color = TextSubheading,
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    text = "Module synchronized with web portal. Native mobile interface active.",
                    color = TextMuted,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
