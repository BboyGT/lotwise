/**
 * Lotwise Price Relay — WebSocket-to-REST bridge for Deriv synthetic indices.
 *
 * Connects to Deriv's WebSocket API, subscribes to tick streams for all
 * synthetic symbols, and exposes the latest prices via a simple REST endpoint
 * that the service worker can poll (since SW can't do WebSocket).
 *
 * Endpoints:
 *   GET  /price/:symbol    → { symbol, price, timestamp }
 *   GET  /prices           → { symbols: [{ symbol, price, timestamp }] }
 *   GET  /health           → { status: "ok", connected: true/false, symbols: N }
 *   POST /subscribe       → { symbol: "R_75" } → subscribes to a new symbol
 *
 * Runs on port 3001.
 */

import { serve } from "bun";
import { SYMBOLS } from "../../src/lib/symbols-v3.ts";

const DERIV_WS_URL = "wss://api.derivws.com/trading/v1/options/ws/public";
const PORT = 3001;

// ---- State ----
let ws: WebSocket | null = null;
let isConnected = false;
const priceCache = new Map<string, { price: number; timestamp: number }>();
const subscribedSymbols = new Set<string>();
const pendingSubscriptions: string[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// All Deriv synthetic symbols to monitor
const ALL_SYNTHETIC_SYMBOLS = SYMBOLS
  .filter((symbol) => symbol.assetClass === "synthetic" && symbol.derivSymbol)
  .map((symbol) => symbol.derivSymbol!);

// Deriv symbols are mixed case (for example R_75 and current Step Index IDs), so match case-insensitively
// and always use the canonical spelling Deriv expects.
const CANONICAL_SYMBOLS = new Map(ALL_SYNTHETIC_SYMBOLS.map((s) => [s.toLowerCase(), s]));
const SYMBOL_PATTERN = /^[A-Za-z0-9_]{1,30}$/;
const MAX_SUBSCRIPTIONS = 100;

function resolveSymbol(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {}
  return CANONICAL_SYMBOLS.get(decoded.toLowerCase()) ?? decoded;
}

// ---- WebSocket connection ----
function connect() {
  console.log("[relay] Connecting to Deriv WS...");
  try {
    ws = new WebSocket(DERIV_WS_URL);
  } catch (err) {
    console.error("[relay] WebSocket constructor failed:", err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log("[relay] Connected to Deriv WS");
    isConnected = true;
    // Subscribe to all symbols
    for (const symbol of ALL_SYNTHETIC_SYMBOLS) {
      if (!subscribedSymbols.has(symbol)) {
        subscribeToSymbol(symbol);
      }
    }
    // Process any pending subscriptions
    while (pendingSubscriptions.length > 0) {
      const sym = pendingSubscriptions.shift()!;
      subscribeToSymbol(sym);
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string);
      if (data.msg_type === "tick" && data.tick) {
        const symbol = data.tick.symbol;
        const price = data.tick.quote;
        priceCache.set(symbol, { price, timestamp: Date.now() });
      } else if (data.error) {
        console.error(`[relay] Deriv error for ${data.error?.code}: ${data.error?.message}`);
      }
    } catch {
      // ignore malformed messages
    }
  };

  ws.onerror = (event) => {
    console.error("[relay] WS error");
    isConnected = false;
  };

  ws.onclose = () => {
    console.log("[relay] WS disconnected, will reconnect in 5s");
    isConnected = false;
    ws = null;
    scheduleReconnect();
  };
}

function subscribeToSymbol(symbol: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    pendingSubscriptions.push(symbol);
    return;
  }
  ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
  subscribedSymbols.add(symbol);
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    connect();
  }, 5000);
}

// ---- HTTP Server ----
const server = serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // GET /health
    if (path === "/health") {
      return Response.json({
        status: "ok",
        connected: isConnected,
        symbolsMonitored: subscribedSymbols.size,
        pricesCached: priceCache.size,
        uptime: process.uptime?.() ?? 0,
      }, { headers: corsHeaders });
    }

    // GET /prices — all cached prices
    if (path === "/prices") {
      const prices: Array<{ symbol: string; price: number; timestamp: number }> = [];
      for (const [symbol, data] of priceCache.entries()) {
        prices.push({ symbol, ...data });
      }
      return Response.json({ symbols: prices, count: prices.length }, { headers: corsHeaders });
    }

    // GET /price/:symbol — single price
    const priceMatch = path.match(/^\/price\/(.+)$/);
    if (priceMatch) {
      const symbol = resolveSymbol(priceMatch[1]);
      const data = priceCache.get(symbol);
      if (data) {
        return Response.json({ symbol, price: data.price, timestamp: data.timestamp }, { headers: corsHeaders });
      }
      return Response.json({ error: "Symbol not found or no data yet", symbol }, { status: 404, headers: corsHeaders });
    }

    // POST /subscribe — subscribe to a new symbol
    if (path === "/subscribe" && req.method === "POST") {
      try {
        const body = await req.json();
        const symbol = typeof body.symbol === "string" ? resolveSymbol(body.symbol) : undefined;
        if (symbol && SYMBOL_PATTERN.test(symbol)) {
          if (!subscribedSymbols.has(symbol) && subscribedSymbols.size >= MAX_SUBSCRIPTIONS) {
            return Response.json({ error: "Subscription limit reached" }, { status: 429, headers: corsHeaders });
          }
          subscribeToSymbol(symbol);
          return Response.json({ status: "subscribed", symbol }, { headers: corsHeaders });
        }
      } catch {}
      return Response.json({ error: "Invalid request body" }, { status: 400, headers: corsHeaders });
    }

    // Default
    return Response.json({
      service: "Lotwise Price Relay",
      endpoints: [
        "GET /health — service status",
        "GET /prices — all cached prices",
        "GET /price/:symbol — single price (e.g. /price/R_75)",
        "POST /subscribe — subscribe to new symbol { symbol: 'R_75' }",
      ],
    }, { headers: corsHeaders });
  },
});

console.log(`[relay] Price relay server running on http://localhost:${PORT}`);
console.log(`[relay] Monitoring ${ALL_SYNTHETIC_SYMBOLS.length} synthetic symbols`);

// Start WS connection
connect();

// Prevent process from exiting
process.on("SIGTERM", () => {
  console.log("[relay] Shutting down...");
  if (ws) ws.close();
  server.stop();
  process.exit(0);
});
