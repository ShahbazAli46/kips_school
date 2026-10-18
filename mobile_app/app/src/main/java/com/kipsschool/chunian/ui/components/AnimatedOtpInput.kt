package com.kipsschool.chunian.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kipsschool.chunian.ui.theme.BannerErrorBorder
import com.kipsschool.chunian.ui.theme.InputBorderFocus
import com.kipsschool.chunian.ui.theme.SkyGlow
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.input.ImeAction
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
    val keyboardController = LocalSoftwareKeyboardController.current
    val shakeOffset = remember { Animatable(0f) }

    LaunchedEffect(isError) {
        if (isError) {
            for (i in 0..5) {
                val target = if (i % 2 == 0) -14f else 14f
                shakeOffset.animateTo(target, tween(40, easing = LinearEasing))
            }
            shakeOffset.animateTo(0f, tween(40, easing = LinearEasing))
        }
    }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        keyboardController?.show()
    }

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
        BasicTextField(
            value = otpValue,
            onValueChange = { input ->
                val filtered = input.filter { it.isDigit() }.take(length)
                onOtpChange(filtered)
                if (filtered.length == length) {
                    onComplete()
                }
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.NumberPassword,
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(onDone = {
                if (otpValue.length == length) onComplete()
            }),
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(focusRequester)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) {
                    focusRequester.requestFocus()
                    keyboardController?.show()
                },
            singleLine = true,
            decorationBox = {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            focusRequester.requestFocus()
                            keyboardController?.show()
                        },
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    for (index in 0 until length) {
                        val digit = otpValue.getOrNull(index)?.toString() ?: ""
                        val isFocused = otpValue.length == index
                        val isFilled = digit.isNotEmpty()

                        val digitScale = remember { Animatable(1f) }
                        LaunchedEffect(digit) {
                            if (digit.isNotEmpty()) {
                                digitScale.snapTo(1.22f)
                                digitScale.animateTo(1f, spring(dampingRatio = 0.5f, stiffness = 420f))
                            }
                        }

                        // Web exact colors: border-sky-500/40, focus:border-sky-400, bg-white/[0.05]
                        val borderColor by animateColorAsState(
                            targetValue = when {
                                isError -> BannerErrorBorder
                                isFocused -> InputBorderFocus // #38bdf8
                                isFilled -> Color(0x9938BDF8)
                                else -> Color(0x660EA5E9) // border-sky-500/40
                            },
                            animationSpec = tween(220),
                            label = "border_color"
                        )

                        val boxBg by animateColorAsState(
                            targetValue = when {
                                isFocused -> Color(0x1F0284C7)
                                isFilled -> Color(0x140EA5E9)
                                else -> Color(0x0DFFFFFF) // bg-white/[0.05]
                            },
                            animationSpec = tween(220),
                            label = "box_bg"
                        )

                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(boxBg)
                                .border(
                                    width = if (isFocused || isFilled) 1.8.dp else 1.dp,
                                    color = borderColor,
                                    shape = RoundedCornerShape(12.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (digit.isNotEmpty()) {
                                Text(
                                    text = digit,
                                    // Exact web text-sky-300: #7dd3fc
                                    color = Color(0xFF7DD3FC),
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.scale(digitScale.value)
                                )
                            } else if (isFocused) {
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
        )
    }
}
