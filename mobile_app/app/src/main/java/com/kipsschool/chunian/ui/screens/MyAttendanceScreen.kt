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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kipsschool.chunian.data.model.TeacherAttendanceRecord
import com.kipsschool.chunian.ui.theme.AuraGold
import com.kipsschool.chunian.ui.theme.BannerErrorBg
import com.kipsschool.chunian.ui.theme.BannerErrorBorder
import com.kipsschool.chunian.ui.theme.BannerErrorText
import com.kipsschool.chunian.ui.theme.BannerSuccessBg
import com.kipsschool.chunian.ui.theme.BannerSuccessBorder
import com.kipsschool.chunian.ui.theme.BannerSuccessText
import com.kipsschool.chunian.ui.theme.Brand950
import com.kipsschool.chunian.ui.theme.ButtonBorderSky
import com.kipsschool.chunian.ui.theme.ButtonGradientEnd
import com.kipsschool.chunian.ui.theme.ButtonGradientMid
import com.kipsschool.chunian.ui.theme.ButtonGradientStart
import com.kipsschool.chunian.ui.theme.CoralError
import com.kipsschool.chunian.ui.theme.EmeraldSuccess
import com.kipsschool.chunian.ui.theme.SkyGlow
import com.kipsschool.chunian.ui.theme.TextHeading
import com.kipsschool.chunian.ui.theme.TextMuted
import com.kipsschool.chunian.ui.theme.TextSubheading
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private enum class AttendanceFilter(val label: String) {
    ALL("All Records"),
    PRESENT("Present"),
    ABSENT("Absent"),
    LEAVE("Leaves")
}

@Composable
fun MyAttendanceScreenContent(
    attendances: List<TeacherAttendanceRecord>,
    isLoading: Boolean,
    formattedMonth: String,
    rawMonth: String,
    isCurrentMonth: Boolean,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onCurrentMonth: () -> Unit,
    onSelectMonth: (String) -> Unit,
    onRefresh: () -> Unit,
    feedbackMessage: String? = null,
    isError: Boolean = false
) {
    var selectedFilter by remember { mutableStateOf(AttendanceFilter.ALL) }
    var showMonthPickerDialog by remember { mutableStateOf(false) }

    // Calculations for summary KPI cards
    val totalRecords = attendances.size
    val presentCount = remember(attendances) {
        attendances.count { it.isPresent }
    }
    val absentCount = remember(attendances) {
        attendances.count { it.isAbsent }
    }
    val leaveCount = remember(attendances) {
        attendances.count { it.isLeave }
    }
    val attendancePct = remember(presentCount, totalRecords) {
        if (totalRecords > 0) ((presentCount.toFloat() / totalRecords) * 100).toInt() else 0
    }

    // Filtered list
    val filteredRecords = remember(attendances, selectedFilter) {
        when (selectedFilter) {
            AttendanceFilter.ALL -> attendances
            AttendanceFilter.PRESENT -> attendances.filter { it.isPresent }
            AttendanceFilter.ABSENT -> attendances.filter { it.isAbsent }
            AttendanceFilter.LEAVE -> attendances.filter { it.isLeave }
        }
    }

    if (showMonthPickerDialog) {
        MonthPickerSelectorDialog(
            currentRawMonth = rawMonth,
            onDismiss = { showMonthPickerDialog = false },
            onMonthChosen = { chosen ->
                onSelectMonth(chosen)
                showMonthPickerDialog = false
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
                                text = "TEACHER ATTENDANCE REGISTER",
                                color = AuraGold,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 1.2.sp
                            )
                        }

                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = SkyGlow,
                                strokeWidth = 2.dp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "My Monthly Attendance",
                        color = TextHeading,
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Review daily check-in times, leaves, and biometric punch records.",
                        color = TextSubheading,
                        fontSize = 11.sp
                    )
                }
            }
        }

        // Interactive Month Selector Strip
        item {
            MonthNavigatorCard(
                formattedMonth = formattedMonth,
                isCurrentMonth = isCurrentMonth,
                onPreviousMonth = onPreviousMonth,
                onNextMonth = onNextMonth,
                onCurrentMonth = onCurrentMonth,
                onOpenMonthPicker = { showMonthPickerDialog = true }
            )
        }

        // Monthly KPI Analytics Tiles
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // 4-column metrics
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AttendanceKpiCard(
                        label = "PRESENT",
                        count = "$presentCount",
                        sub = if (totalRecords > 0) "${(presentCount * 100) / totalRecords}%" else "0%",
                        color = EmeraldSuccess,
                        modifier = Modifier.weight(1f)
                    )

                    AttendanceKpiCard(
                        label = "ABSENT",
                        count = "$absentCount",
                        sub = if (totalRecords > 0) "${(absentCount * 100) / totalRecords}%" else "0%",
                        color = CoralError,
                        modifier = Modifier.weight(1f)
                    )

                    AttendanceKpiCard(
                        label = "LEAVES",
                        count = "$leaveCount",
                        sub = "Approved",
                        color = AuraGold,
                        modifier = Modifier.weight(1f)
                    )

                    AttendanceKpiCard(
                        label = "RATIO",
                        count = "$attendancePct%",
                        sub = "$totalRecords Days",
                        color = SkyGlow,
                        modifier = Modifier.weight(1f)
                    )
                }

                // Visual Attendance Ratio Progress Bar
                if (totalRecords > 0) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(100.dp))
                            .background(Color(0x33FFFFFF))
                    ) {
                        Row(modifier = Modifier.fillMaxSize()) {
                            if (presentCount > 0) {
                                Box(
                                    modifier = Modifier
                                        .weight(presentCount.toFloat())
                                        .fillMaxSize()
                                        .background(EmeraldSuccess)
                                )
                            }
                            if (leaveCount > 0) {
                                Box(
                                    modifier = Modifier
                                        .weight(leaveCount.toFloat())
                                        .fillMaxSize()
                                        .background(AuraGold)
                                )
                            }
                            if (absentCount > 0) {
                                Box(
                                    modifier = Modifier
                                        .weight(absentCount.toFloat())
                                        .fillMaxSize()
                                        .background(CoralError)
                                )
                            }
                        }
                    }
                }
            }
        }


        // Feedback Banner
        feedbackMessage?.let { msg ->
            item {
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
                        Text(text = if (isError) "⚠️" else "✓", fontSize = 14.sp)
                        Text(
                            text = msg,
                            color = if (isError) BannerErrorText else BannerSuccessText,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }

        // Status Filter Chips Row & Refresh Button
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    AttendanceFilterChip(
                        text = "All ($totalRecords)",
                        isSelected = selectedFilter == AttendanceFilter.ALL,
                        onClick = { selectedFilter = AttendanceFilter.ALL }
                    )
                    AttendanceFilterChip(
                        text = "✓ Present ($presentCount)",
                        isSelected = selectedFilter == AttendanceFilter.PRESENT,
                        accentColor = EmeraldSuccess,
                        onClick = { selectedFilter = AttendanceFilter.PRESENT }
                    )
                    AttendanceFilterChip(
                        text = "✕ Absent ($absentCount)",
                        isSelected = selectedFilter == AttendanceFilter.ABSENT,
                        accentColor = CoralError,
                        onClick = { selectedFilter = AttendanceFilter.ABSENT }
                    )
                    AttendanceFilterChip(
                        text = "⏰ Leaves ($leaveCount)",
                        isSelected = selectedFilter == AttendanceFilter.LEAVE,
                        accentColor = AuraGold,
                        onClick = { selectedFilter = AttendanceFilter.LEAVE }
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

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

        // Daily Attendance Records List
        if (filteredRecords.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0x1F0F172A))
                        .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(14.dp))
                        .padding(28.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(text = "📅", fontSize = 34.sp)
                        Text(
                            text = if (totalRecords == 0) {
                                "No Attendance Records for $formattedMonth"
                            } else {
                                "No Records Matching Filter"
                            },
                            color = TextHeading,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (totalRecords == 0) {
                                "Administration or biometric attendance logs have not been synced for this period."
                            } else {
                                "No attendance records matched the '${selectedFilter.label}' filter."
                            },
                            color = TextSubheading,
                            fontSize = 11.sp,
                            textAlign = TextAlign.Center
                        )

                        if (!isCurrentMonth) {
                            Spacer(modifier = Modifier.height(6.dp))
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
                                    .clickable(onClick = onCurrentMonth)
                                    .padding(horizontal = 14.dp, vertical = 7.dp)
                            ) {
                                Text(
                                    text = "Jump to Current Month",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        } else {
            items(filteredRecords, key = { it.date + it.id }) { record ->
                AttendanceDayCard(record = record)
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────

@Composable
private fun MonthNavigatorCard(
    formattedMonth: String,
    isCurrentMonth: Boolean,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onCurrentMonth: () -> Unit,
    onOpenMonthPicker: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x1F0F172A))
            .border(1.dp, Color(0x4038BDF8), RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "🗓️", fontSize = 15.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "SELECTED REGISTER MONTH",
                        color = AuraGold,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.sp
                    )
                }

                if (isCurrentMonth) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(100.dp))
                            .background(EmeraldSuccess.copy(alpha = 0.18f))
                            .border(1.dp, EmeraldSuccess.copy(alpha = 0.6f), RoundedCornerShape(100.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "CURRENT MONTH",
                            color = EmeraldSuccess,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }

            // Month display box (clickable to open dialog)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0x1A38BDF8))
                    .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(10.dp))
                    .clickable(onClick = onOpenMonthPicker)
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = formattedMonth,
                        color = TextHeading,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Tap to pick a different month or year",
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
                        text = "Select 📅",
                        color = SkyGlow,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Quick Stepper Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                QuickMonthButton(
                    text = "◀ Prev Month",
                    onClick = onPreviousMonth,
                    modifier = Modifier.weight(1f)
                )

                QuickMonthButton(
                    text = "This Month",
                    onClick = onCurrentMonth,
                    isAccent = isCurrentMonth,
                    modifier = Modifier.weight(1f)
                )

                QuickMonthButton(
                    text = "Next Month ▶",
                    onClick = onNextMonth,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun QuickMonthButton(
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
private fun AttendanceKpiCard(
    label: String,
    count: String,
    sub: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0x1F0F172A))
            .border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
            .padding(horizontal = 8.dp, vertical = 10.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
            Text(
                text = count,
                color = color,
                fontSize = 18.sp,
                fontWeight = FontWeight.Black
            )
            Text(
                text = label,
                color = TextMuted,
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )
            Text(
                text = sub,
                color = TextSubheading,
                fontSize = 9.sp
            )
        }
    }
}


@Composable
private fun AttendanceFilterChip(
    text: String,
    isSelected: Boolean,
    accentColor: Color = SkyGlow,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(100.dp))
            .background(
                if (isSelected) accentColor.copy(alpha = 0.2f) else Color(0x14FFFFFF)
            )
            .border(
                1.dp,
                if (isSelected) accentColor else Color(0x26FFFFFF),
                RoundedCornerShape(100.dp)
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(
            text = text,
            color = if (isSelected) accentColor else TextMuted,
            fontSize = 11.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
        )
    }
}

@Composable
private fun AttendanceDayCard(record: TeacherAttendanceRecord) {
    val statusColor = when {
        record.isPresent -> EmeraldSuccess
        record.isAbsent -> CoralError
        record.isLeave -> AuraGold
        else -> TextMuted
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0x1A0F172A))
            .border(1.dp, Color(0x2638BDF8), RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Day badge box
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0x1F38BDF8))
                    .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(10.dp))
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = record.dayNumber,
                        color = TextHeading,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        text = record.dayOfWeek,
                        color = SkyGlow,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Date and Timings
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = record.formattedDate,
                    color = TextHeading,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(2.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(text = "🕒 In: ", color = TextMuted, fontSize = 10.sp)
                        Text(
                            text = record.checkInTime ?: "—",
                            color = TextSubheading,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (!record.checkOutTime.isNullOrBlank()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = "🚪 Out: ", color = TextMuted, fontSize = 10.sp)
                            Text(
                                text = record.checkOutTime,
                                color = TextSubheading,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            // Status Pill
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(100.dp))
                    .background(statusColor.copy(alpha = 0.15f))
                    .border(1.dp, statusColor.copy(alpha = 0.5f), RoundedCornerShape(100.dp))
                    .padding(horizontal = 9.dp, vertical = 4.dp)
            ) {
                Text(
                    text = record.status,
                    color = statusColor,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun MonthPickerSelectorDialog(
    currentRawMonth: String,
    onDismiss: () -> Unit,
    onMonthChosen: (String) -> Unit
) {
    val months = remember {
        listOf(
            "01" to "Jan", "02" to "Feb", "03" to "Mar", "04" to "Apr",
            "05" to "May", "06" to "Jun", "07" to "Jul", "08" to "Aug",
            "09" to "Sep", "10" to "Oct", "11" to "Nov", "12" to "Dec"
        )
    }

    val currentYear = remember(currentRawMonth) {
        try {
            currentRawMonth.split("-")[0].toInt()
        } catch (_: Exception) {
            Calendar.getInstance().get(Calendar.YEAR)
        }
    }

    var selectedYear by remember { mutableStateOf(currentYear) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Brand950,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Select Month & Year",
                    color = TextHeading,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )

                // Year Stepper
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "◀",
                        color = SkyGlow,
                        fontSize = 14.sp,
                        modifier = Modifier.clickable { selectedYear -= 1 }
                    )
                    Text(
                        text = "$selectedYear",
                        color = AuraGold,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "▶",
                        color = SkyGlow,
                        fontSize = 14.sp,
                        modifier = Modifier.clickable { selectedYear += 1 }
                    )
                }
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                // 3 rows of 4 months
                for (rowIndex in 0 until 3) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        for (colIndex in 0 until 4) {
                            val idx = rowIndex * 4 + colIndex
                            val (num, name) = months[idx]
                            val isSelected = currentRawMonth == "$selectedYear-$num"

                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        if (isSelected) SkyGlow.copy(alpha = 0.25f) else Color(0x14FFFFFF)
                                    )
                                    .border(
                                        1.dp,
                                        if (isSelected) SkyGlow else Color(0x26FFFFFF),
                                        RoundedCornerShape(8.dp)
                                    )
                                    .clickable {
                                        onMonthChosen("$selectedYear-$num")
                                    }
                                    .padding(vertical = 10.dp)
                            ) {
                                Text(
                                    text = name,
                                    color = if (isSelected) SkyGlow else TextHeading,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextMuted)
            }
        }
    )
}
