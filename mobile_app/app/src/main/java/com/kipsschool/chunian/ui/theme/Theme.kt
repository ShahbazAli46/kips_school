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
    onPrimary = WebBackground,
    primaryContainer = Brand900,
    onPrimaryContainer = TextHeading,
    secondary = FireflyGoldAura,
    onSecondary = WebBackground,
    background = WebBackground,
    onBackground = TextHeading,
    surface = Brand950,
    onSurface = TextHeading,
    surfaceVariant = Brand900,
    onSurfaceVariant = TextSubheading,
    error = CoralError,
    onError = TextHeading
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
                // Match exact web dark background for status bar & navigation bar
                window.statusBarColor = WebBackground.toArgb()
                window.navigationBarColor = WebBackground.toArgb()
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