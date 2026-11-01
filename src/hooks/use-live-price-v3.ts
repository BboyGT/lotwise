"use client";

import { useEffect, useRef, useState } from "react";

// ===========================================================================
// Live price hook — multi-source live feeds only
//
// Sources tried in order:
//   1. Deriv's current public market-data WebSocket (synthetics only)
//   2. Legacy Deriv WebSocket fallback for older networks
//   3. Binance REST polling (crypto only) — https://api.binance.com/api/v3/ticker/price
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
  source: "deriv-ws" | "binance-rest" | "tv-scanner" | "none";
}

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
  const latestPriceRef = useRef<number | null>(null);
  const sourceKey = source
    ? `${source.derivSymbol ?? ""}|${source.binanceSymbol ?? ""}|${source.tvScannerSymbol ?? ""}`
    : "";
  const [activeSourceKey, setActiveSourceKey] = useState(sourceKey);

  useEffect(() => {
    if (!source) return;
    if (!source.derivSymbol && !source.binanceSymbol && !source.tvScannerSymbol) return;

    setActiveSourceKey(sourceKey);
    setPrice(null);
    setPrevPrice(null);
    setDirection(null);
    setIsLoading(true);
    setError(null);
    setConnected(false);
    setCurrentSource("none");
    latestPriceRef.current = null;

    let cancelled = false;

    // ---------------------------------------------------------------
    // Path A: TradingView scanner polling for forex/indices
    // ---------------------------------------------------------------
    if (source.tvScannerSymbol && !source.derivSymbol && !source.binanceSymbol) {
      setCurrentSource("tv-scanner");
      setConnected(false);
      setIsLoading(false);
      let requestInFlight = false;
      let activeController: AbortController | null = null;

      const fetchPrice = async () => {
        if (cancelled || requestInFlight) return;
        requestInFlight = true;
        const controller = new AbortController();
        activeController = controller;
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const url = `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(
            source.tvScannerSymbol!
          )}&fields=close,change`;
          const res = await fetch(url, { cache: "no-store", signal: controller.signal });
          if (cancelled) return;
          if (!res.ok) throw new Error(`TV scanner HTTP ${res.status}`);
          const data = await res.json();
          if (cancelled) return;
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
          setError(null);
          setIsLoading(false);
        } catch (err) {
          if (!cancelled) {
            setConnected(false);
            setError(err instanceof Error ? err.message : "TradingView price fetch failed");
            setIsLoading(false);
          }
        } finally {
          clearTimeout(timeout);
          if (activeController === controller) activeController = null;
          requestInFlight = false;
        }
      };

      fetchPrice();
      pollTimerRef.current = setInterval(fetchPrice, 3000);
      return () => {
        cancelled = true;
        activeController?.abort();
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
      let requestInFlight = false;
      let activeController: AbortController | null = null;

      const fetchPrice = async () => {
        if (cancelled || requestInFlight) return;
        requestInFlight = true;
        const controller = new AbortController();
        activeController = controller;
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(
            `${BINANCE_API}?symbol=${source.binanceSymbol}`,
            { cache: "no-store", signal: controller.signal }
          );
          if (cancelled) return;
          if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
          const data = await res.json();
          if (cancelled) return;
          if (typeof data.price !== "string") throw new Error("Bad Binance response");
          const next = parseFloat(data.price);
          if (!Number.isFinite(next) || next <= 0) throw new Error("Invalid Binance price response");
          const prev = latestPriceRef.current;
          setPrevPrice(prev);
          setPrice(next);
          if (prev != null) {
            setDirection(next > prev ? "up" : next < prev ? "down" : null);
          }
          latestPriceRef.current = next;
          setConnected(true);
          setError(null);
          setIsLoading(false);
        } catch (err) {
          // Keep retrying on the poll interval; never invent a market price.
          if (!cancelled) {
            setConnected(false);
            setError(err instanceof Error ? err.message : "Binance price fetch failed");
            setIsLoading(false);
          }
        } finally {
          clearTimeout(timeout);
          if (activeController === controller) activeController = null;
          requestInFlight = false;
        }
      };

      fetchPrice();
      pollTimerRef.current = setInterval(fetchPrice, 2500);
      return () => {
        cancelled = true;
        activeController?.abort();
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }

    // ---------------------------------------------------------------
    // Path B: Deriv WebSocket for synthetics
    // ---------------------------------------------------------------
    if (source.derivSymbol) {
      let connectionTimeout: ReturnType<typeof setTimeout> | null = null;
      let firstTickTimeout: ReturnType<typeof setTimeout> | null = null;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let wsIndex = 0;
      let hasReceivedLiveTick = false;

      const tryConnect = () => {
        if (cancelled) return;
        if (wsIndex >= DERIV_WS_ENDPOINTS.length) {
          if (hasReceivedLiveTick) {
            setConnected(false);
            setError("Deriv connection lost. Retrying live prices…");
            reconnectTimer = setTimeout(() => {
              wsIndex = 0;
              tryConnect();
            }, 3000);
          } else {
            setConnected(false);
            setIsLoading(false);
            setError("Deriv price feed is unavailable. Retrying live prices…");
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
          if (cancelled) return;
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
          if (cancelled || wsRef.current !== ws) return;
          try {
            const data = JSON.parse(event.data);
            if (data.msg_type === "tick" && data.tick) {
              const next = Number(data.tick.quote);
              if (!Number.isFinite(next) || next <= 0) {
                setError("Invalid Deriv price response");
                setIsLoading(false);
                return;
              }
              if (firstTickTimeout) clearTimeout(firstTickTimeout);
              receivedTickOnSocket = true;
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
          if (cancelled) return;
          if (connectionTimeout) clearTimeout(connectionTimeout);
          if (firstTickTimeout) clearTimeout(firstTickTimeout);
          try { ws.close(); } catch {}
        };

        ws.onclose = () => {
          if (firstTickTimeout) clearTimeout(firstTickTimeout);
          if (cancelled) return;
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

  const isCurrentSource = activeSourceKey === sourceKey;
  return {
    price: isCurrentSource ? price : null,
    prevPrice: isCurrentSource ? prevPrice : null,
    direction: isCurrentSource ? direction : null,
    isLoading: isCurrentSource ? isLoading : !!source,
    error: isCurrentSource ? error : null,
    connected: isCurrentSource && connected,
    source: isCurrentSource ? currentSource : "none",
  };
}
