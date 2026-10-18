package com.kipsschool.chunian.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kipsschool.chunian.data.model.TeacherAssignment
import com.kipsschool.chunian.data.model.TeacherTest
import com.kipsschool.chunian.data.model.TestMarkRow
import com.kipsschool.chunian.ui.theme.AuraGold
import com.kipsschool.chunian.ui.theme.BannerErrorBg
import com.kipsschool.chunian.ui.theme.BannerErrorBorder
import com.kipsschool.chunian.ui.theme.BannerErrorText
import com.kipsschool.chunian.ui.theme.BannerSuccessBg
import com.kipsschool.chunian.ui.theme.BannerSuccessBorder
import com.kipsschool.chunian.ui.theme.BannerSuccessText
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
import com.kipsschool.chunian.ui.theme.TextMuted
import com.kipsschool.chunian.ui.theme.TextSubheading

@Composable
fun TestMarksScreenContent(
    assignments: List<TeacherAssignment>,
    selectedAssignment: TeacherAssignment?,
    onSelectAssignment: (TeacherAssignment) -> Unit,
    isLoadingAssignments: Boolean,
    tests: List<TeacherTest>,
    isLoadingTests: Boolean,
    selectedTest: TeacherTest?,
    rows: List<TestMarkRow>,
    isLoadingStudents: Boolean,
    isSaving: Boolean,
    feedbackMessage: String?,
    isError: Boolean,
    onSelectTest: (TeacherTest) -> Unit,
    onBackToTests: () -> Unit,
    onMarksChange: (Long, String) -> Unit,
    onToggleAbsent: (Long) -> Unit,
    onSave: () -> Unit,
    onRefresh: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item { Spacer(modifier = Modifier.height(6.dp)) }

        item {
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
                        text = "TEST MARKS ENTRY",
                        color = AuraGold,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.2.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (selectedTest != null) selectedTest.title else "Pick a class, then a test",
                        color = TextHeading,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "You can only enter marks for your assigned class & subject.",
                        color = TextSubheading,
                        fontSize = 11.sp
                    )
                }
            }
        }

        // ─── Assignment selector chips ───────────────────────────────
        item {
            MarksAssignmentSelector(
                assignments = assignments,
                selectedAssignment = selectedAssignment,
                onSelectAssignment = onSelectAssignment,
                isLoading = isLoadingAssignments
            )
        }

        // ─── Feedback banner ────────────────────────────────────────
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
        }

        if (selectedTest == null) {
            // ─── Test list ──────────────────────────────────────────
            item {
                SectionHeader(text = "TESTS FOR ${selectedAssignment?.displayTitle?.uppercase() ?: "SELECTED CLASS"}",
                    trailingLabel = "${tests.size} test${if (tests.size == 1) "" else "s"}")
            }

            when {
                isLoadingTests -> {
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
                                Text(text = "Loading tests...", color = TextSubheading, fontSize = 12.sp)
                            }
                        }
                    }
                }

                tests.isEmpty() -> {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0x1A0F172A))
                                .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(14.dp))
                                .padding(20.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(text = "🗂️", fontSize = 30.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "No tests found for this class & subject yet.",
                                    color = TextSubheading,
                                    fontSize = 12.sp,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Tests are created by administration. Pull the list again to refresh.",
                                    color = TextMuted,
                                    fontSize = 11.sp,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = "🔄 Refresh",
                                    color = SkyGlow,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.clickable(onClick = onRefresh)
                                )
                            }
                        }
                    }
                }

                else -> {
                    items(tests, key = { it.id }) { test ->
                        TestCard(test = test, onClick = { onSelectTest(test) })
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        } else {
            // ─── Marks entry sheet ──────────────────────────────────
            item {
                TestSheetHeader(
                    test = selectedTest,
                    onBack = onBackToTests,
                    onRefresh = { onRefresh() }
                )
            }

            when {
                isLoadingStudents -> {
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
                                Text(text = "Loading students...", color = TextSubheading, fontSize = 12.sp)
                            }
                        }
                    }
                }

                rows.isEmpty() -> {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0x1A0F172A))
                                .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(14.dp))
                                .padding(20.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No students found for this test's class & section.",
                                color = TextMuted,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                else -> {
                    item {
                        SectionHeader(
                            text = "MARKS SHEET",
                            trailingLabel = "${rows.size} student${if (rows.size == 1) "" else "s"}"
                        )
                    }

                    items(rows, key = { it.studentId }) { row ->
                        StudentMarkRow(
                            row = row,
                            totalMarks = selectedTest.totalMarks,
                            onMarksChange = { text -> onMarksChange(row.studentId, text) },
                            onToggleAbsent = { onToggleAbsent(row.studentId) }
                        )
                    }

                    item {
                        val canSave = !isSaving && rows.isNotEmpty()

                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(
                                    if (canSave) {
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
                                    if (canSave) ButtonBorderSky else Color(0x33475569),
                                    RoundedCornerShape(12.dp)
                                )
                                .clickable(enabled = canSave) { onSave() }
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
                                        text = "Saving Marks...",
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
                                    Text(text = "💾", fontSize = 15.sp)
                                    Text(
                                        text = "Save Marks",
                                        color = if (canSave) TextHeading else TextMuted,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun MarksAssignmentSelector(
    assignments: List<TeacherAssignment>,
    selectedAssignment: TeacherAssignment?,
    onSelectAssignment: (TeacherAssignment) -> Unit,
    isLoading: Boolean
) {
    Column {
        Text(
            text = "MY CLASS & SUBJECT",
            color = SkyGlow,
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.2.sp
        )

        Spacer(modifier = Modifier.height(8.dp))

        when {
            isLoading && assignments.isEmpty() -> {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp),
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
                        text = "No course assignments found for your teacher account.",
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
                        TestAssignmentChip(
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
private fun TestAssignmentChip(
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
                        Brush.linearGradient(listOf(Color(0xFF1E3A8A), Color(0xFF0F172A)))
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
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun SectionHeader(text: String, trailingLabel: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = text,
            color = SkyGlow,
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.2.sp,
            modifier = Modifier.weight(1f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = trailingLabel,
            color = TextMuted,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun TestCard(
    test: TeacherTest,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x1A0F172A))
            .border(1.dp, Color(0x3338BDF8), RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(14.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = test.title,
                    color = TextHeading,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(3.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.horizontalScroll(rememberScrollState())
                ) {
                    test.categoryName?.let { name ->
                        InfoPill(text = name, contentColor = SkyGlow)
                    }
                    InfoPill(text = test.formattedDate, contentColor = AuraGold)
                }
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = if (test.totalMarks == test.totalMarks.toLong().toDouble()) {
                        test.totalMarks.toLong().toString()
                    } else {
                        test.totalMarks.toString()
                    },
                    color = SkyGlow,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "Total Marks",
                    color = TextMuted,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Text(text = "✍️", fontSize = 16.sp)
        }
    }
}

@Composable
private fun InfoPill(text: String, contentColor: Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(100.dp))
            .background(contentColor.copy(alpha = 0.13f))
            .border(1.dp, contentColor.copy(alpha = 0.4f), RoundedCornerShape(100.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = text,
            color = contentColor,
            fontSize = 9.5.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1
        )
    }
}

@Composable
private fun TestSheetHeader(
    test: TeacherTest,
    onBack: () -> Unit,
    onRefresh: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color(0x1F0F172A))
            .border(1.dp, Color(0x4038BDF8), RoundedCornerShape(14.dp))
            .padding(12.dp)
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0x1F38BDF8))
                        .border(1.dp, Color(0x4D38BDF8), RoundedCornerShape(10.dp))
                        .clickable(onClick = onBack)
                ) {
                    Text(text = "←", color = SkyGlow, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = test.title,
                        color = TextHeading,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${test.subjectName} • ${test.formattedDate}",
                        color = TextSubheading,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Text(
                    text = "🔄",
                    fontSize = 14.sp,
                    modifier = Modifier.clickable(onClick = onRefresh)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                InfoPill(text = "Total: ${test.totalMarks}", contentColor = SkyGlow)
                InfoPill(
                    text = if (test.passingMarks > 0) "Passing: ${test.passingMarks}" else "No passing limit",
                    contentColor = AuraGold
                )
            }
        }
    }
}

@Composable
private fun StudentMarkRow(
    row: TestMarkRow,
    totalMarks: Double,
    onMarksChange: (String) -> Unit,
    onToggleAbsent: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (row.isAbsent) Color(0x26F43F5E) else Color(0x1A0F172A))
            .border(
                1.dp,
                if (row.isAbsent) Color(0x66F43F5E) else Color(0x3338BDF8),
                RoundedCornerShape(12.dp)
            )
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(SkyGlow.copy(alpha = 0.14f))
                        .border(1.dp, SkyGlow.copy(alpha = 0.45f), CircleShape)
                ) {
                    Text(
                        text = row.rollLabel,
                        color = SkyGlow,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = row.name,
                        color = TextHeading,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    row.fatherName?.let {
                        Text(
                            text = "S/o $it",
                            color = TextMuted,
                            fontSize = 10.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                OutlinedTextField(
                    value = row.obtainedMarksText,
                    onValueChange = { if (!row.isAbsent) onMarksChange(it) },
                    enabled = !row.isAbsent,
                    placeholder = {
                        Text(
                            text = "–",
                            color = InputPlaceholder,
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center
                        )
                    },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Done
                    ),
                    modifier = Modifier.width(84.dp),
                    textStyle = androidx.compose.ui.text.TextStyle(
                        color = TextHeading,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextHeading,
                        unfocusedTextColor = TextHeading,
                        disabledTextColor = TextMuted,
                        focusedContainerColor = InputBgFocus,
                        unfocusedContainerColor = InputBg,
                        disabledContainerColor = Color(0x140F172A),
                        cursorColor = SkyGlow,
                        focusedBorderColor = InputBorderFocus,
                        unfocusedBorderColor = InputBorderIdle,
                        disabledBorderColor = Color(0x268B99B3)
                    ),
                    shape = RoundedCornerShape(10.dp)
                )
            }

            Spacer(modifier = Modifier.height(7.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "out of ${totalMarks.toLong()}",
                    color = TextMuted,
                    fontSize = 10.sp
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    row.existingGrade?.let { grade ->
                        InfoPill(text = "Grade: $grade", contentColor = EmeraldSuccess)
                    }

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(100.dp))
                            .background(
                                if (row.isAbsent) CoralError.copy(alpha = 0.2f)
                                else Color(0x14FFFFFF)
                            )
                            .border(
                                1.dp,
                                if (row.isAbsent) CoralError else Color(0x404B5C77),
                                RoundedCornerShape(100.dp)
                            )
                            .clickable(onClick = onToggleAbsent)
                            .padding(horizontal = 11.dp, vertical = 5.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = if (row.isAbsent) "🚫" else "🪑",
                                fontSize = 11.sp
                            )
                            Text(
                                text = if (row.isAbsent) "Absent" else "Mark Absent",
                                color = if (row.isAbsent) BannerErrorText else TextSubheading,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}
