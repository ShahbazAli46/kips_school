package com.kipsschool.chunian.ui.components

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

private enum class RemoteImagePhase { LOADING, LOADED, UNAVAILABLE }

/**
 * Minimal dependency-free remote image loader.
 *
 * Downloads [url] once (keyed on the url) and renders the decoded bitmap. Callers provide
 * their own [placeholder] (while loading) and [fallback] (blank / failed) content, so this
 * works for avatars, signature previews and any other stored media.
 */
@Composable
fun RemoteImage(
    url: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit,
    placeholder: @Composable () -> Unit = {},
    fallback: @Composable () -> Unit = {}
) {
    var bitmap by remember(url) { mutableStateOf<ImageBitmap?>(null) }
    var phase by remember(url) {
        mutableStateOf(if (url.isNullOrBlank()) RemoteImagePhase.UNAVAILABLE else RemoteImagePhase.LOADING)
    }

    LaunchedEffect(url) {
        if (url.isNullOrBlank()) {
            bitmap = null
            phase = RemoteImagePhase.UNAVAILABLE
            return@LaunchedEffect
        }

        phase = RemoteImagePhase.LOADING
        val loaded = withContext(Dispatchers.IO) {
            try {
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 15000
                    readTimeout = 15000
                    doInput = true
                }
                conn.inputStream.use { BitmapFactory.decodeStream(it)?.asImageBitmap() }
            } catch (_: Exception) {
                null
            }
        }

        bitmap = loaded
        phase = if (loaded != null) RemoteImagePhase.LOADED else RemoteImagePhase.UNAVAILABLE
    }

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        when (phase) {
            RemoteImagePhase.LOADED -> {
                val image = bitmap
                if (image != null) {
                    Image(
                        bitmap = image,
                        contentDescription = contentDescription,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = contentScale
                    )
                } else {
                    fallback()
                }
            }

            RemoteImagePhase.LOADING -> placeholder()
            RemoteImagePhase.UNAVAILABLE -> fallback()
        }
    }
}
