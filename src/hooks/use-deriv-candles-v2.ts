"use client";

import { useEffect, useRef, useState } from "react";

// ===========================================================================
// Deriv candles hook — fetches historical candles + streams new ones
//
// Uses Deriv's ticks_history endpoint with style=candles.
// Falls back to simulated candles if WS is unreachable (sandbox networks).
// ===========================================================================

const DERIV_WS_ENDPOINTS = [
  "wss://ws.derivws.com/websockets/v3?app_id=1089",
  "wss://ws.binaryws.com/websockets/v3?app_id=1089",
];

export interface Candle {
  time: number;   // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

interface UseDerivCandlesResult {
  candles: Candle[];
  isLoading: boolean;
  error: string | null;
  connected: boolean;
  source: "deriv-ws" | "simulator" | "none";
}

// Fallback baseline prices for synthetic symbols (used by simulator only)
const FALLBACK_BASE: Record<string, number> = {
  BOOM300N: 8500, BOOM500: 9000, BOOM600: 9200, BOOM900: 9400, BOOM1000: 9500,
  CRASH300N: 8500, CRASH500: 9000, CRASH600: 9200, CRASH900: 9400, CRASH1000: 9500,
  R_10: 6510, R_25: 1520, R_50: 198, R_75: 385460.5, R_100: 1348.5,
  "1HZ10V": 7320, "1HZ15V": 4500, "1HZ25V": 1845, "1HZ30V": 3200, "1HZ50V": 234, "1HZ75V": 412350, "1HZ90V": 8900, "1HZ100V": 1567,
  JD10: 7800, JD25: 1760, JD50: 245, JD75: 412000, JD100: 1420,
  stpidx0p1: 1000, stpidx0p2: 1000, stpidx0p3: 1000, stpidx0p4: 1000,
  stpidx0p5: 1000, stpidx0p6: 1000, stpidx0p7: 1000, stpidx0p8: 1000, stpidx0p9: 1000,
  stpidx200: 1000, stpidx300: 1000, stpidx400: 1000, stpidx500: 1000,
  RDBULL: 9800, RDBEAR: 9800, ZVOLATILITY75: 385000,
  smartidx5R: 5000, smartidx10R: 5000, smartidx20R: 5000, smartidx40R: 5000,
};

/**
 * Subscribe to Deriv candle stream for a symbol.
 * Returns the last N historical candles + live updates.
 *
 * @param derivSymbol Deriv API symbol (e.g. "R_75", "BOOM500")
 * @param granularity Candle granularity in seconds (default 60 = 1min)
 * @param count Number of historical candles to fetch (default 100)
 */
export function useDerivCandles(
  derivSymbol: string | undefined,
  granularity: number = 60,
  count: number = 100
): UseDerivCandlesResult {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!!derivSymbol);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [source, setSource] = useState<"deriv-ws" | "simulator" | "none">("none");

  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const candlesRef = useRef<Candle[]>([]);

  useEffect(() => {
    if (!derivSymbol) return;

    // Reset transient state before subscribing. These setStates are needed
    // when the symbol changes (e.g. switching from V75 to Boom 500).
    setIsLoading(true);
    setError(null);
    setConnected(false);
    setSource("none");
    candlesRef.current = [];
    setCandles([]);

    let cancelled = false;
    let settled = false;

    const startSimulator = () => {
      if (cancelled || settled) return;
      settled = true;
      setSource("simulator");
      setConnected(true);
      setIsLoading(false);
      setError(null);

      // Seed with N historical candles
      const base = FALLBACK_BASE[derivSymbol] ?? 1000;
      const now = Math.floor(Date.now() / 1000);
      const initialCandles: Candle[] = [];
      let lastClose = base;
      for (let i = count; i > 0; i--) {
        const open = lastClose;
        const volatility = base * 0.001;
        const high = open + Math.random() * volatility;
        const low = open - Math.random() * volatility;
        const close = (high + low) / 2 + (Math.random() - 0.5) * volatility;
        initialCandles.push({
          time: now - i * granularity,
          open,
          high: Math.max(open, high, close),
          low: Math.min(open, low, close),
          close,
        });
        lastClose = close;
      }
      candlesRef.current = initialCandles;
      setCandles(initialCandles);

      // Stream updates — every 2s, update the last candle's close,
      // and roll to a new candle every `granularity` seconds
      let currentCandleStart = now;
      simTimerRef.current = setInterval(() => {
        if (cancelled) return;
        const nowSec = Math.floor(Date.now() / 1000);
        const candleAge = nowSec - currentCandleStart;
        const last = candlesRef.current[candlesRef.current.length - 1];
        if (!last) return;

        // Random-walk the close
        const drift = (base - last.close) * 0.02;
        const shock = last.close * (Math.random() - 0.5) * 0.003;
        const newClose = last.close + drift + shock;

        if (candleAge >= granularity) {
          // Roll to a new candle
          currentCandleStart = nowSec;
          const newCandle: Candle = {
            time: nowSec,
            open: newClose,
            high: newClose,
            low: newClose,
            close: newClose,
          };
          const next = [...candlesRef.current, newCandle];
          if (next.length > count) next.shift();
          candlesRef.current = next;
          setCandles(next);
        } else {
          // Update the last candle
          const updated = {
            ...last,
            close: newClose,
            high: Math.max(last.high, newClose),
            low: Math.min(last.low, newClose),
          };
          const next = [...candlesRef.current.slice(0, -1), updated];
          candlesRef.current = next;
          setCandles(next);
        }
      }, 2000);
    };

    let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
    let wsIndex = 0;

    const tryConnect = () => {
      if (cancelled || settled) return;
      if (wsIndex >= DERIV_WS_ENDPOINTS.length) {
        startSimulator();
        return;
      }
      const url = DERIV_WS_ENDPOINTS[wsIndex];
      wsIndex += 1;
      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch { tryConnect(); return; }
      wsRef.current = ws;

      connectionTimeout = setTimeout(() => {
        if (!cancelled && !settled && ws.readyState !== WebSocket.OPEN) {
          try { ws.close(); } catch {}
          tryConnect();
        }
      }, 10000); // 10s timeout — some networks are slow on first WS handshake

      ws.onopen = () => {
        if (cancelled || settled) return;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setSource("deriv-ws");
        setConnected(true);
        ws.send(JSON.stringify({
          ticks_history: derivSymbol,
          end: "latest",
          style: "candles",
          granularity,
          count,
          subscribe: 1,
        }));
      };

      ws.onmessage = (event) => {
        if (cancelled || settled && source !== "deriv-ws") return;
        try {
          const data = JSON.parse(event.data);
          if (data.msg_type === "candles" && data.candles) {
            const mapped: Candle[] = data.candles.map((c: { epoch: number; open: number; high: number; low: number; close: number }) => ({
              time: c.epoch,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            }));
            candlesRef.current = mapped;
            setCandles(mapped);
            setIsLoading(false);
            settled = true;
            if (data.subscription?.id) {
              subscriptionIdRef.current = data.subscription.id;
            }
          } else if (data.msg_type === "ohlc" && data.ohlc) {
            // Live update — patch the latest candle
            const o = data.ohlc;
            const newCandle: Candle = {
              time: o.open_time,
              open: parseFloat(o.open),
              high: parseFloat(o.high),
              low: parseFloat(o.low),
              close: parseFloat(o.close),
            };
            const next = [...candlesRef.current];
            const lastIdx = next.length - 1;
            if (lastIdx >= 0 && next[lastIdx].time === newCandle.time) {
              next[lastIdx] = newCandle;
            } else {
              next.push(newCandle);
              if (next.length > count) next.shift();
            }
            candlesRef.current = next;
            setCandles(next);
          } else if (data.error) {
            setError(data.error.message || "Deriv API error");
            setIsLoading(false);
            startSimulator();
          }
        } catch { /* ignore */ }
      };

      ws.onerror = () => {
        if (cancelled || settled) return;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        try { ws.close(); } catch {}
        tryConnect();
      };

      ws.onclose = () => {
        if (cancelled || settled) return;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (candlesRef.current.length === 0) tryConnect();
        else startSimulator();
      };
    };

    tryConnect();

    return () => {
      cancelled = true;
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (simTimerRef.current) {
        clearInterval(simTimerRef.current);
        simTimerRef.current = null;
      }
      try {
        if (subscriptionIdRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ forget: subscriptionIdRef.current }));
        }
      } catch {}
      try { wsRef.current?.close(); } catch {}
    };
  }, [derivSymbol, granularity, count]);

  return { candles, isLoading, error, connected, source };
}
