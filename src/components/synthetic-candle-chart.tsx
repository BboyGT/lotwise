"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
} from "lightweight-charts";
import { useDerivCandles, type Candle } from "@/hooks/use-deriv-candles-v2";

interface SyntheticCandleChartProps {
  /** Deriv API symbol (e.g. "R_75", "BOOM500") */
  derivSymbol: string | undefined;
  /** Symbol display label for header */
  symbolLabel: string;
  /** Candle granularity in seconds (default 60 = 1min) */
  granularity?: number;
  /** Number of historical candles */
  count?: number;
  /** Decimals for price display */
  decimals: number;
  height?: number;
}

/**
 * Candlestick chart for Deriv synthetic indices.
 *
 * Uses TradingView's free Lightweight Charts library + Deriv's
 * ticks_history (style=candles) endpoint to render proper OHLC
 * candlesticks with live updates.
 *
 * Falls back to simulated candles if Deriv WS is unreachable
 * (e.g. sandbox networks that block wss://).
 */
export function SyntheticCandleChart({
  derivSymbol,
  symbolLabel,
  granularity = 60,
  count = 100,
  decimals,
  height = 320,
}: SyntheticCandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [activeGranularity, setActiveGranularity] = useState(granularity);

  const { candles, isLoading, error, connected, source } = useDerivCandles(
    derivSymbol,
    activeGranularity,
    count
  );

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#06090F" },
        textColor: "#94a3b8",
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,184,0,0.4)", labelBackgroundColor: "#FFB000" },
        horzLine: { color: "rgba(255,184,0,0.4)", labelBackgroundColor: "#FFB000" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height,
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10e0a1",
      downColor: "#ff3b5c",
      borderUpColor: "#10e0a1",
      borderDownColor: "#ff3b5c",
      wickUpColor: "#10e0a1",
      wickDownColor: "#ff3b5c",
      priceFormat: {
        type: "price",
        precision: decimals,
        minMove: Math.pow(10, -decimals),
      },
    });
    candleSeriesRef.current = candleSeries;

    // Volume histogram (fake volume from candle range — Deriv doesn't provide volume for synthetics)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "rgba(255,184,0,0.3)",
      priceFormat: { type: "volume" },
      priceScaleId: "", // overlay on the bottom
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
    const resize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [decimals, height]);

  // Update candle data when candles change
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (candles.length === 0) return;

    const candleData: CandlestickData[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    // Derive fake volume from candle range (high - low) since Deriv doesn't
    // expose real volume for synthetic indices
    const volumeData: HistogramData[] = candles.map((c) => ({
      time: c.time as Time,
      value: Math.abs(c.high - c.low) || 0.0001,
      color: c.close >= c.open ? "rgba(16,224,161,0.4)" : "rgba(255,59,92,0.4)",
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    // Fit content to show all candles
    chartRef.current?.timeScale().fitContent();

    // Track last price (setTimeout to avoid synchronous setState in effect)
    const last = candles[candles.length - 1];
    if (last) {
      const p = last.close;
      setTimeout(() => setLastPrice(p), 0);
    }
  }, [candles]);

  // Granularity options
  const granularities = [
    { label: "1m", value: 60 },
    { label: "5m", value: 300 },
    { label: "15m", value: 900 },
    { label: "1h", value: 3600 },
    { label: "4h", value: 14400 },
    { label: "1D", value: 86400 },
  ];

  return (
    <div className="relative w-full border border-white/5 rounded-md overflow-hidden bg-[#06090F]">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <span
            className={`rm-pulse-dot ${
              source === "deriv-ws"
                ? "bg-emerald-400"
                : source === "simulator"
                ? "bg-amber-400"
                : "bg-slate-500"
            }`}
            style={{ width: 6, height: 6 }}
          />
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300">
            {symbolLabel}
          </span>
          {lastPrice != null && (
            <span className="text-sm font-mono font-bold text-amber-300 tabular-nums">
              {lastPrice.toLocaleString("en-US", {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
            {source === "deriv-ws"
              ? "Live · Deriv WS"
              : source === "simulator"
              ? "Simulated"
              : isLoading
              ? "Connecting…"
              : "Offline"}
          </span>
        </div>
      </div>

      {/* Granularity selector */}
      <div className="absolute top-10 right-2 z-10 flex items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded p-0.5 pointer-events-auto">
        {granularities.map((g) => (
          <button
            key={g.value}
            onClick={() => setActiveGranularity(g.value)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider transition-colors ${
              activeGranularity === g.value
                ? "bg-amber-500/30 text-amber-300"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Chart container */}
      <div ref={containerRef} style={{ height, width: "100%" }} />

      {/* Loading state */}
      {isLoading && candles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <span className="rm-pulse-dot bg-amber-400" style={{ width: 6, height: 6 }} />
            Loading candles…
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute bottom-2 left-2 right-2 z-10 text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
