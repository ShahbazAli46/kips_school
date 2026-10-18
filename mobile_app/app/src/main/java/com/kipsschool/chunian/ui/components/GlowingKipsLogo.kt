package com.kipsschool.chunian.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kipsschool.chunian.R
import com.kipsschool.chunian.ui.theme.AuraGold
import com.kipsschool.chunian.ui.theme.Brand900
import com.kipsschool.chunian.ui.theme.SkyGlow
import com.kipsschool.chunian.ui.theme.TextSubheading
import com.kipsschool.chunian.ui.theme.TextWhite

@Composable
fun GlowingKipsLogo(
    modifier: Modifier = Modifier,
    compact: Boolean = false
) {
    val infiniteTransition = rememberInfiniteTransition(label = "logo_anim")

    val scale by infiniteTransition.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.03f,
        animationSpec = infiniteRepeatable(
            animation = tween(2800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logo_scale"
    )

    val haloAlpha by infiniteTransition.animateFloat(
        initialValue = 0.20f,
        targetValue = 0.50f,
        animationSpec = infiniteRepeatable(
            animation = tween(2400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "halo_alpha"
    )

    if (compact) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = modifier.padding(vertical = 4.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(46.dp)
                    .shadow(
                        elevation = 10.dp,
                        shape = RoundedCornerShape(12.dp),
                        ambientColor = SkyGlow.copy(alpha = 0.35f),
                        spotColor = SkyGlow.copy(alpha = 0.35f)
                    )
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.95f))
                    .border(
                        width = 1.dp,
                        color = Color(0x7338BDF8),
                        shape = RoundedCornerShape(12.dp)
                    )
                    .padding(5.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.kips_logo),
                    contentDescription = "KIPS School Emblem",
                    modifier = Modifier.fillMaxSize()
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "TEACHER PORTAL",
                    color = AuraGold,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.2.sp
                )
                Text(
                    text = "KIPS School System",
                    color = TextWhite,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        return
    }

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Logo Container with Animated Glow Halo
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(105.dp)
                .scale(scale)
        ) {
            // Ambient Radial Glow (matching web 0 10px 25px rgba(56,189,248,0.35))
            Box(
                modifier = Modifier
                    .size(95.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                SkyGlow.copy(alpha = haloAlpha),
                                AuraGold.copy(alpha = haloAlpha * 0.35f),
                                Color.Transparent
                            )
                        ),
                        shape = CircleShape
                    )
            )

            // Web White/95 Rounded Badge (bg-white/95 rounded-2xl border border-sky-400/45)
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(80.dp)
                    .shadow(
                        elevation = 18.dp,
                        shape = RoundedCornerShape(20.dp),
                        ambientColor = SkyGlow.copy(alpha = 0.4f),
                        spotColor = SkyGlow.copy(alpha = 0.4f)
                    )
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.White.copy(alpha = 0.95f))
                    .border(
                        width = 1.5.dp,
                        color = Color(0x7338BDF8), // rgba(56, 189, 248, 0.45)
                        shape = RoundedCornerShape(20.dp)
                    )
                    .padding(8.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.kips_logo),
                    contentDescription = "KIPS School Emblem",
                    modifier = Modifier.fillMaxSize()
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Faculty Badge Pill
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(100.dp))
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            Brand900.copy(alpha = 0.45f),
                            SkyGlow.copy(alpha = 0.15f)
                        )
                    )
                )
                .border(
                    width = 1.dp,
                    brush = Brush.horizontalGradient(
                        listOf(
                            SkyGlow.copy(alpha = 0.65f),
                            AuraGold.copy(alpha = 0.50f)
                        )
                    ),
                    shape = RoundedCornerShape(100.dp)
                )
                .padding(horizontal = 14.dp, vertical = 4.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(AuraGold)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "TEACHER PORTAL",
                    color = AuraGold,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.5.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Exact web heading text
        Text(
            text = "Welcome Back",
            color = TextWhite,
            fontSize = 26.sp,
            fontWeight = FontWeight.ExtraBold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(3.dp))

        // Exact web subtitle text & color (text-sky-200/80)
        Text(
            text = "KIPS School Portal",
            color = TextSubheading,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center
        )
    }
}
