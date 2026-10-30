"use client";

import { useEffect, useState, useRef } from "react";

const INTRO_KEY = "lotwise.intro-played.v1";

export function GTMonogram() {
  const [showIntro, setShowIntro] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const played = localStorage.getItem(INTRO_KEY);
      if (!played) localStorage.setItem(INTRO_KEY, "1");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!played) setShowIntro(true);
      else setShowBadge(true);
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBadge(true);
    }
  }, []);

  useEffect(() => {
    if (!showIntro) return;

    const clickTimer = setTimeout(() => {
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctx();
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {}
    }, 2400);

    const collapseTimer = setTimeout(() => {
      setIntroDone(true);
      setShowBadge(true);
    }, 3000);

    const hideTimer = setTimeout(() => {
      setShowIntro(false);
    }, 3400);

    return () => {
      clearTimeout(clickTimer);
      clearTimeout(collapseTimer);
      clearTimeout(hideTimer);
    };
  }, [showIntro]);

  function replayIntro() {
    setShowModal(false);
    setShowBadge(false);
    setShowIntro(true);
    setIntroDone(false);
    try { localStorage.removeItem(INTRO_KEY); } catch {}
  }

  return (
    <>
      {/* ===== INTRO OVERLAY ===== */}
      {showIntro && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none"
          style={{
            background: "rgba(5, 6, 8, 1)",
            animation: "gt-fade-out 0.4s ease 3s forwards",
          }}
        >
          {/* Scanline flash */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, rgba(255,184,0,0.03), rgba(255,184,0,0.03) 1px, transparent 1px, transparent 3px)",
              animation: "gt-scanline-flash 1.2s ease-out",
            }}
          />

          {/* Shockwave ring */}
          <div
            className="absolute rounded-full border-2 border-amber-400"
            style={{
              width: "100px",
              height: "100px",
              animation: "gt-shockwave 1s ease-out 1.2s forwards",
              opacity: 0,
            }}
          />

          {/* Particles */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-amber-400"
              style={{
                width: "3px",
                height: "3px",
                animation: `gt-particle-${i} 1s ease-out 1.2s forwards`,
                opacity: 0,
              }}
            />
          ))}

          {/* GT Monogram SVG */}
          <div
            className="relative flex items-center justify-center"
            style={{
              transform: introDone ? "scale(0.15) translate(280px, 220px)" : "scale(1)",
              transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) 2.4s, opacity 0.4s ease 3s",
              opacity: introDone ? 0 : 1,
            }}
          >
            <svg width="200" height="120" viewBox="0 0 200 120" fill="none">
              <defs>
                <linearGradient id="gt-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFFCE8" />
                  <stop offset="30%" stopColor="#FFD56B" />
                  <stop offset="60%" stopColor="#FFB000" />
                  <stop offset="100%" stopColor="#FF7A00" />
                </linearGradient>
                <filter id="gt-glow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Letter G */}
              <path
                d="M 55 30 A 30 30 0 1 0 55 90 L 55 60 L 80 60"
                stroke="url(#gt-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#gt-glow)"
                style={{
                  strokeDasharray: 200,
                  strokeDashoffset: 200,
                  animation: "gt-draw-g 0.8s ease-in-out 0.2s forwards",
                }}
              />

              {/* Letter T */}
              <path
                d="M 110 30 L 170 30 M 140 30 L 140 90"
                stroke="url(#gt-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#gt-glow)"
                style={{
                  strokeDasharray: 180,
                  strokeDashoffset: 180,
                  animation: "gt-draw-t 0.8s ease-in-out 0.6s forwards",
                }}
              />
            </svg>

            {/* Glow burst behind letters */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(255,184,0,0.4) 0%, transparent 70%)",
                animation: "gt-glow-burst 0.6s ease-out 1.2s forwards",
                opacity: 0,
                transform: "scale(0.5)",
              }}
            />
          </div>

          {/* Tagline */}
          <div
            className="absolute font-mono text-amber-400/70 text-xs uppercase tracking-[0.4em]"
            style={{
              top: "calc(50% + 80px)",
              animation: "gt-tagline 0.8s ease 1.8s forwards",
              opacity: 0,
            }}
          >
            <span style={{ animation: "gt-blink 0.6s step-end infinite 2.4s" }}>▎</span>
            BUILT BY GT
            <span style={{ animation: "gt-blink 0.6s step-end infinite 2.4s" }}>▎</span>
          </div>
        </div>
      )}

      {/* ===== PERMANENT BADGE ===== */}
      {showBadge && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-4 right-4 z-[60] group pointer-events-auto"
          style={{
            opacity: 1,
            transition: "opacity 0.5s ease",
          }}
          aria-label="Built by GT"
        >
          <div className="relative flex items-center justify-center overflow-hidden rounded-lg px-3 py-1.5 border border-amber-500/20 bg-black/60 backdrop-blur-sm transition-all group-hover:border-amber-500/50 group-hover:scale-110">
            {/* Light sweep */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,184,0,0.3) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "gt-sweep 5s ease-in-out infinite",
              }}
            />

            <svg width="44" height="28" viewBox="0 0 200 120" fill="none" className="relative z-10">
              <defs>
                <linearGradient id="gt-badge-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFD56B" />
                  <stop offset="60%" stopColor="#FFB000" />
                  <stop offset="100%" stopColor="#FF7A00" />
                </linearGradient>
              </defs>
              <path
                d="M 55 30 A 30 30 0 1 0 55 90 L 55 60 L 80 60"
                stroke="url(#gt-badge-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{ filter: "drop-shadow(0 0 2px rgba(255,184,0,0.6))" }}
              />
              <path
                d="M 110 30 L 170 30 M 140 30 L 140 90"
                stroke="url(#gt-badge-grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{ filter: "drop-shadow(0 0 2px rgba(255,184,0,0.6))" }}
              />
            </svg>
            <span className="ml-1.5 text-[9px] font-mono uppercase tracking-wider text-amber-400/0 group-hover:text-amber-400/80 transition-colors">GT</span>
          </div>
        </button>
      )}

      {/* ===== CLICK MODAL ===== */}
      {showModal && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative bg-[#0a0f1a] border border-amber-500/20 rounded-2xl p-8 shadow-2xl"
            style={{ animation: "gt-modal-in 0.3s ease-out" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-slate-500 hover:text-white text-lg"
            >
              ✕
            </button>

            <div className="flex flex-col items-center gap-4">
              <svg width="120" height="72" viewBox="0 0 200 120" fill="none">
                <defs>
                  <linearGradient id="gt-modal-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFFCE8" />
                    <stop offset="30%" stopColor="#FFD56B" />
                    <stop offset="60%" stopColor="#FFB000" />
                    <stop offset="100%" stopColor="#FF7A00" />
                  </linearGradient>
                </defs>
                <path
                  d="M 55 30 A 30 30 0 1 0 55 90 L 55 60 L 80 60"
                  stroke="url(#gt-modal-grad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  style={{ filter: "drop-shadow(0 0 6px rgba(255,184,0,0.5))" }}
                />
                <path
                  d="M 110 30 L 170 30 M 140 30 L 140 90"
                  stroke="url(#gt-modal-grad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  style={{ filter: "drop-shadow(0 0 6px rgba(255,184,0,0.5))" }}
                />
              </svg>

              <div className="text-center">
                <p className="text-amber-400 font-bold text-lg font-mono">Crafted by GT</p>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-wider mt-1">
                  Lotwise Position Terminal · 2026
                </p>
              </div>

              <button
                onClick={replayIntro}
                className="mt-2 px-4 py-2 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs uppercase tracking-wider hover:bg-amber-500/30 transition-colors"
              >
                ▶ Replay Intro
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
