package com.kipsschool.chunian.ui.theme

import androidx.compose.ui.graphics.Color

// ============================================================
// Exact Web Brand Color System (from globals.css :root)
// ============================================================
val Brand950 = Color(0xFF172554)
val Brand900 = Color(0xFF1E3A8A)
val Brand800 = Color(0xFF1E40AF)
val Brand700 = Color(0xFF1D4ED8)
val Brand600 = Color(0xFF2563EB)
val Brand500 = Color(0xFF3B82F6)
val Brand400 = Color(0xFF60A5FA)
val Brand300 = Color(0xFF93C5FD)
val Brand200 = Color(0xFFBFDBFE)
val Brand100 = Color(0xFFDBEAFE)
val Brand50  = Color(0xFFEFF6FF)

// Semantic Web Aliases
val ColorPrimary = Brand800
val ColorPrimaryDark = Brand900
val ColorPrimaryLight = Brand600
val ColorAccent = Brand700
val ColorSurface = Color(0xFFFFFFFF)
val ColorSurfaceAlt = Brand50
val ColorBorder = Brand200

// ============================================================
// Exact Web Login Page Aesthetic (from src/app/page.tsx)
// ============================================================
val WebBackground = Color(0xFF060A12)              // backgroundColor: "#060a12"
val WebBgEllipse = Color(0x661E3A8A)               // rgba(30, 58, 138, 0.40)
val WebBgCyanCircle = Color(0x140EA5E9)            // rgba(14, 165, 233, 0.08)
val WebBloomSky = Color(0x2938BDF8)                // rgba(56, 189, 248, 0.16)
val WebBloomBlue = Color(0x2E2563EB)               // rgba(37, 99, 235, 0.18)

// Crystal Glass Login Card (from page.tsx line 608-612)
val WebGlassTop = Color(0x12FFFFFF)                // rgba(255, 255, 255, 0.07)
val WebGlassBottom = Color(0x470F172A)             // rgba(15, 23, 42, 0.28)
val WebGlassBorder = Color(0x4738BDF8)             // rgba(56, 189, 248, 0.28)
val WebGlassSpecular = Color(0x33FFFFFF)           // inset 0 1px 0 rgba(255, 255, 255, 0.2)
val WebGlassGlow = Color(0x2638BDF8)               // 0 0 40px rgba(56, 189, 248, 0.15)

// Radiant Action Button Gradient (from page.tsx line 714)
// linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #1d4ed8 100%)
val ButtonGradientStart = Color(0xFF0284C7)        // #0284c7 (Sky 600)
val ButtonGradientMid = Color(0xFF2563EB)          // #2563eb (Blue 600)
val ButtonGradientEnd = Color(0xFF1D4ED8)          // #1d4ed8 (Blue 700)
val ButtonBorderSky = Color(0x6638BDF8)            // border-sky-400/40

// Form Inputs (from page.tsx line 678)
val InputBg = Color(0x0AFFFFFF)                    // bg-white/[0.04]
val InputBgFocus = Color(0x14FFFFFF)               // focus:bg-white/[0.08]
val InputBorderIdle = Color(0x26FFFFFF)            // border-white/15
val InputBorderFocus = Color(0xFF38BDF8)           // focus:border-sky-400
val InputRingFocus = Color(0x4D38BDF8)             // focus:ring-sky-400/30
val InputPlaceholder = Color(0x9994A3B8)           // placeholder-slate-400/60

// Typography Colors
val TextHeading = Color(0xFFFFFFFF)
val TextSubheading = Color(0xCCBAE6FD)             // text-sky-200/80
val TextLabel = Color(0xE6BAE6FD)                  // text-sky-200/90
val TextMuted = Color(0xB394A3B8)                  // text-slate-400/70

// Feedback Banners (from page.tsx line 643 & 652)
val BannerErrorBg = Color(0x66450A0A)              // bg-red-950/40
val BannerErrorBorder = Color(0x66EF4444)          // border-red-500/40
val BannerErrorText = Color(0xFFFCA5A5)            // text-red-300

val BannerSuccessBg = Color(0x66022C22)            // bg-emerald-950/40
val BannerSuccessBorder = Color(0x6610B981)        // border-emerald-500/40
val BannerSuccessText = Color(0xFF6EE7B7)          // text-emerald-300

// Bioluminescent Fireflies Exact Color Tones (from page.tsx lines 368-380)
val FireflyGoldCore = Color(0xFFFFFFEB)
val FireflyGoldAura = Color(0xFFFACD15)

val FireflyLimeCore = Color(0xFFF0FFDC)
val FireflyLimeAura = Color(0xFFA3E635)

val FireflyCyanCore = Color(0xFFE1FAFF)
val FireflyCyanAura = Color(0xFF38BDF8)

val FireflyAmberCore = Color(0xFFFFFAEB)
val FireflyAmberAura = Color(0xFFFBBF24)

// Backwards-compatible aliases
val MidnightNavy = WebBackground
val SkyGlow = Color(0xFF38BDF8)
val SkyPrimary = ButtonGradientStart
val CobaltBlue = ButtonGradientMid
val RoyalNavy = Brand900
val AuraGold = FireflyGoldAura
val AuraLime = FireflyLimeAura
val EmeraldSuccess = Color(0xFF10B981)
val CoralError = Color(0xFFEF4444)
val TextWhite = TextHeading
val TextSkyMuted = TextSubheading
val TextSlate = TextMuted
val GlassBorder = WebGlassBorder