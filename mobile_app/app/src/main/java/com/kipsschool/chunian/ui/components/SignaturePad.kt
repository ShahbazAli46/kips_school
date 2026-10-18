package com.kipsschool.chunian.ui.components

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.util.Base64
import androidx.compose.foundation.Canvas as ComposeCanvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import java.io.ByteArrayOutputStream

/**
 * Holds the strokes captured by [SignaturePad].
 *
 * Each stroke is an ordered list of points in the pad's local pixel space. The outer list is
 * replaced (never mutated in place) so Compose observes every change and redraws.
 */
class SignatureState {

    var strokes by mutableStateOf<List<List<Offset>>>(emptyList())
        private set

    /** Set on every draw pass; used when exporting to a bitmap at native resolution. */
    internal var canvasWidth: Float = 0f
        private set
    internal var canvasHeight: Float = 0f
        private set

    val isEmpty: Boolean
        get() = strokes.isEmpty()

    val hasContent: Boolean
        get() = strokes.any { it.size >= 2 }

    internal fun recordCanvasSize(width: Float, height: Float) {
        canvasWidth = width
        canvasHeight = height
    }

    internal fun startStroke(point: Offset) {
        strokes = strokes + listOf(listOf(point))
    }

    internal fun appendPoint(point: Offset) {
        if (strokes.isEmpty()) return
        val last = strokes.last()
        strokes = strokes.dropLast(1) + listOf(last + point)
    }

    fun clear() {
        strokes = emptyList()
    }

    /**
     * Renders the captured strokes to a white-background PNG and returns it as a
     * `data:image/png;base64,...` string ready for the signature API.
     */
    fun toPngBase64DataUri(): String? {
        if (!hasContent) return null

        val width = canvasWidth.toInt().coerceAtLeast(1)
        val height = canvasHeight.toInt().coerceAtLeast(1)

        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(android.graphics.Color.WHITE)

        val paint = Paint().apply {
            isAntiAlias = true
            color = android.graphics.Color.BLACK
            style = Paint.Style.STROKE
            strokeWidth = 5f
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
        }

        strokes.forEach { stroke ->
            if (stroke.size < 2) return@forEach
            val path = Path().apply {
                moveTo(stroke.first().x, stroke.first().y)
                for (i in 1 until stroke.size) {
                    lineTo(stroke[i].x, stroke[i].y)
                }
            }
            canvas.drawPath(path, paint)
        }

        val bytes = ByteArrayOutputStream().use { out ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            out.toByteArray()
        }
        bitmap.recycle()

        return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
}

@Composable
fun rememberSignatureState(): SignatureState = remember { SignatureState() }

/**
 * A finger-drawing surface. Coordinates are captured via [detectDragGestures] and the strokes
 * are rendered onto a Compose [ComposeCanvas].
 */
@Composable
fun SignaturePad(
    state: SignatureState,
    modifier: Modifier = Modifier,
    strokeColor: Color = Color(0xFF0F172A)
) {
    ComposeCanvas(
        modifier = modifier.pointerInput(Unit) {
            detectDragGestures(
                onDragStart = { offset -> state.startStroke(offset) },
                onDrag = { change, _ ->
                    change.consume()
                    state.appendPoint(change.position)
                }
            )
        }
    ) {
        state.recordCanvasSize(size.width, size.height)

        val paintWidth = 3.dp.toPx()
        state.strokes.forEach { stroke ->
            when {
                stroke.size == 1 -> {
                    drawCircle(
                        color = strokeColor,
                        radius = paintWidth / 2f,
                        center = stroke.first()
                    )
                }

                else -> {
                    for (i in 0 until stroke.size - 1) {
                        drawLine(
                            color = strokeColor,
                            start = stroke[i],
                            end = stroke[i + 1],
                            strokeWidth = paintWidth,
                            cap = StrokeCap.Round
                        )
                    }
                }
            }
        }
    }
}
