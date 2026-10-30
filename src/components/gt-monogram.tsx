"use client";

import { useEffect, useState, useRef } from "react";

const INTRO_KEY = "lotwise.intro-played.v2";

export function GTMonogram() {
  const [showIntro, setShowIntro] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
    try {
      const played = localStorage.getItem(INTRO_KEY);
      if (!played) localStorage.setItem(INTRO_KEY, "1");
      if (!played) setShowIntro(true);
      else setShowBadge(true);
    } catch {
      setShowBadge(true);
    }
  }, []);

  // Intro sequence
  useEffect(() => {
    if (!showIntro) return;

    const collapseTimer = setTimeout(() => {
      setIntroDone(true);
      setShowBadge(true);
    }, 4500);

    const hideTimer = setTimeout(() => setShowIntro(false), 5000);

    return () => {
      clearTimeout(collapseTimer);
      clearTimeout(hideTimer);
    };
  }, [showIntro]);

  // 10-minute celebration
  useEffect(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, 10 * 60 * 1000 - elapsed);
    const celebrationTimer = setTimeout(() => {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 6000);
    }, remaining);
    return () => clearTimeout(celebrationTimer);
  }, []);

  function replayIntro() {
    setShowModal(false);
    setShowBadge(false);
    setShowIntro(true);
    setIntroDone(false);
    try { localStorage.removeItem(INTRO_KEY); } catch {}
  }

  return (
    <>
      {/* ===== INTRO: Bouncing Letters + Confetti ===== */}
      {showIntro && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden pointer-events-none"
          style={{
            background: "rgba(5, 6, 8, 1)",
            animation: "gt-fade-out 0.5s ease 4.5s forwards",
          }}
        >
          {/* Bouncing G letter */}
          <div
            className="absolute"
            style={{
              left: "calc(50% - 70px)",
              top: "calc(50% - 35px)",
              animation: "gt-bounce-g 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s forwards",
            }}
          >
            <GTCalligraphic size={120} letter="g" />
          </div>

          {/* Bouncing T letter */}
          <div
            className="absolute"
            style={{
              left: "calc(50% + 10px)",
              top: "calc(50% - 35px)",
              animation: "gt-bounce-t 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.8s forwards",
            }}
          >
            <GTCalligraphic size={120} letter="t" />
          </div>

          {/* Confetti particles (50) */}
          {[...Array(50)].map((_, i) => {
            const angle = (i / 50) * Math.PI * 2;
            const dist = 150 + Math.random() * 200;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            const delay = 2.0 + Math.random() * 0.3;
            const colors = ["#FFB000", "#FFD56B", "#FF7A00", "#FFFCE8", "#FFE9A8"];
            const color = colors[i % colors.length];
            const size = 3 + Math.random() * 5;
            const rotation = Math.random() * 720;
            return (
              <div
                key={i}
                className="absolute rounded-sm"
                style={{
                  left: "calc(50% - 4px)",
                  top: "calc(50% - 4px)",
                  width: `${size}px`,
                  height: `${size * 0.6}px`,
                  background: color,
                  boxShadow: `0 0 4px ${color}`,
                  animation: `gt-confetti-${i % 10} 1.5s ease-out ${delay}s forwards`,
                  // Each confetti piece uses a CSS variable for direction
                  ["--dx" as string]: `${dx}px`,
                  ["--dy" as string]: `${dy}px`,
                  ["--rot" as string]: `${rotation}deg`,
                }}
              />
            );
          })}

          {/* Shockwave ring */}
          <div
            className="absolute rounded-full border-2 border-amber-400"
            style={{
              width: "80px", height: "80px",
              animation: "gt-shockwave 1s ease-out 2s forwards",
              opacity: 0,
            }}
          />

          {/* Tagline */}
          <div
            className="absolute font-mono text-amber-400 text-xs uppercase tracking-[0.5em] whitespace-nowrap"
            style={{
              top: "calc(50% + 70px)",
              opacity: 0,
              animation: "gt-tagline 0.8s ease 3s forwards",
            }}
          >
            <span style={{ animation: "gt-blink 0.6s step-end infinite 3.5s" }}>▎</span>
            BUILT BY GT
            <span style={{ animation: "gt-blink 0.6s step-end infinite 3.5s" }}>▎</span>
          </div>
        </div>
      )}

      {/* ===== PERMANENT BADGE ===== */}
      {showBadge && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-4 right-4 z-[60] group pointer-events-auto"
          style={{
            opacity: showIntro ? 0 : 1,
            transition: "opacity 0.5s ease 4.5s",
          }}
          aria-label="Built by GT"
        >
          <div className="relative flex items-center justify-center overflow-hidden rounded-lg px-3 py-1.5 border border-amber-500/20 bg-black/60 backdrop-blur-sm transition-all group-hover:border-amber-500/50 group-hover:scale-110">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,184,0,0.3) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "gt-sweep 5s ease-in-out infinite",
              }}
            />
            <GTCalligraphic size={36} />
            <span className="ml-1.5 text-[9px] font-mono uppercase tracking-wider text-amber-400/0 group-hover:text-amber-400/80 transition-colors">GT</span>
          </div>
        </button>
      )}

      {/* ===== CLICK MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="relative bg-[#0a0f1a] border border-amber-500/20 rounded-2xl p-8 shadow-2xl" style={{ animation: "gt-modal-in 0.3s ease-out" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowModal(false)} className="absolute top-3 right-3 text-slate-500 hover:text-white text-lg">✕</button>
            <div className="flex flex-col items-center gap-4">
              <GTCalligraphic size={80} />
              <div className="text-center">
                <p className="text-amber-400 font-bold text-lg font-mono">Crafted by GT</p>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-wider mt-1">Lotwise Position Terminal · 2026</p>
              </div>
              <button onClick={replayIntro} className="mt-2 px-4 py-2 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs uppercase tracking-wider hover:bg-amber-500/30 transition-colors">▶ Replay Intro</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 10-MINUTE CELEBRATION ===== */}
      {showCelebration && (
        <div className="fixed inset-0 z-[250] pointer-events-none overflow-hidden">
          {/* Falling confetti */}
          {[...Array(30)].map((_, i) => {
            const colors = ["#FFB000", "#FFD56B", "#FF7A00", "#FFFCE8"];
            const color = colors[i % colors.length];
            const left = Math.random() * 100;
            const delay = Math.random() * 1.5;
            const size = 4 + Math.random() * 6;
            return (
              <div
                key={i}
                className="absolute top-0 rounded-sm"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size * 0.6}px`,
                  background: color,
                  boxShadow: `0 0 4px ${color}`,
                  animation: `gt-fall 3s ease-in ${delay}s forwards`,
                  opacity: 0,
                }}
              />
            );
          })}

          {/* Lower-third banner */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ animation: "gt-lower-third-in 0.5s ease-out forwards, gt-lower-third-out 0.5s ease-in 5s forwards" }}
          >
            <div className="bg-gradient-to-r from-black/90 via-[#0a0f1a]/95 to-black/90 border-t border-amber-500/30 px-8 py-4 flex items-center justify-center gap-4">
              <GTCalligraphic size={32} />
              <div className="text-center">
                <p className="text-amber-400 font-bold text-sm font-mono tracking-wider">BUILT BY GT</p>
                <p className="text-slate-500 text-[10px] font-mono uppercase tracking-wider">Lotwise Position Terminal</p>
              </div>
              <GTCalligraphic size={32} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===========================================================================
   Calligraphic GT Monogram — brush-style SVG paths
   Hand-drawn aesthetic with thick-to-thin strokes and gold gradient
   =========================================================================== */
function GTCalligraphic({ size = 40, letter }: { size?: number; letter?: "both" | "g" | "t" }) {
  const h = (size / 120) * 80;
  return (
    <svg width={size} height={h} viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`gt-call-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFCE8" />
          <stop offset="25%" stopColor="#FFE9A8" />
          <stop offset="50%" stopColor="#FFD56B" />
          <stop offset="75%" stopColor="#FFB000" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <filter id={`gt-call-glow-${size}`}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Letter G — calligraphic brush stroke */}
      {(letter === "both" || letter === "g") && (
        <path
          d="M 42 12 C 20 12, 8 28, 8 42 C 8 58, 22 70, 40 70 C 56 70, 64 58, 64 46 L 64 38 L 48 38 M 42 12 C 48 12, 52 14, 56 18"
          stroke={`url(#gt-call-${size})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter={`url(#gt-call-glow-${size})`}
        />
      )}

      {/* Letter T — calligraphic brush stroke */}
      {(letter === "both" || letter === "t") && (
        <path
          d="M 72 16 C 72 14, 74 12, 78 12 L 108 12 C 112 12, 114 14, 114 16 M 93 12 C 93 12, 95 14, 95 18 L 95 64 C 95 68, 93 70, 90 70 C 88 70, 86 68, 86 66"
          stroke={`url(#gt-call-${size})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter={`url(#gt-call-glow-${size})`}
        />
      )}
    </svg>
  );
}

/* ===========================================================================
   Animated Number Counter — counts up/down to target value
   =========================================================================== */
export function AnimatedNumber({
  value,
  duration = 400,
  className = "",
  format = (n: number) => n.toFixed(2),
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevValueRef.current;
    if (prev === value) return;

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = prev + (value - prev) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        prevValueRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      prevValueRef.current = value;
    };
  }, [value, duration]);

  return <span className={className}>{format(displayValue)}</span>;
}
