package com.kipsschool.chunian.data.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.ByteArrayOutputStream

/** Helpers for turning picked content URIs into upload-ready byte arrays. */
object ImageUtils {

    /**
     * Reads a content URI, downscales it so the longest edge is at most [maxDimension]
     * and re-encodes as JPEG. Keeps avatar uploads small and memory-friendly.
     */
    fun readScaledJpeg(
        context: Context,
        uri: Uri,
        maxDimension: Int = 1280,
        quality: Int = 85
    ): ByteArray? {
        return try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, bounds)
            }
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

            val options = BitmapFactory.Options().apply {
                inSampleSize = calculateInSampleSize(bounds.outWidth, bounds.outHeight, maxDimension)
            }
            val bitmap = context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, options)
            } ?: return null

            ByteArrayOutputStream().use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
                bitmap.recycle()
                out.toByteArray()
            }
        } catch (_: Exception) {
            null
        }
    }

    /** Reads the raw bytes of a content URI without re-encoding (used for PNG signatures). */
    fun readBytes(context: Context, uri: Uri): ByteArray? = try {
        context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
    } catch (_: Exception) {
        null
    }

    fun mimeTypeOf(context: Context, uri: Uri): String =
        context.contentResolver.getType(uri) ?: "image/*"

    private fun calculateInSampleSize(width: Int, height: Int, maxDimension: Int): Int {
        var sample = 1
        var w = width
        var h = height
        while (w / 2 >= maxDimension || h / 2 >= maxDimension) {
            w /= 2
            h /= 2
            sample *= 2
        }
        return sample
    }
}
