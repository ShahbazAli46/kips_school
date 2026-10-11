package com.kipsschool.chunian.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import com.kipsschool.chunian.ui.theme.FireflyAmberAura
import com.kipsschool.chunian.ui.theme.FireflyAmberCore
import com.kipsschool.chunian.ui.theme.FireflyCyanAura
import com.kipsschool.chunian.ui.theme.FireflyCyanCore
import com.kipsschool.chunian.ui.theme.FireflyGoldAura
import com.kipsschool.chunian.ui.theme.FireflyGoldCore
import com.kipsschool.chunian.ui.theme.FireflyLimeAura
import com.kipsschool.chunian.ui.theme.FireflyLimeCore
import com.kipsschool.chunian.ui.theme.WebBackground
import com.kipsschool.chunian.ui.theme.WebBgCyanCircle
import com.kipsschool.chunian.ui.theme.WebBgEllipse
import com.kipsschool.chunian.ui.theme.WebBloomBlue
import com.kipsschool.chunian.ui.theme.WebBloomSky
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

private class FireflyColorPair(
    val coreColor: Color,
    val auraColor: Color
)

private class Firefly(
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    val baseRadius: Float,
    val maxGlowRadius: Float,
    val colorPair: FireflyColorPair,
    val flashPeriod: Float,
    var flashPhase: Float
)

@Composable
fun AnimatedFireflyField(
    modifier: Modifier = Modifier,
    particleCount: Int = 40
) {
    val fireflies = remember { mutableStateListOf<Firefly>() }

    // Breathing pulse for the atmospheric ambient blooms
    val infiniteTransition = rememberInfiniteTransition(label = "aurora")
    val bloomScale1 by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 5000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bloom1"
    )
    val bloomScale2 by infiniteTransition.animateFloat(
        initialValue = 0.90f,
        targetValue = 1.10f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 6500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bloom2"
    )

    // 60fps smooth physics loop
    LaunchedEffect(Unit) {
        var lastTime = 0L
        while (true) {
            withFrameMillis { frameTime ->
                if (lastTime == 0L) lastTime = frameTime
                val dt = ((frameTime - lastTime) / 1000f).coerceIn(0.008f, 0.033f)
                lastTime = frameTime

                for (f in fireflies) {
                    f.x += f.vx
                    f.y += f.vy

                    // Organic drift curvature
                    f.vx += (Random.nextFloat() - 0.5f) * 0.05f
                    f.vy += (Random.nextFloat() - 0.5f) * 0.05f
                    f.vx = f.vx.coerceIn(-1.6f, 1.6f)
                    f.vy = f.vy.coerceIn(-1.6f, 1.6f)

                    f.flashPhase += dt * (2f * PI.toFloat() / f.flashPeriod)
                    if (f.flashPhase > 2f * PI) {
                        f.flashPhase -= (2f * PI.toFloat())
                    }
                }
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(WebBackground)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            if (width <= 0f || height <= 0f) return@Canvas

            // Lazy initialize fireflies matching the exact web color palette distribution
            if (fireflies.isEmpty()) {
                val colorPairs = listOf(
                    FireflyColorPair(FireflyGoldCore, FireflyGoldAura),
                    FireflyColorPair(FireflyGoldCore, FireflyGoldAura),
                    FireflyColorPair(FireflyLimeCore, FireflyLimeAura),
                    FireflyColorPair(FireflyCyanCore, FireflyCyanAura),
                    FireflyColorPair(FireflyGoldCore, FireflyGoldAura),
                    FireflyColorPair(FireflyAmberCore, FireflyAmberAura),
                    FireflyColorPair(FireflyLimeCore, FireflyLimeAura)
                )

                for (i in 0 until particleCount) {
                    val angle = Random.nextFloat() * 2f * PI.toFloat()
                    val speed = Random.nextFloat() * 0.85f + 0.35f
                    fireflies.add(
                        Firefly(
                            x = Random.nextFloat() * width,
                            y = Random.nextFloat() * height,
                            vx = kotlin.math.cos(angle) * speed,
                            vy = kotlin.math.sin(angle) * speed,
                            baseRadius = Random.nextFloat() * 1.4f + 1.2f,
                            maxGlowRadius = Random.nextFloat() * 14f + 12f,
                            colorPair = colorPairs[Random.nextInt(colorPairs.size)],
                            flashPeriod = Random.nextFloat() * 3.0f + 2.0f,
                            flashPhase = Random.nextFloat() * 2f * PI.toFloat()
                        )
                    )
                }
            }

            // 1. Top Ellipse Gradient (radial-gradient(ellipse at 50% -20%, rgba(30, 58, 138, 0.4), transparent))
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(WebBgEllipse, Color.Transparent),
                    center = Offset(width * 0.5f, -height * 0.15f),
                    radius = width * 1.1f
                ),
                radius = width * 1.1f,
                center = Offset(width * 0.5f, -height * 0.15f)
            )

            // 2. Center-Bottom Cyan Circle Gradient (radial-gradient(circle at 50% 60%, rgba(14, 165, 233, 0.08), transparent))
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(WebBgCyanCircle, Color.Transparent),
                    center = Offset(width * 0.5f, height * 0.6f),
                    radius = width * 0.7f
                ),
                radius = width * 0.7f,
                center = Offset(width * 0.5f, height * 0.6f)
            )

            // 3. Ambient Atmospheric Atmospheric Sky Bloom (Top-Left, rgba(56, 189, 248, 0.16))
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(WebBloomSky, Color.Transparent),
                    center = Offset(width * 0.25f, height * 0.25f),
                    radius = width * 0.65f * bloomScale1
                ),
                radius = width * 0.65f * bloomScale1,
                center = Offset(width * 0.25f, height * 0.25f)
            )

            // 4. Ambient Atmospheric Blue Bloom (Bottom-Right, rgba(37, 99, 235, 0.18))
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(WebBloomBlue, Color.Transparent),
                    center = Offset(width * 0.75f, height * 0.75f),
                    radius = width * 0.7f * bloomScale2
                ),
                radius = width * 0.7f * bloomScale2,
                center = Offset(width * 0.75f, height * 0.75f)
            )

            // 5. Render Bioluminescent Firefly Swarm
            for (f in fireflies) {
                // Screen wrapping
                if (f.x < -30f) f.x = width + 30f
                if (f.x > width + 30f) f.x = -30f
                if (f.y < -30f) f.y = height + 30f
                if (f.y > height + 30f) f.y = -30f

                // Biological sine flash curve (between 0.22 and 1.0)
                val flash = ((sin(f.flashPhase) + 1f) / 2f).coerceIn(0f, 1f)
                val intensity = 0.22f + flash * 0.78f
                val currentGlow = f.maxGlowRadius * (0.65f + intensity * 0.5f)

                // Outer atmospheric haze
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            f.colorPair.auraColor.copy(alpha = intensity * 0.45f),
                            f.colorPair.auraColor.copy(alpha = intensity * 0.12f),
                            Color.Transparent
                        ),
                        center = Offset(f.x, f.y),
                        radius = currentGlow
                    ),
                    radius = currentGlow,
                    center = Offset(f.x, f.y)
                )

                // Radiant Corona
                drawCircle(
                    color = f.colorPair.auraColor.copy(alpha = (intensity * 0.95f).coerceAtMost(1f)),
                    radius = f.baseRadius * 2.2f,
                    center = Offset(f.x, f.y)
                )

                // Hot Incandescent Insect Light Core
                drawCircle(
                    color = f.colorPair.coreColor.copy(alpha = (intensity * 1.3f).coerceAtMost(1f)),
                    radius = f.baseRadius * 0.85f,
                    center = Offset(f.x, f.y)
                )
            }
        }
    }
}
