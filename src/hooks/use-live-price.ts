"use client";

import { useEffect, useRef, useState } from "react";

// ===========================================================================
// Live price hook — multi-source with intelligent fallback
//
// Sources tried in order:
//   1. Deriv WebSocket (synthetics only) — wss://ws.derivws.com or wss://ws.binaryws.com
//   2. Binance REST polling (crypto only) — https://api.binance.com/api/v3/ticker/price
//   3. Simulator fallback (when above unreachable, e.g. sandbox networks)
//
// On a real production deployment (non-cloud-blocked IP), WS will connect.
// ===========================================================================

const DERIV_WS_ENDPOINTS = [
  "wss://ws.derivws.com/websockets/v3?app_id=1089",
  "wss://ws.binaryws.com/websockets/v3?app_id=1089",
];

const BINANCE_API = "https://api.binance.com/api/v3/ticker/price";

export interface UseLivePriceResult {
  price: number | null;
  prevPrice: number | null;
  direction: "up" | "down" | null;
  isLoading: boolean;
  error: string | null;
  connected: boolean;
  source: "deriv-ws" | "binance-rest" | "simulator" | "none";
}

// Fallback baseline prices for synthetic symbols when WS is unreachable.
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
  // Step
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

interface PriceSource {
  derivSymbol?: string;
  binanceSymbol?: string;
  decimals: number;
}

export function useLivePrice(source: PriceSource | null): UseLivePriceResult {
  const [price, setPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!source);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [currentSource, setCurrentSource] = useState<UseLivePriceResult["source"]>("none");

  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPriceRef = useRef<number | null>(null);

  // Reset everything when source becomes null
  const sourceKey = source
    ? `${source.derivSymbol || ""}|${source.binanceSymbol || ""}`
    : null;

  useEffect(() => {
    if (!source) return;
    if (!source.derivSymbol && !source.binanceSymbol) return;

    setIsLoading(true);
    setError(null);
    setConnected(false);
    setCurrentSource("none");
    latestPriceRef.current = null;

    let cancelled = false;
    let settled = false; // once we get any source working, don't fall back

    // ---------------------------------------------------------------
    // Path A: Binance REST polling for crypto
    // ---------------------------------------------------------------
    if (source.binanceSymbol && !source.derivSymbol) {
      setCurrentSource("binance-rest");
      setConnected(true);
      setIsLoading(false);

      const fetchPrice = async () => {
        if (cancelled) return;
        try {
          const res = await fetch(
            `${BINANCE_API}?symbol=${source.binanceSymbol}`,
            { cache: "no-store" }
          );
          if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
          const data = await res.json();
          if (typeof data.price !== "string") throw new Error("Bad Binance response");
          const next = parseFloat(data.price);
          const prev = latestPriceRef.current;
          setPrevPrice(prev);
          setPrice(next);
          if (prev != null) {
            setDirection(next > prev ? "up" : next < prev ? "down" : null);
          }
          latestPriceRef.current = next;
        } catch (err) {
          // Binance failed — fall back to simulator
          if (!settled) {
            startSimulator(source, err instanceof Error ? err.message : "Binance fetch failed");
          }
        }
      };

      fetchPrice();
      pollTimerRef.current = setInterval(fetchPrice, 2500);
      settled = true; // mark as settled so simulator only kicks in on error within fetchPrice
      return () => {
        cancelled = true;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }

    // ---------------------------------------------------------------
    // Path B: Deriv WebSocket for synthetics (with simulator fallback)
    // ---------------------------------------------------------------
    if (source.derivSymbol) {
      const startSimulator = (
        src: PriceSource,
        reason?: string
      ) => {
        if (cancelled || settled) return;
        settled = true;
        setCurrentSource("simulator");
        setConnected(true);
        setIsLoading(false);
        setError(null);

        const base = FALLBACK_BASE[src.derivSymbol!] ?? 1000;
        latestPriceRef.current = base;
        setPrice(base);

        simTimerRef.current = setInterval(() => {
          if (cancelled) return;
          const prev = latestPriceRef.current ?? base;
          const drift = (base - prev) * 0.05;
          const shock = prev * (Math.random() - 0.5) * 0.002;
          const next = prev + drift + shock;
          setPrevPrice(prev);
          setPrice(next);
          setDirection(next > prev ? "up" : "down");
          latestPriceRef.current = next;
        }, 1500);
        void reason;
      };

      let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
      let wsIndex = 0;

      const tryConnect = () => {
        if (cancelled || settled) return;
        if (wsIndex >= DERIV_WS_ENDPOINTS.length) {
          startSimulator(source, "All Deriv WS endpoints failed");
          return;
        }

        const url = DERIV_WS_ENDPOINTS[wsIndex];
        wsIndex += 1;

        let ws: WebSocket;
        try {
          ws = new WebSocket(url);
          wsRef.current = ws;
        } catch {
          tryConnect();
          return;
        }

        connectionTimeout = setTimeout(() => {
          if (!cancelled && !settled && ws.readyState !== WebSocket.OPEN) {
            try { ws.close(); } catch {}
            tryConnect();
          }
        }, 4000);

        ws.onopen = () => {
          if (cancelled || settled) return;
          if (connectionTimeout) clearTimeout(connectionTimeout);
          setCurrentSource("deriv-ws");
          setConnected(true);
          ws.send(JSON.stringify({ ticks: source.derivSymbol, subscribe: 1 }));
        };

        ws.onmessage = (event) => {
          if (cancelled || settled && currentSource !== "deriv-ws") return;
          try {
            const data = JSON.parse(event.data);
            if (data.msg_type === "tick" && data.tick) {
              const next = data.tick.quote;
              const prev = latestPriceRef.current;
              setPrevPrice(prev);
              setPrice(next);
              if (prev != null) {
                setDirection(next > prev ? "up" : next < prev ? "down" : null);
              }
              latestPriceRef.current = next;
              setIsLoading(false);
              settled = true;
              if (data.subscription?.id) {
                subscriptionIdRef.current = data.subscription.id;
              }
            } else if (data.error) {
              setError(data.error.message || "Deriv API error");
              setIsLoading(false);
            }
          } catch {
            // ignore
          }
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
          if (latestPriceRef.current == null) {
            tryConnect();
          } else {
            startSimulator(source, "Connection closed");
          }
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
          if (
            subscriptionIdRef.current &&
            wsRef.current?.readyState === WebSocket.OPEN
          ) {
            wsRef.current.send(
              JSON.stringify({ forget: subscriptionIdRef.current })
            );
          }
        } catch {}
        subscriptionIdRef.current = null;
        latestPriceRef.current = null;
        try {
          wsRef.current?.close();
        } catch {}
      };
    }

    // ---------------------------------------------------------------
    // No source — nothing to do
    // ---------------------------------------------------------------
    return () => {};
  }, [sourceKey]);

  // Reset when source becomes null
  const isLive = !!source;
  useEffect(() => {
    if (!isLive) {
      setPrice(null);
      setPrevPrice(null);
      setDirection(null);
      setIsLoading(false);
      setError(null);
      setConnected(false);
      setCurrentSource("none");
    }
  }, [isLive]);

  return {
    price,
    prevPrice,
    direction,
    isLoading,
    error,
    connected,
    source: currentSource,
  };
}
