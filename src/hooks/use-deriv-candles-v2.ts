"use client";

import { useEffect, useRef, useState } from "react";

// ===========================================================================
// Deriv candles hook — fetches historical candles + streams new ones
//
// Uses Deriv's current public WebSocket and ticks_history endpoint.
// Displays no candles when the live feed is unavailable; never invents market data.
// ===========================================================================

const DERIV_WS_ENDPOINTS = [
  "wss://api.derivws.com/trading/v1/options/ws/public",
  "wss://ws.derivws.com/websockets/v3?app_id=1089",
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
  source: "deriv-ws" | "none";
}

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
  const [source, setSource] = useState<"deriv-ws" | "none">("none");

  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
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
    let hasReceivedLiveCandles = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
    let firstCandleTimeout: ReturnType<typeof setTimeout> | null = null;
    let wsIndex = 0;

    const tryConnect = () => {
      if (cancelled) return;
      if (wsIndex >= DERIV_WS_ENDPOINTS.length) {
        if (hasReceivedLiveCandles) {
          setConnected(false);
          setError("Deriv connection lost. Retrying live candles…");
          reconnectTimer = setTimeout(() => {
            wsIndex = 0;
            tryConnect();
          }, 3000);
        } else {
          setConnected(false);
          setIsLoading(false);
          setError("Deriv candle feed is unavailable. Retrying live candles…");
          reconnectTimer = setTimeout(() => {
            wsIndex = 0;
            tryConnect();
          }, 3000);
        }
        return;
      }
      const url = DERIV_WS_ENDPOINTS[wsIndex];
      wsIndex += 1;
      let ws: WebSocket;
      let receivedCandlesOnSocket = false;
      try { ws = new WebSocket(url); } catch { tryConnect(); return; }
      wsRef.current = ws;

      connectionTimeout = setTimeout(() => {
        if (!cancelled && wsRef.current === ws && ws.readyState !== WebSocket.OPEN) {
          try { ws.close(); } catch {}
        }
      }, 10000); // 10s timeout — some networks are slow on first WS handshake

      ws.onopen = () => {
        if (cancelled) return;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setSource("deriv-ws");
        firstCandleTimeout = setTimeout(() => {
          if (!cancelled && !receivedCandlesOnSocket && wsRef.current === ws) {
            try { ws.close(); } catch {}
          }
        }, 10000);
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
        if (cancelled || wsRef.current !== ws) return;
        try {
          const data = JSON.parse(event.data);
          if (data.msg_type === "candles" && data.candles) {
            if (firstCandleTimeout) clearTimeout(firstCandleTimeout);
            receivedCandlesOnSocket = true;
            hasReceivedLiveCandles = true;
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
            setConnected(true);
            setError(null);
            if (data.subscription?.id) {
              subscriptionIdRef.current = data.subscription.id;
            }
          } else if (data.msg_type === "ohlc" && data.ohlc) {
            receivedCandlesOnSocket = true;
            setConnected(true);
            setError(null);
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
            try { ws.close(); } catch {}
          }
        } catch { /* ignore */ }
      };

      ws.onerror = () => {
        if (cancelled) return;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        try { ws.close(); } catch {}
      };

      ws.onclose = () => {
        if (firstCandleTimeout) clearTimeout(firstCandleTimeout);
        if (cancelled) return;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        setConnected(false);
        if (hasReceivedLiveCandles) {
          wsIndex = DERIV_WS_ENDPOINTS.length;
        }
        tryConnect();
      };
    };

    tryConnect();

    return () => {
      cancelled = true;
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (firstCandleTimeout) clearTimeout(firstCandleTimeout);
      if (reconnectTimer) clearTimeout(reconnectTimer);
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
