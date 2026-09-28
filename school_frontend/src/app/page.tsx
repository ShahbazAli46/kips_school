"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── STAGES DEFINITION FOR FIREFLY CHOREOGRAPHY ─────────────────
type FormationStage =
  | { type: "form"; text: string; duration: number }
  | { type: "scatter"; duration: number };

const STAGES: FormationStage[] = [
  { type: "form", text: "KIPS", duration: 6800 },
  { type: "scatter", duration: 3800 },
  { type: "form", text: "K", duration: 6600 },
  { type: "scatter", duration: 3800 },
  { type: "form", text: "I", duration: 6600 },
  { type: "scatter", duration: 3800 },
  { type: "form", text: "P", duration: 6600 },
  { type: "scatter", duration: 3800 },
  { type: "form", text: "S", duration: 6600 },
  { type: "scatter", duration: 3800 },
];

interface TargetPoint {
  x: number;
  y: number;
}

// ─── STAGE CENTER COORDINATE HELPER ─────────────────────────────
function getStageCenter(width: number, height: number): { cx: number; cy: number; isDesktop: boolean } {
  const isDesktop = width >= 1024;
  if (isDesktop) {
    const containerWidth = Math.min(width - 48, 1152); // max-w-6xl
    const containerLeft = (width - containerWidth) / 2;
    const cardWidth = Math.min(448, containerWidth * 0.45);
    const leftColWidth = containerWidth - cardWidth - 48;
    return {
      cx: containerLeft + leftColWidth / 2,
      cy: height * 0.5,
      isDesktop: true,
    };
  } else {
    return {
      cx: width * 0.5,
      cy: Math.max(90, Math.min(135, height * 0.16)),
      isDesktop: false,
    };
  }
}

// ─── OFF-SCREEN TEXT TARGET GENERATOR ────────────────────────────
function sampleTextTargets(
  text: string,
  width: number,
  height: number,
  particleCount: number
): TargetPoint[] {
  if (typeof window === "undefined" || width <= 0 || height <= 0) return [];

  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;

  const ctx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  ctx.clearRect(0, 0, width, height);

  const { cx, cy, isDesktop } = getStageCenter(width, height);
  const isWord = text.length > 1;

  let fontSize: number;
  if (isDesktop) {
    const containerWidth = Math.min(width - 48, 1152);
    const cardWidth = Math.min(448, containerWidth * 0.45);
    const leftColWidth = containerWidth - cardWidth - 48;

    fontSize = isWord
      ? Math.min(leftColWidth * 0.32, height * 0.28, 190)
      : Math.min(leftColWidth * 0.52, height * 0.50, 320);
  } else {
    fontSize = isWord
      ? Math.min(width * 0.22, 100)
      : Math.min(width * 0.36, 160);
  }

  // Draw with bold font and thick outline so letters have full, solid pixel fill
  ctx.font = `900 ${fontSize}px "Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(8, fontSize * 0.06);

  ctx.strokeText(text, cx, cy);
  ctx.fillText(text, cx, cy);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const rawPoints: TargetPoint[] = [];

  const step = Math.max(2, Math.floor(Math.sqrt((width * height) / 60000)));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 100) {
        rawPoints.push({ x, y });
      }
    }
  }

  if (rawPoints.length === 0) {
    // Fallback: circular ring
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      rawPoints.push({
        x: cx + Math.cos(angle) * 140,
        y: cy + Math.sin(angle) * 140,
      });
    }
  }

  // Match particle count
  const targets: TargetPoint[] = [];
  if (rawPoints.length >= particleCount) {
    const stride = rawPoints.length / particleCount;
    for (let i = 0; i < particleCount; i++) {
      targets.push(rawPoints[Math.floor(i * stride)]);
    }
  } else {
    for (let i = 0; i < particleCount; i++) {
      const pt = rawPoints[i % rawPoints.length];
      targets.push({
        x: pt.x + (Math.random() - 0.5) * 5,
        y: pt.y + (Math.random() - 0.5) * 5,
      });
    }
  }

  // Shuffle targets so fireflies crisscross and arrive naturally
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }

  return targets;
}

// ─── CHOREOGRAPHED FIREFLIES CANVAS ENGINE ───────────────────────
function FirefliesCanvas({ zIndex = 0 }: { zIndex?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking for reactive avoidance
    let mouseX = -1000;
    let mouseY = -1000;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    interface Firefly {
      x: number;
      y: number;
      vx: number;
      vy: number;
      targetX: number;
      targetY: number;
      cruiseSpeed: number;
      disperseAngle: number;
      baseSize: number;
      glowRadius: number;
      color: "gold" | "lime" | "cyan" | "amber";
      flashPeriod: number;
      flashOffset: number;
      flashDuration: number;
    }

    const isForeground = zIndex > 0;
    // Ample particles so letters are completely full, dense, and solid
    const count = isForeground
      ? Math.min(Math.floor((width * height) / 45000), 22)
      : Math.min(Math.max(280, Math.floor((width * height) / 3600)), 420);

    const fireflies: Firefly[] = [];
    const colorVariants: Array<"gold" | "lime" | "cyan" | "amber"> = [
      "gold", "gold", "lime", "cyan", "gold", "amber", "lime"
    ];

    for (let i = 0; i < count; i++) {
      const color = colorVariants[Math.floor(Math.random() * colorVariants.length)];
      const initAngle = Math.random() * Math.PI * 2;
      const initSpeed = Math.random() * 2.0 + 3.5;

      fireflies.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(initAngle) * initSpeed,
        vy: Math.sin(initAngle) * initSpeed,
        targetX: width / 2,
        targetY: height / 2,
        cruiseSpeed: Math.random() * 2.0 + 3.8, // 3.8 to 5.8 px/frame for true full-screen travel
        disperseAngle: initAngle,
        baseSize: isForeground ? Math.random() * 0.4 + 0.9 : Math.random() * 0.35 + 0.7,
        glowRadius: isForeground ? Math.random() * 5 + 9 : Math.random() * 4 + 7.5,
        color,
        flashPeriod: Math.random() * 3.0 + 2.0,
        flashOffset: Math.random() * 10,
        flashDuration: Math.random() * 1.5 + 1.0,
      });
    }

    // Choreography State Management
    let currentStageIndex = 0;
    let stageStartTime = performance.now();

    const applyStageTargets = (stage: FormationStage) => {
      if (isForeground) return;

      const { cx, cy } = getStageCenter(width, height);

      if (stage.type === "form") {
        const targets = sampleTextTargets(stage.text, width, height, count);
        for (let i = 0; i < count; i++) {
          if (targets[i]) {
            fireflies[i].targetX = targets[i].x;
            fireflies[i].targetY = targets[i].y;
          }
        }
      } else if (stage.type === "scatter") {
        // True Full-Screen Dispersal: Send fireflies radiating outward across the canvas
        fireflies.forEach((f) => {
          // Calculate outward angle away from previous letter center
          const radialAngle = Math.atan2(f.y - cy, f.x - cx) + (Math.random() - 0.5) * 1.1;
          const burstSpeed = Math.random() * 3.0 + 5.5; // Initial burst velocity (5.5 - 8.5 px/frame)
          
          f.vx = Math.cos(radialAngle) * burstSpeed;
          f.vy = Math.sin(radialAngle) * burstSpeed;
          f.disperseAngle = radialAngle;
          f.cruiseSpeed = Math.random() * 2.0 + 3.8;
        });
      }
    };

    // Initialize first stage
    applyStageTargets(STAGES[0]);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      applyStageTargets(STAGES[currentStageIndex]);
    };
    window.addEventListener("resize", handleResize);

    const render = (currentTime: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      // Advance choreography stage
      const currentStage = STAGES[currentStageIndex];
      const elapsedInStage = currentTime - stageStartTime;

      if (!isForeground && elapsedInStage > currentStage.duration) {
        currentStageIndex = (currentStageIndex + 1) % STAGES.length;
        stageStartTime = currentTime;
        applyStageTargets(STAGES[currentStageIndex]);
      }

      const activeStage = STAGES[currentStageIndex];
      const isForming = !isForeground && activeStage.type === "form";

      fireflies.forEach((f) => {
        if (isForming) {
          // ─── SWIFT, SMOOTH FLOCKING ARRIVAL & ROCK-SOLID HOLD ────
          const dx = f.targetX - f.x;
          const dy = f.targetY - f.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 2.5) {
            // Speed proportional to distance (glides into shape cleanly within ~1.2s)
            const cruise = Math.min(13.0, Math.max(3.0, dist * 0.085));
            const targetAngle = Math.atan2(dy, dx);
            const steer = 0.16;

            f.vx = f.vx * (1 - steer) + Math.cos(targetAngle) * cruise * steer;
            f.vy = f.vy * (1 - steer) + Math.sin(targetAngle) * cruise * steer;

            f.x += f.vx;
            f.y += f.vy;
          } else {
            // ─── SOLID FORMED HOLD (Visible for 5+ full seconds) ───
            // Living micro-hover vibration keeps the letter humming with magical life
            const hoverX = Math.sin(currentTime * 0.003 + f.flashOffset * 3) * 1.2;
            const hoverY = Math.cos(currentTime * 0.0024 + f.flashOffset * 3) * 1.2;
            f.x = f.targetX + hoverX;
            f.y = f.targetY + hoverY;
            f.vx = 0;
            f.vy = 0;
          }
        } else {
          // ─── FULL-SCREEN DISPERSAL IN WIDE SWEEPING CURVES ─────
          // Gentle course adjustment prevents tight circles and ensures wide screen coverage
          f.disperseAngle += (Math.random() - 0.5) * 0.035;

          const currentSpeed = Math.hypot(f.vx, f.vy);
          const targetSpeed = f.cruiseSpeed;
          const newSpeed = currentSpeed * 0.965 + targetSpeed * 0.035;

          const currentAngle = Math.atan2(f.vy, f.vx);
          const steerAngle = currentAngle * 0.93 + f.disperseAngle * 0.07;

          f.vx = Math.cos(steerAngle) * newSpeed;
          f.vy = Math.sin(steerAngle) * newSpeed;

          f.x += f.vx;
          f.y += f.vy;
        }

        // Gentle mouse interaction (flees slightly from cursor)
        const mdx = f.x - mouseX;
        const mdy = f.y - mouseY;
        const mDist = Math.hypot(mdx, mdy);
        if (mDist < 90 && mDist > 0) {
          const repulse = ((90 - mDist) / 90) * 0.8;
          f.x += (mdx / mDist) * repulse * 2.5;
          f.y += (mdy / mDist) * repulse * 2.5;
        }

        // Viewport wrap-around so they roam across the full canvas
        if (f.x < -40) f.x = width + 40;
        if (f.x > width + 40) f.x = -40;
        if (f.y < -40) f.y = height + 40;
        if (f.y > height + 40) f.y = -40;

        // ─── BIOLUMINESCENT BRIGHTNESS ───────────────────────────
        let brightness: number;

        if (isForming) {
          // When forming the letter/word: ALL particles are fully lit and radiant
          // with a soft organic breathing shimmer so the letter is 100% visible and solid
          const shimmer = Math.sin(currentTime * 0.0035 + f.flashOffset * 2.5) * 0.15;
          brightness = 0.95 + shimmer;
        } else {
          // In scatter / ambient mode: rhythmic firefly blinking
          const timeInPeriod = (currentTime / 1000 + f.flashOffset) % f.flashPeriod;
          brightness = 0.22;
          if (timeInPeriod < f.flashDuration) {
            const progress = timeInPeriod / f.flashDuration;
            const flashCurve = Math.sin(progress * Math.PI);
            brightness += Math.pow(flashCurve, 1.4) * 0.9;
          }
        }

        if (brightness <= 0.02) return;

        let coreColor = "255, 255, 235";
        let auraColor = "250, 204, 21";

        if (f.color === "lime") {
          coreColor = "240, 255, 220";
          auraColor = "163, 230, 53";
        } else if (f.color === "cyan") {
          coreColor = "225, 250, 255";
          auraColor = "56, 189, 248";
        } else if (f.color === "amber") {
          coreColor = "255, 250, 215";
          auraColor = "251, 191, 36";
        }

        const currentGlowRadius = f.glowRadius * (0.7 + brightness * 0.5);

        // 1. Soft atmospheric light haze (crisp, subtle)
        const outerGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, currentGlowRadius);
        outerGrad.addColorStop(0, `rgba(${auraColor}, ${brightness * 0.5})`);
        outerGrad.addColorStop(0.35, `rgba(${auraColor}, ${brightness * 0.2})`);
        outerGrad.addColorStop(0.7, `rgba(${auraColor}, ${brightness * 0.05})`);
        outerGrad.addColorStop(1, `rgba(${auraColor}, 0)`);

        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, currentGlowRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Radiant bright corona
        const innerGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.baseSize * 3.2);
        innerGrad.addColorStop(0, `rgba(${coreColor}, ${brightness * 1.1})`);
        innerGrad.addColorStop(0.45, `rgba(${auraColor}, ${brightness * 0.8})`);
        innerGrad.addColorStop(1, `rgba(${auraColor}, 0)`);

        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.baseSize * 3.2, 0, Math.PI * 2);
        ctx.fill();

        // 3. Hot incandescent insect light point
        ctx.fillStyle = `rgba(${coreColor}, ${Math.min(1, brightness * 1.5)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.baseSize * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [zIndex]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${zIndex === 0 ? "z-0" : "z-30"}`}
    />
  );
}

// ─── MAIN LOGIN PAGE WITH CENTERED CRYSTAL GLASS ────────────────
export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [migrateEmail, setMigrateEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"login" | "otp" | "migrate-email">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [alreadyMigrated, setAlreadyMigrated] = useState(false);

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const showPassword = identifier.trim().length > 0 && !isEmail;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAlreadyMigrated(false);
    setLoading(true);

    try {
      const payload: any = { identifier };
      if (showPassword) {
        payload.password = password;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (data.requires_migration) {
          setStep("migrate-email");
          return;
        }
        if (data.already_migrated) {
          setError(data.message);
          setAlreadyMigrated(true);
          return;
        }
        throw new Error(data.message || "Login failed");
      }

      setOtp("");
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/migrate-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ phone: identifier, password, email: migrateEmail }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to setup email");

      setIdentifier(migrateEmail);
      setSuccess("Account linked successfully! Please verify the OTP sent to your new email.");
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email: identifier, otp }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Invalid OTP");

      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", String(data.user.role_id));
      localStorage.setItem("userPermissions", JSON.stringify(data.user.all_permissions || []));
      document.cookie = `token=${data.token}; path=/; max-age=86400;`;
      document.cookie = `userRole=${data.user.role_id}; path=/; max-age=86400;`;
      document.cookie = `userPermissions=${encodeURIComponent(
        JSON.stringify(data.user.all_permissions || [])
      )}; path=/; max-age=86400;`;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden select-none"
      style={{
        backgroundColor: "#060a12",
        backgroundImage:
          "radial-gradient(ellipse 90% 90% at 50% -20%, rgba(30, 58, 138, 0.4), rgba(6, 10, 18, 1)), radial-gradient(circle at 50% 60%, rgba(14, 165, 233, 0.08), transparent 60%)",
      }}
    >
      {/* ─── LAYER 0: BACKGROUND FIREFLIES (Forming KIPS, K, I, P, S & Hive Swarms) ─── */}
      <FirefliesCanvas zIndex={0} />

      {/* ─── LAYER 30: FOREGROUND AMBIENT FIREFLIES (3D depth over the login card) ─── */}
      <FirefliesCanvas zIndex={30} />

      {/* ─── AMBIENT ATMOSPHERIC BACKGROUND BLOOMS ─── */}
      <div
        className="absolute top-1/4 left-1/4 w-[36rem] h-[36rem] rounded-full blur-[130px] pointer-events-none opacity-60"
        style={{
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.16), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[38rem] h-[38rem] rounded-full blur-[140px] pointer-events-none opacity-50"
        style={{
          background: "radial-gradient(circle, rgba(37, 99, 235, 0.18), transparent 70%)",
        }}
      />

      {/* ─── MAIN RESPONSIVE LAYOUT WRAPPER ─── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between min-h-screen py-8 px-4 sm:px-6 lg:px-8 gap-8 lg:gap-12">
        
        {/* Left Column Area Placeholder (symmetric with lamp space) */}
        <div className="hidden lg:flex flex-1 pointer-events-none" />

        {/* ─── RIGHT COLUMN: ULTRA-TRANSLUCENT CRYSTAL GLASS LOGIN CARD ─── */}
        <div
          className="w-full max-w-md lg:max-w-md p-6 sm:p-9 md:p-10 rounded-[2.5rem] shadow-2xl transition-all duration-700 relative z-20 backdrop-blur-2xl mt-28 sm:mt-32 lg:mt-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.07) 0%, rgba(15, 23, 42, 0.28) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.28)",
            boxShadow:
              "0 30px 60px -12px rgba(0, 0, 0, 0.65), 0 0 40px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
          }}
        >
          {/* Header Brand Section with KIPS Logo */}
          <div className="text-center mb-8 flex flex-col items-center">
            
            {/* KIPS Logo Badge on the Form */}
            <div
              className="w-20 h-20 mb-3 bg-white/95 rounded-2xl shadow-xl p-2 border flex items-center justify-center transform hover:scale-105 transition-all duration-300"
              style={{
                borderColor: "rgba(56, 189, 248, 0.45)",
                boxShadow:
                  "0 10px 25px -5px rgba(56, 189, 248, 0.35), 0 0 18px rgba(254, 240, 138, 0.2)",
              }}
            >
              <img
                src="/logo.png"
                alt="KIPS School Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1 drop-shadow-md">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm font-medium text-sky-200/80">
              KIPS School Portal
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-xs sm:text-sm font-semibold border bg-red-950/40 border-red-500/40 text-red-300 flex items-center gap-2 animate-in fade-in duration-200 backdrop-blur-md">
              <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 rounded-xl text-xs sm:text-sm font-semibold border bg-emerald-950/40 border-emerald-500/40 text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200 backdrop-blur-md">
              <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* Step 1: Identifier & Optional Password */}
          {step === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sky-200/90 uppercase tracking-wider mb-2">
                  Email or Phone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-sky-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value.trim())}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm transition-all duration-200 outline-none text-white placeholder-slate-400/60 bg-white/[0.04] border border-white/15 focus:border-sky-400 focus:bg-white/[0.08] focus:ring-2 focus:ring-sky-400/30 backdrop-blur-md"
                    placeholder="you@example.com or 03001234567"
                  />
                </div>
              </div>

              {showPassword && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-bold text-sky-200/90 uppercase tracking-wider mb-2">
                    Password (ID)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-sky-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      required={showPassword}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm transition-all duration-200 outline-none text-white placeholder-slate-400/60 bg-white/[0.04] border border-white/15 focus:border-sky-400 focus:bg-white/[0.08] focus:ring-2 focus:ring-sky-400/30 backdrop-blur-md"
                      placeholder="Enter your account password/ID"
                    />
                  </div>
                </div>
              )}

              {/* Radiant Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-3 rounded-xl text-white font-bold text-sm tracking-wide shadow-lg transition-all duration-300 hover:shadow-sky-500/40 hover:shadow-2xl active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2 border border-sky-400/40 cursor-pointer"
                style={{
                  background:
                    "linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #1d4ed8 100%)",
                }}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>
                    <span>{isEmail ? "Send OTP Code" : "Sign In to Portal"}</span>
                    <svg className="h-4 w-4 text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>

              {alreadyMigrated && (
                <div className="mt-4 text-center animate-in fade-in duration-300">
                  <button
                    type="button"
                    onClick={() => {
                      setAlreadyMigrated(false);
                      setStep("migrate-email");
                      setError("");
                    }}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline transition"
                  >
                    Forgot email? Re-verify your account.
                  </button>
                </div>
              )}
            </form>

          ) : step === "migrate-email" ? (
            /* Step 2: Migrate Email */
            <form onSubmit={handleMigrateSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-white">Account Security Setup</h2>
                <p className="text-xs text-sky-200/70 mt-1">
                  Please link an email address to your account to continue securely.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-200/90 uppercase tracking-wider mb-2">
                  New Email Address
                </label>
                <input
                  type="email"
                  required
                  value={migrateEmail}
                  onChange={(e) => setMigrateEmail(e.target.value.trim())}
                  className="w-full px-4 py-3.5 rounded-xl text-sm transition-all duration-200 outline-none text-white placeholder-slate-400/60 bg-white/[0.04] border border-white/15 focus:border-sky-400 focus:bg-white/[0.08] focus:ring-2 focus:ring-sky-400/30 backdrop-blur-md"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all duration-300 flex justify-center items-center gap-2 border border-sky-400/40 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                }}
              >
                {loading ? "Processing..." : "Link Email & Send OTP"}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition hover:underline"
                >
                  ← Back to Login
                </button>
              </div>
            </form>

          ) : step === "otp" ? (
            /* Step 3: Verify OTP */
            <form onSubmit={handleVerifyOtp} className="space-y-5 text-center">
              <div className="mb-2">
                <p className="text-xs sm:text-sm font-medium text-slate-300">
                  We&apos;ve sent a 6-digit verification code to
                </p>
                <p className="text-sm font-bold text-sky-400 mt-1">{identifier}</p>
              </div>

              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center tracking-[0.4em] sm:tracking-[0.6em] text-2xl sm:text-3xl py-4 rounded-xl border transition-all duration-200 outline-none font-bold text-sky-300 bg-white/[0.05] border-sky-500/40 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/30 shadow-inner backdrop-blur-md"
                placeholder="000000"
                autoFocus
              />

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-4 rounded-xl text-white font-bold text-sm tracking-wide shadow-lg transition-all duration-300 hover:shadow-sky-500/40 hover:shadow-2xl active:scale-[0.98] disabled:opacity-50 flex justify-center items-center border border-sky-400/40 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                }}
              >
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setOtp("");
                    setError("");
                    setSuccess("");
                  }}
                  className="text-xs font-semibold text-sky-400/80 hover:text-sky-300 hover:underline transition"
                >
                  ← Start Over with Different Account
                </button>
              </div>
            </form>
          ) : null}

          {/* Footer Note */}
          <div className="mt-8 pt-4 border-t border-white/10 text-center text-[11px] text-slate-400/70 flex items-center justify-center gap-1.5">
            <span>Powered by KIPS Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
