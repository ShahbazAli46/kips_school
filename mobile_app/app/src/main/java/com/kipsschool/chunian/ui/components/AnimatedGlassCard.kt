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
import com.kipsschool.chunian.ui.theme.SkyGlow

@Composable
fun AnimatedGlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 28.dp,
    content: @Composable BoxScope.() -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)

    Box(
        modifier = modifier
            .shadow(
                elevation = 28.dp,
                shape = shape,
                ambientColor = SkyGlow.copy(alpha = 0.25f),
                spotColor = SkyGlow.copy(alpha = 0.25f)
            )
            .clip(shape)
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(
                        Color(0x18FFFFFF),
                        Color(0x100E1A38),
                        Color(0x1C132247)
                    )
                )
            )
            .border(
                width = 1.2.dp,
                brush = Brush.verticalGradient(
                    colors = listOf(
                        SkyGlow.copy(alpha = 0.55f),
                        Color(0x1FFFFFFF),
                        SkyGlow.copy(alpha = 0.25f)
                    )
                ),
                shape = shape
            )
            .padding(24.dp)
    ) {
        content()
    }
}
