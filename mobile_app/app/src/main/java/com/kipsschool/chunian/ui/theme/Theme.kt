package com.kipsschool.chunian.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val KipsDarkColorScheme = darkColorScheme(
    primary = SkyGlow,
    onPrimary = MidnightNavy,
    primaryContainer = CobaltBlue,
    onPrimaryContainer = TextWhite,
    secondary = AuraGold,
    onSecondary = MidnightNavy,
    background = MidnightNavy,
    onBackground = TextWhite,
    surface = SurfaceCard,
    onSurface = TextWhite,
    surfaceVariant = SurfaceCardElevated,
    onSurfaceVariant = TextSkyMuted,
    error = CoralError,
    onError = TextWhite
)

@Composable
fun KipsSchoolTheme(
    content: @Composable () -> Unit
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = MidnightNavy.toArgb()
                window.navigationBarColor = MidnightNavy.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
                WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = false
            }
        }
    }

    MaterialTheme(
        colorScheme = KipsDarkColorScheme,
        typography = Typography,
        content = content
    )
}