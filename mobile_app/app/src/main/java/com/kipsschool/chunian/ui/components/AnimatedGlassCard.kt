package com.kipsschool.chunian.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kipsschool.chunian.ui.theme.WebGlassBorder
import com.kipsschool.chunian.ui.theme.WebGlassBottom
import com.kipsschool.chunian.ui.theme.WebGlassGlow
import com.kipsschool.chunian.ui.theme.WebGlassSpecular
import com.kipsschool.chunian.ui.theme.WebGlassTop

@Composable
fun AnimatedGlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 28.dp,
    content: @Composable BoxScope.() -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)

    Box(
        modifier = modifier
            // Exact web shadow: 0 30px 60px -12px rgba(0,0,0,0.65) and 0 0 40px rgba(56,189,248,0.15)
            .shadow(
                elevation = 26.dp,
                shape = shape,
                ambientColor = WebGlassGlow,
                spotColor = WebGlassGlow
            )
            .clip(shape)
            // Exact web card gradient: linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(15,23,42,0.28) 100%)
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        WebGlassTop,
                        WebGlassBottom
                    )
                )
            )
            // Exact web card border: 1px solid rgba(56, 189, 248, 0.28) with top specular highlight
            .border(
                width = 1.dp,
                brush = Brush.verticalGradient(
                    colors = listOf(
                        WebGlassSpecular,
                        WebGlassBorder,
                        WebGlassBorder.copy(alpha = 0.15f)
                    )
                ),
                shape = shape
            )
            .padding(24.dp)
    ) {
        content()
    }
}
