package com.kipsschool.chunian.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kipsschool.chunian.data.model.UserProfile
import com.kipsschool.chunian.ui.components.AnimatedFireflyField
import com.kipsschool.chunian.ui.components.AnimatedGlassCard
import com.kipsschool.chunian.ui.theme.AuraGold
import com.kipsschool.chunian.ui.theme.BannerErrorBg
import com.kipsschool.chunian.ui.theme.BannerErrorBorder
import com.kipsschool.chunian.ui.theme.BannerErrorText
import com.kipsschool.chunian.ui.theme.Brand900
import com.kipsschool.chunian.ui.theme.ButtonGradientStart
import com.kipsschool.chunian.ui.theme.EmeraldSuccess
import com.kipsschool.chunian.ui.theme.SkyGlow
import com.kipsschool.chunian.ui.theme.TextHeading
import com.kipsschool.chunian.ui.theme.TextMuted
import com.kipsschool.chunian.ui.theme.TextSubheading
import com.kipsschool.chunian.ui.theme.WebBackground

@Composable
fun TeacherWelcomeScreen(
    user: UserProfile,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    var isVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        isVisible = true
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(WebBackground)
    ) {
        AnimatedFireflyField(particleCount = 28)

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(horizontal = 20.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(20.dp))

                AnimatedVisibility(
                    visible = isVisible,
                    enter = fadeIn(spring(stiffness = Spring.StiffnessLow)) +
                            slideInVertically(
                                initialOffsetY = { -60 },
                                animationSpec = spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessLow
                                )
                            )
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        val initials = user.name.split(" ")
                            .filter { it.isNotBlank() }
                            .take(2)
                            .map { it.first().uppercase() }
                            .joinToString("")
                            .ifBlank { "T" }

                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(90.dp)
                                .shadow(
                                    elevation = 20.dp,
                                    shape = CircleShape,
                                    ambientColor = SkyGlow,
                                    spotColor = AuraGold
                                )
                                .clip(CircleShape)
                                .background(
                                    Brush.linearGradient(
                                        listOf(ButtonGradientStart, Brand900)
                                    )
                                )
                                .border(2.5.dp, SkyGlow, CircleShape)
                        ) {
                            Text(
                                text = initials,
                                color = TextHeading,
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Black
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(100.dp))
                                .background(EmeraldSuccess.copy(alpha = 0.15f))
                                .border(1.dp, EmeraldSuccess.copy(alpha = 0.6f), RoundedCornerShape(100.dp))
                                .padding(horizontal = 12.dp, vertical = 4.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(EmeraldSuccess)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "FACULTY AUTHENTICATED",
                                color = EmeraldSuccess,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 1.2.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = "Welcome, ${user.name}",
                            color = TextHeading,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold
                        )

                        Text(
                            text = "KIPS School Chunian — Teacher Portal",
                            color = TextSubheading,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            item {
                AnimatedVisibility(
                    visible = isVisible,
                    enter = fadeIn(spring(stiffness = Spring.StiffnessLow)) +
                            slideInVertically(
                                initialOffsetY = { 60 },
                                animationSpec = spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessLow
                                )
                            )
                ) {
                    AnimatedGlassCard(
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            Text(
                                text = "TEACHER PROFILE",
                                color = AuraGold,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = 1.4.sp
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            ProfileRow(label = "Employee Name", value = user.name)
                            ProfileRow(label = "Official Email", value = user.email ?: "Not specified")
                            ProfileRow(label = "Contact Number", value = user.contact_number ?: "Not specified")
                            user.className?.let { ProfileRow(label = "Assigned Class", value = it) }
                            user.sectionName?.let { ProfileRow(label = "Section", value = it) }
                            user.majorName?.let { ProfileRow(label = "Specialization", value = it) }

                            Spacer(modifier = Modifier.height(14.dp))

                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(SkyGlow.copy(alpha = 0.08f))
                                    .border(1.dp, SkyGlow.copy(alpha = 0.3f), RoundedCornerShape(14.dp))
                                    .padding(12.dp)
                            ) {
                                Text(
                                    text = "✨ Login session verified successfully! Next teacher modules (Attendance, Salary Slips, Diaries, Leaves) are ready to be connected.",
                                    color = TextSubheading,
                                    fontSize = 12.sp,
                                    lineHeight = 17.sp
                                )
                            }
                        }
                    }
                }
            }

            // Quick Modules Teaser
            item {
                AnimatedGlassCard(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column {
                        Text(
                            text = "TEACHER PORTAL MODULES",
                            color = SkyGlow,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = 1.4.sp
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        ModuleTeaserItem(icon = "⏱️", title = "Self Attendance", desc = "GPS & Biometric daily check-in")
                        ModuleTeaserItem(icon = "💼", title = "Salary Slips", desc = "Official payroll slips with Figma design")
                        ModuleTeaserItem(icon = "📖", title = "Teacher Diary", desc = "Daily student homework and announcements")
                        ModuleTeaserItem(icon = "🌴", title = "Leave Management", desc = "Submit and track leave applications")
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = onLogout,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = BannerErrorBg
                    ),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .border(1.dp, BannerErrorBorder, RoundedCornerShape(14.dp))
                ) {
                    Text(
                        text = "Sign Out from Teacher Portal",
                        color = BannerErrorText,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }

                Spacer(modifier = Modifier.height(30.dp))
            }
        }
    }
}

@Composable
private fun ProfileRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            color = TextMuted,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
        )
        Text(
            text = value,
            color = TextHeading,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun ModuleTeaserItem(icon: String, title: String, desc: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = icon,
            fontSize = 18.sp,
            modifier = Modifier.padding(end = 12.dp)
        )
        Column {
            Text(
                text = title,
                color = TextHeading,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = desc,
                color = TextMuted,
                fontSize = 11.sp
            )
        }
    }
}
