package com.kipsschool.chunian

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.kipsschool.chunian.data.api.ApiClient
import com.kipsschool.chunian.data.local.SessionManager
import com.kipsschool.chunian.ui.screens.TeacherLoginScreen
import com.kipsschool.chunian.ui.theme.KipsSchoolTheme
import com.kipsschool.chunian.ui.theme.MidnightNavy
import com.kipsschool.chunian.viewmodel.TeacherLoginViewModel
import com.kipsschool.chunian.viewmodel.TeacherPortalViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            // The app is always dark, so force light (white) system-bar icons.
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        )

        val sessionManager = SessionManager(applicationContext)
        val apiClient = ApiClient(sessionManager)
        val viewModel = TeacherLoginViewModel(apiClient, sessionManager)
        val portalViewModel = TeacherPortalViewModel(apiClient, sessionManager)

        setContent {
            KipsSchoolTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MidnightNavy
                ) {
                    TeacherLoginScreen(
                        viewModel = viewModel,
                        portalViewModel = portalViewModel
                    )
                }
            }
        }
    }
}