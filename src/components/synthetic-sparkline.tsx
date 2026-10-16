"use client";

import { useEffect, useRef, useState } from "react";

interface SyntheticSparklineProps {
  /** Current price from Deriv feed */
  price: number | null;
  /** True if feed is connected (live or simulated) */
  connected: boolean;
  /** Source label: "Deriv WS" | "Deriv SIM" | "Binance REST" | "TV" */
  source: string;
  /** Symbol display label, e.g. "Volatility 75 Index" */
  symbolLabel: string;
  /** Decimals for price display */
  decimals: number;
  height?: number;
}

/**
 * Fallback sparkline chart for synthetic indices.
 *
 * TradingView's free widget doesn't include Deriv synthetic indices
 * (they're gated behind a paid TradingView subscription). This component
 * renders a self-updating sparkline from the live Deriv price feed so users
 * still get a visual chart for synthetics.
 */
export function SyntheticSparkline({
  price,
  connected,
  source,
  symbolLabel,
  decimals,
  height = 280,
}: SyntheticSparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const lastPriceRef = useRef<number | null>(null);
  const [tickCount, setTickCount] = useState(0);

  // Push new price into history buffer
  useEffect(() => {
    if (price == null || price <= 0) return;
    if (lastPriceRef.current === price) return; // dedupe
    lastPriceRef.current = price;
    historyRef.current.push(price);
    if (historyRef.current.length > 80) historyRef.current.shift();
    setTickCount(historyRef.current.length);
  }, [price]);

  // Redraw on every history update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Background
    ctx.fillStyle = "#06090F";
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (h / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const x = (w / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const hist = historyRef.current;
    if (hist.length < 2) {
      // Show "waiting for data" message
      ctx.fillStyle = "#475569";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        connected ? "Collecting ticks…" : "Waiting for Deriv feed…",
        w / 2,
        h / 2
      );
      return;
    }

    const min = Math.min(...hist);
    const max = Math.max(...hist);
    const range = max - min || 1;
    const padding = 20;

    // Determine line color based on overall direction
    const isUp = hist[hist.length - 1] >= hist[0];
    const lineColor = isUp ? "#10e0a1" : "#ff3b5c";
    const fillColor = isUp ? "rgba(16,224,161,0.12)" : "rgba(255,59,92,0.12)";

    // Area fill
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    hist.forEach((p, i) => {
      const x = padding + (i / (hist.length - 1)) * (w - padding * 2);
      const y = padding + (1 - (p - min) / range) * (h - padding * 2);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(w - padding, h - padding);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Line
    ctx.beginPath();
    hist.forEach((p, i) => {
      const x = padding + (i / (hist.length - 1)) * (w - padding * 2);
      const y = padding + (1 - (p - min) / range) * (h - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Current price dot
    const lastX = padding + (w - padding * 2);
    const lastY = padding + (1 - (hist[hist.length - 1] - min) / range) * (h - padding * 2);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
    // Pulse ring
    ctx.beginPath();
    ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = lineColor + "40";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current price label
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "right";
    const currentPrice = hist[hist.length - 1];
    ctx.fillText(
      currentPrice.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
      lastX - 10,
      lastY - 12
    );

    // Symbol label (top-left)
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(symbolLabel.toUpperCase(), padding, padding - 6);

    // Source label (top-right)
    ctx.fillStyle = source === "Deriv SIM" ? "#fbbf24" : "#10b981";
    ctx.textAlign = "right";
    ctx.fillText(
      (connected ? "● " : "○ ") + source,
      w - padding,
      padding - 6
    );
  }, [price, connected, source, symbolLabel, decimals]);

  return (
    <div
      className="relative w-full rounded-md overflow-hidden border border-white/5"
      style={{ height }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 text-[9px] font-mono uppercase tracking-wider text-slate-600 pointer-events-none">
        Live Deriv Feed · {tickCount} ticks
      </div>
    </div>
  );
}
