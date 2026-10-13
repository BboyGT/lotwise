"use client";

import { useEffect, useRef, useState } from "react";

// Deriv public WebSocket API. App ID 1089 is Deriv's published test app ID
// and is safe for read-only tick subscriptions. For production use, you would
// register your own app_id at https://api.deriv.com.
const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=1089";

interface UseDerivTicksResult {
  price: number | null;
  prevPrice: number | null;
  direction: "up" | "down" | null;
  isLoading: boolean;
  error: string | null;
  connected: boolean;
  usingFallback: boolean;
}

// Fallback baseline prices for synthetic symbols when the WS is unreachable
// (e.g. sandbox networks that block wss to derivws.com).
// These are approximate recent prices and the simulator adds small random walks
// around them so the UI still demonstrates live behaviour.
const FALLBACK_BASE: Record<string, number> = {
  // Boom / Crash
  BOOM300N: 8500,
  BOOM500: 9000,
  BOOM1000: 9500,
  CRASH300N: 8500,
  CRASH500: 9000,
  CRASH1000: 9500,
  // Volatility
  R_10: 6510,
  R_25: 1520,
  R_50: 198,
  R_75: 385460.5,
  R_100: 1348.5,
  // 1s Volatility
  "1HZ10V": 7320,
  "1HZ25V": 1845,
  "1HZ50V": 234,
  "1HZ75V": 412350,
  "1HZ100V": 1567,
  // Jump
  JD10: 7800,
  JD25: 1760,
  JD50: 245,
  JD75: 412000,
  JD100: 1420,
  // Step (these stay near base — step indices are bounded)
  stpidx0p1: 1000,
  stpidx0p2: 1000,
  stpidx0p3: 1000,
  stpidx0p4: 1000,
  stpidx0p5: 1000,
  stpidx0p6: 1000,
  stpidx0p7: 1000,
  stpidx0p8: 1000,
  stpidx0p9: 1000,
  // Bull / Bear / Z / Smart
  RDBULL: 9800,
  RDBEAR: 9800,
  ZVOLATILITY75: 385000,
  smartidx5R: 5000,
  smartidx10R: 5000,
  smartidx20R: 5000,
  smartidx40R: 5000,
};

/**
 * Subscribe to live Deriv tick stream for a given Deriv symbol.
 * Pass `undefined` to disable (no subscription).
 *
 * Re-subscribes automatically when the symbol changes.
 * Falls back to a simulated tick stream if the WS endpoint is unreachable
 * (e.g. cloud sandbox networks that block wss to derivws.com).
 */
export function useDerivTicks(
  derivSymbol: string | undefined
): UseDerivTicksResult {
  const [price, setPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!derivSymbol);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep latest price in a ref so the WS message handler doesn't need to be
  // re-created when the price changes.
  const latestPriceRef = useRef<number | null>(null);

  useEffect(() => {
    // No symbol = no subscription, no state churn.
    if (!derivSymbol) return;

    // When the symbol changes, reset transient state before subscribing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    setConnected(false);
    setUsingFallback(false);
    latestPriceRef.current = null;

    let cancelled = false;
    let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
    let attemptFallback = false;

    const startFallback = (reason: string) => {
      if (cancelled) return;
      attemptFallback = true;
      setUsingFallback(true);
      setConnected(true);
      setIsLoading(false);
      setError(null);

      const base = FALLBACK_BASE[derivSymbol] ?? 1000;
      // Seed at base price, then random-walk ±0.05% per tick every 1.5s
      latestPriceRef.current = base;
      setPrice(base);

      fallbackTimerRef.current = setInterval(() => {
        if (cancelled) return;
        const prev = latestPriceRef.current ?? base;
        // ±0.1% random walk, biased slightly toward mean reversion to base
        const drift = (base - prev) * 0.05;
        const shock = prev * (Math.random() - 0.5) * 0.002;
        const next = prev + drift + shock;
        setPrevPrice(prev);
        setPrice(next);
        setDirection(next > prev ? "up" : "down");
        latestPriceRef.current = next;
      }, 1500);

      // Silent — the UI shows a "SIM" badge instead of an error.
      void reason;
    };

    try {
      const ws = new WebSocket(DERIV_WS_URL);
      wsRef.current = ws;

      connectionTimeout = setTimeout(() => {
        if (!cancelled && ws.readyState !== WebSocket.OPEN) {
          try { ws.close(); } catch {}
          startFallback("Connection timeout");
        }
      }, 4000);

      ws.onopen = () => {
        if (cancelled || attemptFallback) return;
        clearTimeout(connectionTimeout!);
        setConnected(true);
        ws.send(JSON.stringify({ ticks: derivSymbol, subscribe: 1 }));
      };

      ws.onmessage = (event) => {
        if (cancelled || attemptFallback) return;
        try {
          const data = JSON.parse(event.data);
          if (data.msg_type === "tick" && data.tick) {
            const next = data.tick.quote;
            const prev = latestPriceRef.current;
            // These setState calls happen inside an external callback (WS message),
            // not in the effect body itself, so they don't trigger cascading renders.
            setPrevPrice(prev);
            setPrice(next);
            if (prev != null) {
              setDirection(next > prev ? "up" : next < prev ? "down" : null);
            }
            latestPriceRef.current = next;
            setIsLoading(false);
            if (data.subscription?.id) {
              subscriptionIdRef.current = data.subscription.id;
            }
          } else if (data.error) {
            setError(data.error.message || "Deriv API error");
            setIsLoading(false);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        if (cancelled || attemptFallback) return;
        startFallback("Connection error");
      };

      ws.onclose = () => {
        if (cancelled || attemptFallback) return;
        setConnected(false);
        // If close happens before we ever opened, fall back.
        if (latestPriceRef.current == null) {
          startFallback("Closed before open");
        }
      };
    } catch {
      startFallback("WebSocket constructor threw");
    }

    return () => {
      cancelled = true;
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      try {
        if (
          subscriptionIdRef.current &&
          wsRef.current?.readyState === WebSocket.OPEN
        ) {
          wsRef.current.send(
            JSON.stringify({ forget: subscriptionIdRef.current })
          );
        }
      } catch {
        // ignore
      }
      subscriptionIdRef.current = null;
      latestPriceRef.current = null;
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, [derivSymbol]);

  // When derivSymbol becomes undefined, reset the visible state in a derived
  // render rather than via setState-in-effect.
  const isLive = !!derivSymbol;
  useEffect(() => {
    if (!isLive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrice(null);
      setPrevPrice(null);
      setDirection(null);
      setIsLoading(false);
      setError(null);
      setConnected(false);
      setUsingFallback(false);
    }
  }, [isLive]);

  return {
    price,
    prevPrice,
    direction,
    isLoading,
    error,
    connected,
    usingFallback,
  };
}
