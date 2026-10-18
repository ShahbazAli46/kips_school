package com.kipsschool.chunian.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kipsschool.chunian.data.model.ClassDiaryEntry
import com.kipsschool.chunian.data.model.TeacherAssignment
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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private enum class DiaryViewTab(val title: String, val icon: String) {
    WRITE("Write Diary", "✍️"),
    HISTORY("Old Diaries", "📜")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClassDiaryScreenContent(
    assignments: List<TeacherAssignment>,
    diaries: List<ClassDiaryEntry>,
    selectedAssignment: TeacherAssignment?,
    onSelectAssignment: (TeacherAssignment) -> Unit,
    displayDate: String,
    initialDateMillis: Long,
    onDatePicked: (Long) -> Unit,
    onPreviousDay: () -> Unit,
    onNextDay: () -> Unit,
    onToday: () -> Unit,
    content: String,
    onContentChange: (String) -> Unit,
    isLoadingAssignments: Boolean,
    isLoadingDiaries: Boolean,
    isSaving: Boolean,
    deletingDiaryId: Long?,
    feedbackMessage: String?,
    isError: Boolean,
    onPost: () -> Unit,
    onDeleteDiary: (Long) -> Unit,
    selectedDateStr: String = "",
    onRefreshDiaries: () -> Unit = {}
) {
    var activeTab by remember { mutableStateOf(DiaryViewTab.WRITE) }
    var showDatePicker by remember { mutableStateOf(false) }
    var entryToDelete by remember { mutableStateOf<ClassDiaryEntry?>(null) }
    var historySearchQuery by remember { mutableStateOf("") }
    var historyFilterByDateOnly by remember { mutableStateOf(false) }

    val todayIsoDate = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }

    val isDateToday = remember(selectedDateStr, todayIsoDate) {
        selectedDateStr.isNotBlank() && selectedDateStr == todayIsoDate
    }

    // Diaries matching currently selected date (for live preview on compose screen)
    val diariesForCurrentDate = remember(diaries, selectedDateStr) {
        if (selectedDateStr.isNotBlank()) {
            diaries.filter { it.diaryDate.take(10) == selectedDateStr.take(10) }
        } else {
            emptyList()
        }
    }

    // Filtered diaries for history tab
    val filteredHistoryDiaries = remember(diaries, historySearchQuery, historyFilterByDateOnly, selectedDateStr) {
        var list = diaries
        if (historyFilterByDateOnly && selectedDateStr.isNotBlank()) {
            list = list.filter { it.diaryDate.take(10) == selectedDateStr.take(10) }
        }
        if (historySearchQuery.isNotBlank()) {
            val q = historySearchQuery.trim().lowercase(Locale.ROOT)
            list = list.filter {
                it.subjectName.lowercase(Locale.ROOT).contains(q) ||
                    it.className.lowercase(Locale.ROOT).contains(q) ||
                    (it.sectionName?.lowercase(Locale.ROOT)?.contains(q) == true) ||
                    it.content.lowercase(Locale.ROOT).contains(q)
            }
        }
        list
    }

    val datePickerState = rememberDatePickerState(
        initialSelectedDateMillis = initialDateMillis
    )

    // Material 3 Date Picker Dialog
    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            onDatePicked(millis)
                        }
                        showDatePicker = false
                    }
                ) {
                    Text("Apply Date", color = SkyGlow, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text("Cancel", color = TextMuted, fontSize = 14.sp)
                }
            },
            colors = DatePickerDefaults.colors(
                containerColor = Brand950
            )
        ) {
            DatePicker(
                state = datePickerState,
                colors = DatePickerDefaults.colors(
                    containerColor = Brand950,
                    titleContentColor = SkyGlow,
                    headlineContentColor = TextHeading,
                    weekdayContentColor = TextSubheading,
                    subheadContentColor = TextSubheading,
                    yearContentColor = TextHeading,
                    currentYearContentColor = SkyGlow,
                    selectedYearContentColor = Color.White,
                    selectedYearContainerColor = ButtonGradientMid,
                    dayContentColor = TextHeading,
                    selectedDayContentColor = Color.White,
                    selectedDayContainerColor = ButtonGradientMid,
                    todayContentColor = AuraGold,
                    todayDateBorderColor = AuraGold
                )
            )
        }
    }

    // Delete Confirmation Dialog
    entryToDelete?.let { entry ->
        AlertDialog(
            onDismissRequest = { entryToDelete = null },
            containerColor = Brand950,
            icon = { Text(text = "🗑️", fontSize = 28.sp) },
            title = {
                Text(
                    text = "Delete Diary Entry?",
                    color = TextHeading,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Are you sure you want to delete this diary for:",
                        color = TextSubheading,
                        fontSize = 13.sp
                    )
                    Text(
                        text = "• ${entry.subjectName} — ${entry.displayClassSection}",
                        color = SkyGlow,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "• Date: ${entry.formattedDate}",
                        color = AuraGold,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "This action will remove the diary for all students and parents.",
                        color = TextMuted,
                        fontSize = 11.sp
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val id = entry.id
                        entryToDelete = null
                        onDeleteDiary(id)
                    }
                ) {
                    Text(
                        text = "Delete",
                        color = CoralError,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { entryToDelete = null }) {
                    Text("Cancel", color = TextMuted, fontSize = 14.sp)
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp)
    ) {
        // Hero Header Card
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
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(AuraGold)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "CLASS DIARY & HOMEWORK",
                                color = AuraGold,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 1.2.sp
                            )
                        }

                        if (isLoadingDiaries) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = SkyGlow,
                                strokeWidth = 2.dp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Teacher Diary Portal",
                        color = TextHeading,
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Post homework, classwork notes, and review archived student diaries.",
                        color = TextSubheading,
                        fontSize = 11.sp
                    )
                }
            }
        }

        // Mode Segment Switcher (Write Diary vs Old Diaries)
        item {
            DiaryTabSelector(
                activeTab = activeTab,
                diariesCount = diaries.size,
                onTabSelected = { activeTab = it }
            )
        }

        when (activeTab) {
            DiaryViewTab.WRITE -> {
                // Interactive Date Picker Banner
                item {
                    DiaryDateHeaderCard(
                        displayDate = displayDate,
                        isToday = isDateToday,
                        onPreviousDay = onPreviousDay,
                        onToday = onToday,
                        onNextDay = onNextDay,
                        onOpenCalendar = { showDatePicker = true }
                    )
                }

                // Course / Assignment Selection
                item {
                    DiaryAssignmentSelector(
                        assignments = assignments,
                        selectedAssignment = selectedAssignment,
                        isLoading = isLoadingAssignments,
                        onSelectAssignment = onSelectAssignment
                    )
                }

                // Text Composer Card
                item {
                    DiaryComposerCard(
                        content = content,
                        selectedAssignment = selectedAssignment,
                        isSaving = isSaving,
                        feedbackMessage = feedbackMessage,
                        isError = isError,
                        onContentChange = onContentChange,
                        onPost = onPost
                    )
                }

                // Section: Existing Diaries for the selected date
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "DIARIES FOR THIS DATE (${diariesForCurrentDate.size})",
                            color = SkyGlow,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.1.sp
                        )

                        if (diariesForCurrentDate.isNotEmpty()) {
                            Text(
                                text = "View All (${diaries.size}) →",
                                color = AuraGold,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable { activeTab = DiaryViewTab.HISTORY }
                            )
                        }
                    }
                }

                if (diariesForCurrentDate.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0x140F172A))
                                .border(1.dp, Color(0x2638BDF8), RoundedCornerShape(12.dp))
                                .padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(text = "📖", fontSize = 24.sp)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "No diary entries posted for $displayDate.",
                                    color = TextMuted,
                                    fontSize = 12.sp,
                                    textAlign = TextAlign.Center
                                )
                                Text(
                                    text = "Fill in the details above and tap 'Publish Class Diary'.",
                                    color = TextSubheading,
                                    fontSize = 11.sp,
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                } else {
                    items(diariesForCurrentDate, key = { it.id }) { diary ->
                        DiaryHistoryCard(
                            entry = diary,
                            isDeleting = deletingDiaryId == diary.id,
                            onDelete = { entryToDelete = diary }
                        )
                    }
                }
            }

            DiaryViewTab.HISTORY -> {
                // Toolbar: Date filter chip & Search input
                item {
                    DiaryHistoryToolbar(
                        searchQuery = historySearchQuery,
                        onSearchChange = { historySearchQuery = it },
                        filterByDateOnly = historyFilterByDateOnly,
                        selectedDateStr = displayDate,
                        totalDiaries = diaries.size,
                        onToggleDateFilter = { historyFilterByDateOnly = !historyFilterByDateOnly },
                        onPickDate = { showDatePicker = true },
                        onRefresh = onRefreshDiaries,
                        isLoading = isLoadingDiaries
                    )
                }

                if (filteredHistoryDiaries.isEmpty()) {
                    item {
                        DiaryEmptyStateCard(
                            hasSearchQuery = historySearchQuery.isNotBlank(),
                            isDateFiltered = historyFilterByDateOnly,
                            onSwitchToWrite = { activeTab = DiaryViewTab.WRITE },
                            onClearFilters = {
                                historySearchQuery = ""
                                historyFilterByDateOnly = false
                            }
                        )
                    }
                } else {
                    item {
                        Text(
                            text = "ARCHIVED DIARIES (${filteredHistoryDiaries.size})",
                            color = SkyGlow,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.1.sp
                        )
                    }

                    items(filteredHistoryDiaries, key = { it.id }) { diary ->
                        DiaryHistoryCard(
                            entry = diary,
                            isDeleting = deletingDiaryId == diary.id,
                            onDelete = { entryToDelete = diary }
                        )
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────

@Composable
private fun DiaryTabSelector(
    activeTab: DiaryViewTab,
    diariesCount: Int,
    onTabSelected: (DiaryViewTab) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0x2E0F172A))
            .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(12.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        DiaryViewTab.values().forEach { tab ->
            val isSelected = activeTab == tab
            val tabLabel = if (tab == DiaryViewTab.HISTORY && diariesCount > 0) {
                "${tab.title} ($diariesCount)"
            } else {
                tab.title
            }

            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .then(
                        if (isSelected) {
                            Modifier.background(
                                Brush.horizontalGradient(
                                    listOf(ButtonGradientStart, ButtonGradientMid)
                                )
                            )
                        } else {
                            Modifier.background(Color.Transparent)
                        }
                    )
                    .border(
                        width = 1.dp,
                        color = if (isSelected) ButtonBorderSky else Color.Transparent,
                        shape = RoundedCornerShape(10.dp)
                    )
                    .clickable { onTabSelected(tab) }
                    .padding(vertical = 10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(text = tab.icon, fontSize = 14.sp)
                    Text(
                        text = tabLabel,
                        color = if (isSelected) TextHeading else TextMuted,
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun DiaryDateHeaderCard(
    displayDate: String,
    isToday: Boolean,
    onPreviousDay: () -> Unit,
    onToday: () -> Unit,
    onNextDay: () -> Unit,
    onOpenCalendar: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x1F0F172A))
            .border(1.dp, Color(0x4038BDF8), RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "📅", fontSize = 15.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "SELECTED DIARY DATE",
                        color = AuraGold,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.sp
                    )
                }

                if (isToday) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(100.dp))
                            .background(EmeraldSuccess.copy(alpha = 0.18f))
                            .border(1.dp, EmeraldSuccess.copy(alpha = 0.6f), RoundedCornerShape(100.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "TODAY",
                            color = EmeraldSuccess,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Large Date Display (Clickable to open calendar)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0x1A38BDF8))
                    .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(10.dp))
                    .clickable(onClick = onOpenCalendar)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = displayDate,
                        color = TextHeading,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Tap to choose a different calendar date",
                        color = TextSubheading,
                        fontSize = 10.sp
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0x2638BDF8))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Pick Date 🗓️",
                        color = SkyGlow,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Quick Stepper Buttons (Prev / Today / Next)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickDateNavButton(
                    text = "◀ Prev Day",
                    onClick = onPreviousDay,
                    modifier = Modifier.weight(1f)
                )

                QuickDateNavButton(
                    text = "Today",
                    onClick = onToday,
                    isAccent = isToday,
                    modifier = Modifier.weight(1f)
                )

                QuickDateNavButton(
                    text = "Next Day ▶",
                    onClick = onNextDay,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun QuickDateNavButton(
    text: String,
    onClick: () -> Unit,
    isAccent: Boolean = false,
    modifier: Modifier = Modifier
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (isAccent) AuraGold.copy(alpha = 0.18f) else Color(0x1AFFFFFF)
            )
            .border(
                1.dp,
                if (isAccent) AuraGold.copy(alpha = 0.6f) else Color(0x26FFFFFF),
                RoundedCornerShape(8.dp)
            )
            .clickable(onClick = onClick)
            .padding(vertical = 7.dp)
    ) {
        Text(
            text = text,
            color = if (isAccent) AuraGold else TextHeading,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun DiaryAssignmentSelector(
    assignments: List<TeacherAssignment>,
    selectedAssignment: TeacherAssignment?,
    isLoading: Boolean,
    onSelectAssignment: (TeacherAssignment) -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "📚", fontSize = 15.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "SELECT CLASS & SUBJECT",
                    color = SkyGlow,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.1.sp
                )
            }

            if (selectedAssignment != null) {
                Text(
                    text = "Selected: ${selectedAssignment.subjectName}",
                    color = TextSubheading,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        when {
            isLoading && assignments.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = SkyGlow, strokeWidth = 2.dp)
                }
            }

            assignments.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0x14FFFFFF))
                        .padding(14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No course assignments assigned to your teacher account.",
                        color = TextMuted,
                        fontSize = 12.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }

            else -> {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(vertical = 2.dp)
                ) {
                    items(assignments, key = { it.id }) { item ->
                        val isSelected = selectedAssignment?.id == item.id
                        AssignmentChipCard(
                            assignment = item,
                            isSelected = isSelected,
                            onClick = { onSelectAssignment(item) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AssignmentChipCard(
    assignment: TeacherAssignment,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .then(
                if (isSelected) {
                    Modifier.background(
                        Brush.linearGradient(
                            listOf(Color(0xFF1E3A8A), Color(0xFF0F172A))
                        )
                    )
                } else {
                    Modifier.background(Color(0x1A0F172A))
                }
            )
            .border(
                width = if (isSelected) 1.5.dp else 1.dp,
                color = if (isSelected) SkyGlow else Color(0x3338BDF8),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 9.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = assignment.className,
                    color = if (isSelected) SkyGlow else TextHeading,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold
                )
                Text(
                    text = "• Sec ${assignment.sectionName}",
                    color = TextMuted,
                    fontSize = 10.sp
                )

                if (isSelected) {
                    Text(text = "✓", color = EmeraldSuccess, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            Text(
                text = assignment.subjectName,
                color = TextHeading,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )

            assignment.majorName?.let { major ->
                Text(
                    text = major,
                    color = AuraGold,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun DiaryComposerCard(
    content: String,
    selectedAssignment: TeacherAssignment?,
    isSaving: Boolean,
    feedbackMessage: String?,
    isError: Boolean,
    onContentChange: (String) -> Unit,
    onPost: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x1F0F172A))
            .border(1.dp, Color(0x4038BDF8), RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            // Header & Character Counter
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "📝", fontSize = 15.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "DIARY / HOMEWORK CONTENT",
                        color = SkyGlow,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.1.sp
                    )
                }

                Text(
                    text = "${content.length}/2000",
                    color = when {
                        content.length >= 2000 -> CoralError
                        content.length >= 1800 -> AuraGold
                        else -> TextMuted
                    },
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // Quick Topic Suggestion Chips
            Text(
                text = "Tap to prepend section tag:",
                color = TextSubheading,
                fontSize = 10.sp
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                QuickTagChip(tag = "📖 Homework:") {
                    onContentChange(prependOrAppend(content, "📖 Homework: "))
                }
                QuickTagChip(tag = "🎯 Classwork:") {
                    onContentChange(prependOrAppend(content, "🎯 Classwork: "))
                }
                QuickTagChip(tag = "📝 Test Next Day:") {
                    onContentChange(prependOrAppend(content, "📝 Test Next Day: "))
                }
                QuickTagChip(tag = "⚡ Revision:") {
                    onContentChange(prependOrAppend(content, "⚡ Revision: "))
                }
                QuickTagChip(tag = "🔔 Note for Parents:") {
                    onContentChange(prependOrAppend(content, "🔔 Note: "))
                }
            }

            // Multi-line Text Area
            OutlinedTextField(
                value = content,
                onValueChange = { if (it.length <= 2000) onContentChange(it) },
                placeholder = {
                    Text(
                        text = "Type today's diary, homework assignment, classwork details, syllabus covered, or instructions for parents...",
                        color = InputPlaceholder,
                        fontSize = 12.sp,
                        lineHeight = 17.sp
                    )
                },
                minLines = 5,
                maxLines = 10,
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = TextHeading,
                    unfocusedTextColor = TextHeading,
                    focusedContainerColor = InputBgFocus,
                    unfocusedContainerColor = InputBg,
                    cursorColor = SkyGlow,
                    focusedBorderColor = InputBorderFocus,
                    unfocusedBorderColor = InputBorderIdle
                ),
                shape = RoundedCornerShape(12.dp)
            )

            // Clear Button (if text entered)
            if (content.isNotBlank()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    Text(
                        text = "Clear Text ✕",
                        color = TextMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.clickable { onContentChange("") }
                    )
                }
            }

            // Feedback Message Banner
            feedbackMessage?.let { msg ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (isError) BannerErrorBg else BannerSuccessBg)
                        .border(
                            1.dp,
                            if (isError) BannerErrorBorder else BannerSuccessBorder,
                            RoundedCornerShape(10.dp)
                        )
                        .padding(horizontal = 12.dp, vertical = 9.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = if (isError) "⚠️" else "✓",
                            fontSize = 14.sp
                        )
                        Text(
                            text = msg,
                            color = if (isError) BannerErrorText else BannerSuccessText,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Submit Button
            val canPublish = content.isNotBlank() && selectedAssignment != null && !isSaving

            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        if (canPublish) {
                            Brush.horizontalGradient(
                                listOf(ButtonGradientStart, ButtonGradientMid, ButtonGradientEnd)
                            )
                        } else {
                            Brush.horizontalGradient(
                                listOf(Color(0xFF334155), Color(0xFF1E293B))
                            )
                        }
                    )
                    .border(
                        1.dp,
                        if (canPublish) ButtonBorderSky else Color(0x33475569),
                        RoundedCornerShape(12.dp)
                    )
                    .clickable(enabled = canPublish) {
                        focusManager.clearFocus()
                        onPost()
                    }
                    .padding(vertical = 13.dp)
            ) {
                if (isSaving) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp
                        )
                        Text(
                            text = "Publishing Class Diary...",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                } else {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "🚀", fontSize = 15.sp)
                        Text(
                            text = if (selectedAssignment != null) {
                                "Publish Diary for ${selectedAssignment.subjectName}"
                            } else {
                                "Select a Class to Publish Diary"
                            },
                            color = if (canPublish) TextHeading else TextMuted,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickTagChip(
    tag: String,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0x1F38BDF8))
            .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = tag,
            color = SkyGlow,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

private fun prependOrAppend(current: String, tag: String): String {
    if (current.isBlank()) return tag
    if (current.startsWith(tag)) return current
    return "$current\n$tag"
}

@Composable
private fun DiaryHistoryToolbar(
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    filterByDateOnly: Boolean,
    selectedDateStr: String,
    totalDiaries: Int,
    onToggleDateFilter: () -> Unit,
    onPickDate: () -> Unit,
    onRefresh: () -> Unit,
    isLoading: Boolean
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Search Input
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            placeholder = {
                Text(
                    text = "Search by subject, class, or diary text...",
                    color = InputPlaceholder,
                    fontSize = 12.sp
                )
            },
            leadingIcon = {
                Text(text = "🔍", fontSize = 13.sp)
            },
            trailingIcon = {
                if (searchQuery.isNotBlank()) {
                    Text(
                        text = "✕",
                        color = TextMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable { onSearchChange("") }
                    )
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextHeading,
                unfocusedTextColor = TextHeading,
                focusedContainerColor = InputBgFocus,
                unfocusedContainerColor = InputBg,
                cursorColor = SkyGlow,
                focusedBorderColor = InputBorderFocus,
                unfocusedBorderColor = InputBorderIdle
            ),
            shape = RoundedCornerShape(12.dp)
        )

        // Filter Chips Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // All Dates Chip
                FilterChip(
                    text = "All Diaries ($totalDiaries)",
                    isSelected = !filterByDateOnly,
                    onClick = { if (filterByDateOnly) onToggleDateFilter() }
                )

                // Date-filtered Chip
                FilterChip(
                    text = "Date: $selectedDateStr",
                    isSelected = filterByDateOnly,
                    onClick = { if (!filterByDateOnly) onToggleDateFilter() }
                )
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Pick Date button
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(34.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0x1F38BDF8))
                        .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(8.dp))
                        .clickable(onClick = onPickDate)
                ) {
                    Text(text = "🗓️", fontSize = 14.sp)
                }

                // Refresh button
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(34.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0x1F38BDF8))
                        .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(8.dp))
                        .clickable(onClick = onRefresh)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = SkyGlow,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(text = "🔄", fontSize = 13.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterChip(
    text: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(100.dp))
            .background(
                if (isSelected) SkyGlow.copy(alpha = 0.2f) else Color(0x14FFFFFF)
            )
            .border(
                1.dp,
                if (isSelected) SkyGlow else Color(0x26FFFFFF),
                RoundedCornerShape(100.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(
            text = text,
            color = if (isSelected) SkyGlow else TextMuted,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun DiaryHistoryCard(
    entry: ClassDiaryEntry,
    isDeleting: Boolean,
    onDelete: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x1A0F172A))
            .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // Top Badges & Actions Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Class & Section Badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(100.dp))
                            .background(SkyGlow.copy(alpha = 0.15f))
                            .border(1.dp, SkyGlow.copy(alpha = 0.5f), RoundedCornerShape(100.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = entry.displayClassSection,
                            color = SkyGlow,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Date Badge
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(100.dp))
                            .background(AuraGold.copy(alpha = 0.15f))
                            .border(1.dp, AuraGold.copy(alpha = 0.45f), RoundedCornerShape(100.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "📅 ${entry.formattedDate}",
                            color = AuraGold,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                // Delete Button
                if (isDeleting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = CoralError,
                        strokeWidth = 2.dp
                    )
                } else {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .size(30.dp)
                            .clip(CircleShape)
                            .background(CoralError.copy(alpha = 0.12f))
                            .border(1.dp, CoralError.copy(alpha = 0.4f), CircleShape)
                            .clickable(onClick = onDelete)
                    ) {
                        Text(text = "🗑️", fontSize = 12.sp)
                    }
                }
            }

            // Subject Title
            Text(
                text = entry.subjectName,
                color = TextHeading,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )

            // Diary Content Card
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0x1F000000))
                    .border(1.dp, Color(0x1F38BDF8), RoundedCornerShape(10.dp))
                    .padding(12.dp)
            ) {
                Text(
                    text = entry.content,
                    color = TextHeading.copy(alpha = 0.92f),
                    fontSize = 12.sp,
                    lineHeight = 18.sp
                )
            }

            // Footer (Teacher info)
            entry.teacherName?.let { teacher ->
                Text(
                    text = "Posted by: $teacher",
                    color = TextMuted,
                    fontSize = 10.sp
                )
            }
        }
    }
}

@Composable
private fun DiaryEmptyStateCard(
    hasSearchQuery: Boolean,
    isDateFiltered: Boolean,
    onSwitchToWrite: () -> Unit,
    onClearFilters: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0x1F0F172A))
            .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(16.dp))
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(text = "📖", fontSize = 36.sp)
            Text(
                text = "No Diary Entries Found",
                color = TextHeading,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = if (hasSearchQuery || isDateFiltered) {
                    "No diary entries matched your active search or date filter."
                } else {
                    "No previous class diaries have been logged yet."
                },
                color = TextSubheading,
                fontSize = 12.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (hasSearchQuery || isDateFiltered) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(Color(0x1AFFFFFF))
                            .border(1.dp, Color(0x33FFFFFF), RoundedCornerShape(10.dp))
                            .clickable(onClick = onClearFilters)
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "Reset Filters",
                            color = TextHeading,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(
                            Brush.horizontalGradient(
                                listOf(ButtonGradientStart, ButtonGradientMid)
                            )
                        )
                        .border(1.dp, ButtonBorderSky, RoundedCornerShape(10.dp))
                        .clickable(onClick = onSwitchToWrite)
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "✍️ Write a Diary Entry",
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
