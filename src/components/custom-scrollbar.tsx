"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Custom scrollbar — a real div element overlay that mimics a scrollbar
 * with full CSS animation support. Works in ALL browsers including headless.
 *
 * Features:
 * - Amber/gold gradient thumb
 * - Breathing pulse animation (idle)
 * - Light streak on hover
 * - Spark surge on drag
 * - Depth gauge track fill
 */
export function CustomScrollbar() {
  const [scrollPercent, setScrollPercent] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(40);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [visible, setVisible] = useState(false);
  const dragStartRef = useRef({ y: 0, scrollTop: 0 });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const updateScroll = () => {
      const s = window.scrollY || document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const pct = h > 0 ? (s / h) * 100 : 0;
      setScrollPercent(pct);

      // Calculate thumb height proportional to content
      const viewportRatio = window.innerHeight / document.documentElement.scrollHeight;
      const minH = 40;
      const maxH = window.innerHeight * 0.8;
      setThumbHeight(Math.max(minH, Math.min(maxH, window.innerHeight * viewportRatio)));

      // Show scrollbar briefly on scroll
      setVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (!isHovering && !isDragging) setVisible(false);
      }, 2000);
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isHovering, isDragging]);

  // Drag handling
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      const dy = e.clientY - dragStartRef.current.y;
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollableHeight = window.innerHeight - thumbHeight;
      const scrollDelta = (dy / scrollableHeight) * h;
      window.scrollTo(0, dragStartRef.current.scrollTop + scrollDelta);
    };

    const onUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, thumbHeight]);

  // Use viewport height state instead of window.innerHeight directly (SSR-safe)
  const [viewportH, setViewportH] = useState(0);
  useEffect(() => {
    const updateH = () => setViewportH(window.innerHeight);
    updateH();
    window.addEventListener("resize", updateH, { passive: true });
    return () => window.removeEventListener("resize", updateH);
  }, []);

  const thumbTop = viewportH > 0 ? (scrollPercent / 100) * (viewportH - thumbHeight) : 0;

  return (
    <div
      className={`fixed right-0 top-0 z-50 transition-opacity duration-300 ${
        visible || isHovering || isDragging ? "opacity-100" : "opacity-0"
      }`}
      style={{ width: "10px", height: "100vh" }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Track with depth gauge fill */}
      <div
        className="absolute inset-0"
        style={{
          background: "#080c14",
          backgroundImage: `linear-gradient(to bottom, rgba(255,184,0,0.12) 0%, rgba(255,184,0,0.12) ${scrollPercent}%, transparent ${scrollPercent}%, transparent 100%)`,
          borderLeft: "1px solid rgba(255,184,0,0.06)",
        }}
      />

      {/* Thumb */}
      <div
        className="absolute cursor-grab active:cursor-grabbing"
        style={{
          top: `${thumbTop}px`,
          width: "10px",
          height: `${thumbHeight}px`,
          borderRadius: "6px",
          border: "2px solid #080c14",
          background: isDragging
            ? "linear-gradient(180deg, #fffce8, #ffe9a8, #ffd56b)"
            : isHovering
            ? "linear-gradient(180deg, #ffe9a8, #ffd56b, #ffb000)"
            : "linear-gradient(180deg, #ffb000, #ff7a00)",
          boxShadow: isDragging
            ? "0 0 32px rgba(255,184,0,1), 0 0 64px rgba(255,184,0,0.5)"
            : isHovering
            ? "0 0 20px rgba(255,184,0,0.8), 0 0 40px rgba(255,184,0,0.3)"
            : "0 0 6px rgba(255,184,0,0.4)",
          transition: "background 0.3s, box-shadow 0.3s",
          animation: isDragging
            ? "rm-spark-surge 0.3s linear infinite"
            : isHovering
            ? "rm-light-streak 1.5s linear infinite, rm-ember-pulse 3s ease-in-out infinite"
            : "rm-ember-pulse 3s ease-in-out infinite",
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
          dragStartRef.current = { y: e.clientY, scrollTop: window.scrollY };
        }}
      >
        {/* Light streak dot (only on hover/drag) */}
        {(isHovering || isDragging) && (
          <div
            className="absolute left-0 right-0 rounded-full"
            style={{
              height: "4px",
              background: "rgba(255,252,232,0.9)",
              boxShadow: "0 0 8px rgba(255,252,232,1)",
              animation: isDragging
                ? "rm-streak-move 0.3s linear infinite"
                : "rm-streak-move 1.5s linear infinite",
            }}
          />
        )}
      </div>
    </div>
  );
}
