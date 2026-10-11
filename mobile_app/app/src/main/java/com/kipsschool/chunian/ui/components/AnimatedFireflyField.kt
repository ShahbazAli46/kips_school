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
import com.kipsschool.chunian.ui.theme.MidnightNavy
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

private class Firefly(
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    val baseRadius: Float,
    val maxGlowRadius: Float,
    val color: Color,
    val flashPeriod: Float,
    var flashPhase: Float
)

@Composable
fun AnimatedFireflyField(
    modifier: Modifier = Modifier,
    particleCount: Int = 38
) {
    val fireflies = remember { mutableStateListOf<Firefly>() }

    // Aurora atmospheric breathing animation
    val infiniteTransition = rememberInfiniteTransition(label = "aurora")
    val auroraAlpha1 by infiniteTransition.animateFloat(
        initialValue = 0.12f,
        targetValue = 0.28f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4200, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "aurora1"
    )
    val auroraAlpha2 by infiniteTransition.animateFloat(
        initialValue = 0.08f,
        targetValue = 0.22f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 5600, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "aurora2"
    )

    // Continuous 60fps particle loop
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

                    // Gentle drift direction change
                    f.vx += (Random.nextFloat() - 0.5f) * 0.06f
                    f.vy += (Random.nextFloat() - 0.5f) * 0.06f
                    f.vx = f.vx.coerceIn(-1.5f, 1.5f)
                    f.vy = f.vy.coerceIn(-1.5f, 1.5f)

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
            .background(MidnightNavy)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height

            if (width <= 0f || height <= 0f) return@Canvas

            // Lazy initialize fireflies when Canvas dimensions are known
            if (fireflies.isEmpty()) {
                val colors = listOf(
                    Color(0xFF38BDF8), // Cyan glow
                    Color(0xFFFACC15), // Gold glow
                    Color(0xFFA3E635), // Lime glow
                    Color(0xFFFBBF24), // Amber glow
                    Color(0xFF60A5FA)  // Sky blue glow
                )
                for (i in 0 until particleCount) {
                    val angle = Random.nextFloat() * 2f * PI.toFloat()
                    val speed = Random.nextFloat() * 0.8f + 0.4f
                    fireflies.add(
                        Firefly(
                            x = Random.nextFloat() * width,
                            y = Random.nextFloat() * height,
                            vx = kotlin.math.cos(angle) * speed,
                            vy = kotlin.math.sin(angle) * speed,
                            baseRadius = Random.nextFloat() * 1.5f + 1.2f,
                            maxGlowRadius = Random.nextFloat() * 12f + 14f,
                            color = colors[Random.nextInt(colors.size)],
                            flashPeriod = Random.nextFloat() * 2.8f + 2.0f,
                            flashPhase = Random.nextFloat() * 2f * PI.toFloat()
                        )
                    )
                }
            }

            // 1. Atmospheric Ambient Radial Blooms
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF0284C7).copy(alpha = auroraAlpha1),
                        Color(0xFF1E3A8A).copy(alpha = auroraAlpha1 * 0.5f),
                        Color.Transparent
                    ),
                    center = Offset(width * 0.25f, height * 0.2f),
                    radius = width * 0.85f
                ),
                radius = width * 0.85f,
                center = Offset(width * 0.25f, height * 0.2f)
            )

            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF2563EB).copy(alpha = auroraAlpha2),
                        Color.Transparent
                    ),
                    center = Offset(width * 0.8f, height * 0.75f),
                    radius = width * 0.75f
                ),
                radius = width * 0.75f,
                center = Offset(width * 0.8f, height * 0.75f)
            )

            // 2. Render each bioluminescent firefly
            for (f in fireflies) {
                // Screen wrapping
                if (f.x < -30f) f.x = width + 30f
                if (f.x > width + 30f) f.x = -30f
                if (f.y < -30f) f.y = height + 30f
                if (f.y > height + 30f) f.y = -30f

                // Flash sine curve: oscillates between 0.25 and 1.0
                val flash = ((sin(f.flashPhase) + 1f) / 2f).coerceIn(0f, 1f)
                val intensity = 0.20f + flash * 0.80f

                val currentGlow = f.maxGlowRadius * (0.6f + intensity * 0.5f)

                // Soft outer haze
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            f.color.copy(alpha = intensity * 0.45f),
                            f.color.copy(alpha = intensity * 0.12f),
                            Color.Transparent
                        ),
                        center = Offset(f.x, f.y),
                        radius = currentGlow
                    ),
                    radius = currentGlow,
                    center = Offset(f.x, f.y)
                )

                // Radiant bright corona
                drawCircle(
                    color = f.color.copy(alpha = (intensity * 0.95f).coerceAtMost(1f)),
                    radius = f.baseRadius * 2.2f,
                    center = Offset(f.x, f.y)
                )

                // Incandescent hot core
                drawCircle(
                    color = Color.White.copy(alpha = (intensity * 1.2f).coerceAtMost(1f)),
                    radius = f.baseRadius * 0.9f,
                    center = Offset(f.x, f.y)
                )
            }
        }
    }
}
