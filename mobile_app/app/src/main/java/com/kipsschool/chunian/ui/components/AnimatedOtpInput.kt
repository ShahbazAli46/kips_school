package com.kipsschool.chunian.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kipsschool.chunian.ui.theme.CoralError
import com.kipsschool.chunian.ui.theme.SkyGlow
import com.kipsschool.chunian.ui.theme.TextWhite
import kotlin.math.roundToInt

@Composable
fun AnimatedOtpInput(
    otpValue: String,
    onOtpChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    length: Int = 6,
    isError: Boolean = false,
    onComplete: () -> Unit = {}
) {
    val focusRequester = remember { FocusRequester() }
    val shakeOffset = remember { Animatable(0f) }

    // Trigger shake on error
    LaunchedEffect(isError) {
        if (isError) {
            for (i in 0..5) {
                val target = if (i % 2 == 0) -16f else 16f
                shakeOffset.animateTo(target, tween(40, easing = LinearEasing))
            }
            shakeOffset.animateTo(0f, tween(40, easing = LinearEasing))
        }
    }

    // Auto-focus when mounted
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    // Blinking cursor dot animation
    val infiniteTransition = rememberInfiniteTransition(label = "cursor_anim")
    val cursorAlpha by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(550, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "cursor_blink"
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .offset { IntOffset(shakeOffset.value.roundToInt(), 0) },
        contentAlignment = Alignment.Center
    ) {
        // Hidden real text field capturing input
        BasicTextField(
            value = otpValue,
            onValueChange = { input ->
                val filtered = input.filter { it.isDigit() }.take(length)
                onOtpChange(filtered)
                if (filtered.length == length) {
                    onComplete()
                }
            },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            keyboardActions = KeyboardActions(onDone = {
                if (otpValue.length == length) onComplete()
            }),
            modifier = Modifier
                .size(1.dp)
                .focusRequester(focusRequester),
            singleLine = true
        )

        // Visual 6-Box Presentation
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) {
                    focusRequester.requestFocus()
                },
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            for (index in 0 until length) {
                val digit = otpValue.getOrNull(index)?.toString() ?: ""
                val isFocused = otpValue.length == index
                val isFilled = digit.isNotEmpty()

                // Digit pop scale animation
                val digitScale = remember { Animatable(1f) }
                LaunchedEffect(digit) {
                    if (digit.isNotEmpty()) {
                        digitScale.snapTo(1.25f)
                        digitScale.animateTo(1f, spring(dampingRatio = 0.5f, stiffness = 400f))
                    }
                }

                val borderColor by animateColorAsState(
                    targetValue = when {
                        isError -> CoralError
                        isFocused -> SkyGlow
                        isFilled -> SkyGlow.copy(alpha = 0.7f)
                        else -> Color(0x3338BDF8)
                    },
                    animationSpec = tween(250),
                    label = "border_color"
                )

                val boxBg by animateColorAsState(
                    targetValue = when {
                        isFocused -> Color(0x1F0284C7)
                        isFilled -> Color(0x1538BDF8)
                        else -> Color(0x0CFFFFFF)
                    },
                    animationSpec = tween(250),
                    label = "box_bg"
                )

                Box(
                    modifier = Modifier
                        .width(46.dp)
                        .height(56.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(boxBg)
                        .border(
                            width = if (isFocused || isFilled) 1.8.dp else 1.dp,
                            color = borderColor,
                            shape = RoundedCornerShape(14.dp)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (digit.isNotEmpty()) {
                        Text(
                            text = digit,
                            color = TextWhite,
                            fontSize = 22.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.scale(digitScale.value)
                        )
                    } else if (isFocused) {
                        // Pulsing cursor dot
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(SkyGlow.copy(alpha = cursorAlpha))
                        )
                    }
                }
            }
        }
    }
}
