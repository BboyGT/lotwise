"use client";

import { useEffect, useRef, useState } from "react";

// ===========================================================================
// Live price hook — multi-source with intelligent fallback
//
// Sources tried in order:
//   1. Deriv's current public market-data WebSocket (synthetics only)
//   2. Legacy Deriv WebSocket fallback for older networks
//   3. Binance REST polling (crypto only) — https://api.binance.com/api/v3/ticker/price
//   4. Simulator fallback (when real sources are unreachable)
//
// Price requests originate in the visitor's browser, independent of the app host.
// ===========================================================================

const DERIV_WS_ENDPOINTS = [
  "wss://api.derivws.com/trading/v1/options/ws/public",
  "wss://ws.derivws.com/websockets/v3?app_id=1089",
];

const BINANCE_API = "https://api.binance.com/api/v3/ticker/price";

export interface UseLivePriceResult {
  price: number | null;
  prevPrice: number | null;
  direction: "up" | "down" | null;
  isLoading: boolean;
  error: string | null;
  connected: boolean;
  source: "deriv-ws" | "binance-rest" | "tv-scanner" | "simulator" | "none";
}

// Fallback baseline prices for synthetic symbols when WS is unreachable.
const FALLBACK_BASE: Record<string, number> = {
  // Boom / Crash
  BOOM300N: 8500,
  BOOM500: 9000,
  BOOM600: 9200,
  BOOM900: 9400,
  BOOM1000: 9500,
  CRASH300N: 8500,
  CRASH500: 9000,
  CRASH600: 9200,
  CRASH900: 9400,
  CRASH1000: 9500,
  // Volatility
  R_10: 6510,
  R_25: 1520,
  R_50: 198,
  R_75: 385460.5,
  R_100: 1348.5,
  // 1s Volatility
  "1HZ10V": 7320,
  "1HZ15V": 4500,
  "1HZ25V": 1845,
  "1HZ30V": 3200,
  "1HZ50V": 234,
  "1HZ75V": 412350,
  "1HZ90V": 8900,
  "1HZ100V": 1567,
  // Jump
  JD10: 7800,
  JD25: 1760,
  JD50: 245,
  JD75: 412000,
  JD100: 1420,
};

interface PriceSource {
  derivSymbol?: string;
  binanceSymbol?: string;
  tvScannerSymbol?: string;  // TradingView scanner symbol (forex/indices)
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

  useEffect(() => {
    if (!source) return;
    if (!source.derivSymbol && !source.binanceSymbol && !source.tvScannerSymbol) return;

    setIsLoading(true);
    setError(null);
    setConnected(false);
    setCurrentSource("none");
    latestPriceRef.current = null;

    let cancelled = false;
    let settled = false; // once we get any source working, don't fall back

    // ---------------------------------------------------------------
    // Simulator fallback (defined at outer scope so both Binance and
    // Deriv paths can use it).
    // ---------------------------------------------------------------
    const startSimulator = (
      src: PriceSource,
      reason?: string
    ) => {
      if (cancelled || settled) return;
      settled = true;
      setCurrentSource("simulator");
      setConnected(false);
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

    // ---------------------------------------------------------------
    // Path A: TradingView scanner polling for forex/indices
    // ---------------------------------------------------------------
    if (source.tvScannerSymbol && !source.derivSymbol && !source.binanceSymbol) {
      setCurrentSource("tv-scanner");
      setConnected(false);
      setIsLoading(false);

      const fetchPrice = async () => {
        if (cancelled) return;
        try {
          const url = `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(
            source.tvScannerSymbol!
          )}&fields=close,change`;
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) throw new Error(`TV scanner HTTP ${res.status}`);
          const data = await res.json();
          if (typeof data.close !== "number" || data.close <= 0) {
            throw new Error("Invalid TV scanner response");
          }
          const next = data.close;
          const prev = latestPriceRef.current;
          setPrevPrice(prev);
          setPrice(next);
          if (prev != null) {
            setDirection(next > prev ? "up" : next < prev ? "down" : null);
          }
          latestPriceRef.current = next;
          setConnected(true);
          settled = true;
        } catch (err) {
          if (!settled) {
            startSimulator(source, err instanceof Error ? err.message : "TV scanner fetch failed");
          }
        }
      };

      fetchPrice();
      pollTimerRef.current = setInterval(fetchPrice, 3000);
      return () => {
        cancelled = true;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }

    // ---------------------------------------------------------------
    // Path B: Binance REST polling for crypto
    // ---------------------------------------------------------------
    if (source.binanceSymbol && !source.derivSymbol) {
      setCurrentSource("binance-rest");
      setConnected(false);
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
          setConnected(true);
          settled = true; // mark settled on first successful fetch
        } catch (err) {
          // Binance failed — fall back to simulator if we never got a price
          if (!settled) {
            startSimulator(source, err instanceof Error ? err.message : "Binance fetch failed");
          }
        }
      };

      fetchPrice();
      pollTimerRef.current = setInterval(fetchPrice, 2500);
      return () => {
        cancelled = true;
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }

    // ---------------------------------------------------------------
    // Path B: Deriv WebSocket for synthetics (uses outer startSimulator)
    // ---------------------------------------------------------------
    if (source.derivSymbol) {
      let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
      let firstTickTimeout: ReturnType<typeof setTimeout> | null = null;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let wsIndex = 0;
      let hasReceivedLiveTick = false;
      let simulatorStarted = false;

      const tryConnect = () => {
        if (cancelled || simulatorStarted) return;
        if (wsIndex >= DERIV_WS_ENDPOINTS.length) {
          if (hasReceivedLiveTick) {
            setConnected(false);
            setError("Deriv connection lost. Retrying live prices…");
            reconnectTimer = setTimeout(() => {
              wsIndex = 0;
              tryConnect();
            }, 3000);
          } else {
            simulatorStarted = true;
            startSimulator(source, "All Deriv WS endpoints failed");
          }
          return;
        }

        const url = DERIV_WS_ENDPOINTS[wsIndex];
        wsIndex += 1;

        let ws: WebSocket;
        let receivedTickOnSocket = false;
        try {
          ws = new WebSocket(url);
          wsRef.current = ws;
        } catch {
          tryConnect();
          return;
        }

        connectionTimeout = setTimeout(() => {
          if (!cancelled && wsRef.current === ws && ws.readyState !== WebSocket.OPEN) {
            try { ws.close(); } catch {}
          }
        }, 10000); // 10s timeout — some networks are slow on first WS handshake

        ws.onopen = () => {
          if (cancelled || simulatorStarted) return;
          if (connectionTimeout) clearTimeout(connectionTimeout);
          setCurrentSource("deriv-ws");
          setConnected(false);
          setError(null);
          firstTickTimeout = setTimeout(() => {
            if (!cancelled && !receivedTickOnSocket && wsRef.current === ws) {
              try { ws.close(); } catch {}
              tryConnect();
            }
          }, 10000);
          ws.send(JSON.stringify({ ticks: source.derivSymbol, subscribe: 1 }));
        };

        ws.onmessage = (event) => {
          if (cancelled || simulatorStarted || wsRef.current !== ws) return;
          try {
            const data = JSON.parse(event.data);
            if (data.msg_type === "tick" && data.tick) {
              if (firstTickTimeout) clearTimeout(firstTickTimeout);
              receivedTickOnSocket = true;
              const next = data.tick.quote;
              const prev = latestPriceRef.current;
              setPrevPrice(prev);
              setPrice(next);
              if (prev != null) {
                setDirection(next > prev ? "up" : next < prev ? "down" : null);
              }
              latestPriceRef.current = next;
              setIsLoading(false);
              setConnected(true);
              setError(null);
              hasReceivedLiveTick = true;
              settled = true;
              if (data.subscription?.id) {
                subscriptionIdRef.current = data.subscription.id;
              }
            } else if (data.error) {
              setError(data.error.message || "Deriv API error");
              setIsLoading(false);
              try { ws.close(); } catch {}
            }
          } catch {
            // ignore
          }
        };

        ws.onerror = () => {
          if (cancelled || simulatorStarted) return;
          if (connectionTimeout) clearTimeout(connectionTimeout);
          if (firstTickTimeout) clearTimeout(firstTickTimeout);
          try { ws.close(); } catch {}
        };

        ws.onclose = () => {
          if (firstTickTimeout) clearTimeout(firstTickTimeout);
          if (cancelled || simulatorStarted) return;
          if (connectionTimeout) clearTimeout(connectionTimeout);
          setConnected(false);
          if (hasReceivedLiveTick) {
            setError("Deriv connection lost. Retrying live prices…");
            wsIndex = DERIV_WS_ENDPOINTS.length;
            tryConnect();
          } else {
            tryConnect();
          }
        };
      };

      tryConnect();

      return () => {
        cancelled = true;
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (firstTickTimeout) clearTimeout(firstTickTimeout);
        if (reconnectTimer) clearTimeout(reconnectTimer);
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
  }, [source?.derivSymbol, source?.binanceSymbol, source?.tvScannerSymbol]);

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
