// Lotwise service worker — PWA shell caching + background price monitoring
// Monitors crypto (Binance), forex & indices (TradingView Scanner) in background.
// Stores auto-outcomes in Cache API, syncs to page on reopen.

const CACHE_NAME = "lotwise-v3";
const STATIC_ASSETS = [
  "/",
  "/logo.svg",
  "/manifest.json",
  "/favicon.ico",
  "/favicon-32.png",
  "/favicon-16.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return res;
      });
    })
  );
});

// ===========================================================================
// Background price monitoring + auto-outcome detection
// ===========================================================================

// In-memory store synced from page
let backgroundAlerts = [];
let backgroundTrades = []; // trades with SL/TP to monitor
let pollInterval = null;
let pollInProgress = false;
const previousPrices = new Map();
const OUTCOMES_CACHE = "lotwise-outcomes";

self.addEventListener("message", (event) => {
  if (!event.data) return;
  const { type } = event.data;

  if (type === "SYNC_ALERTS") {
    backgroundAlerts = event.data.alerts || [];
    startBackgroundPolling();
  } else if (type === "SYNC_TRADES") {
    // Trades with SL/TP to monitor in background
    backgroundTrades = event.data.trades || [];
    startBackgroundPolling();
  } else if (type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (type === "GET_PENDING_OUTCOMES") {
    // Page is asking for outcomes determined while app was closed
    getPendingOutcomes().then((outcomes) => {
      event.source.postMessage({ type: "PENDING_OUTCOMES", outcomes });
      // Clear the cache after sending
      clearPendingOutcomes();
    });
  }
});

async function startBackgroundPolling() {
  if (pollInterval) return;

  pollInterval = setInterval(async () => {
    if (pollInProgress) return;
    pollInProgress = true;
    try {
    // 1. Check custom alerts (Binance only — original behavior)
    for (const alert of backgroundAlerts) {
      if (alert.binanceSymbol || alert.tvScannerSymbol || alert.derivSymbol) {
        await checkAlertPrice(alert);
      }
    }

    // 2. Check trade SL/TP levels
    for (const trade of backgroundTrades) {
      if (trade.outcome !== "pending") continue;
      await checkTradeOutcome(trade);
    }

    // Stop polling if nothing to monitor
    if (backgroundAlerts.length === 0 && backgroundTrades.filter(t => t.outcome === "pending").length === 0) {
      stopBackgroundPolling();
    }
    } finally {
      pollInProgress = false;
    }
  }, 5000);
}

function stopBackgroundPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// Check custom price alerts
async function checkAlertPrice(alert) {
  let price = null;

  // Try Binance for crypto
  if (alert.binanceSymbol) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${alert.binanceSymbol}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        price = parseFloat(data.price);
      }
    } catch {}
  }

  // Try TradingView Scanner for forex/indices
  if (price == null && alert.tvScannerSymbol) {
    try {
      const res = await fetch(
        `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(alert.tvScannerSymbol)}&fields=close`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (typeof data.close === "number") price = data.close;
      }
    } catch {}
  }

  if (price == null) return;

  const previous = previousPrices.get(`alert:${alert.id}`);
  previousPrices.set(`alert:${alert.id}`, price);
  const hit = alert.direction === "above"
    ? previous != null && previous < alert.targetPrice && price >= alert.targetPrice
    : previous != null && previous > alert.targetPrice && price <= alert.targetPrice;

  if (hit) {
    await fireBackgroundNotification(alert, price);
    backgroundAlerts = backgroundAlerts.filter((a) => a.id !== alert.id);
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((client) =>
      client.postMessage({ type: "ALERT_TRIGGERED", alertId: alert.id, price })
    );
  }
}

// Check trade SL/TP levels and auto-determine outcome
async function checkTradeOutcome(trade) {
  let price = null;

  // Try Binance for crypto
  if (trade.binanceSymbol) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${trade.binanceSymbol}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        price = parseFloat(data.price);
      }
    } catch {}
  }

  // Try TradingView Scanner for forex/indices
  if (price == null && trade.tvScannerSymbol) {
    try {
      const res = await fetch(
        `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(trade.tvScannerSymbol)}&fields=close`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (typeof data.close === "number") price = data.close;
      }
    } catch {}
  }

  if (price == null) return;

  const previous = previousPrices.get(`trade:${trade.id}`);
  previousPrices.set(`trade:${trade.id}`, price);
  if (previous == null) return;

  const isLong = trade.stopLoss < trade.entry && trade.takeProfit > trade.entry;
  const isShort = trade.stopLoss > trade.entry && trade.takeProfit < trade.entry;
  if (!isLong && !isShort) return;

  const outcome = (isLong ? previous > trade.stopLoss && price <= trade.stopLoss : previous < trade.stopLoss && price >= trade.stopLoss)
    ? "loss"
    : (isLong ? previous < trade.takeProfit && price >= trade.takeProfit : previous > trade.takeProfit && price <= trade.takeProfit)
      ? "win"
      : null;
  if (!outcome) return;

  const timestamp = Date.now();
  const realizedPnL = outcome === "win" ? trade.actualProfit : -trade.actualLoss;
  const result = { tradeId: trade.id, outcome, price, timestamp, realizedPnL };
  await storePendingOutcome(result);
  await fireTradeNotification(trade, outcome, price);
  trade.outcome = outcome;
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => client.postMessage({ type: "TRADE_OUTCOME", ...result }));
}

// Store outcome in Cache API (persists across SW restarts)
async function storePendingOutcome(outcome) {
  try {
    const cache = await caches.open(OUTCOMES_CACHE);
    const response = new Response(JSON.stringify(outcome));
    await cache.put(`outcome-${outcome.tradeId}-${outcome.timestamp}`, response);
  } catch {}
}

// Get all stored outcomes (called when app reopens)
async function getPendingOutcomes() {
  try {
    const cache = await caches.open(OUTCOMES_CACHE);
    const keys = await cache.keys();
    const outcomes = [];
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const text = await response.text();
        outcomes.push(JSON.parse(text));
      }
    }
    return outcomes;
  } catch {
    return [];
  }
}

// Clear outcomes after they've been sent to the page
async function clearPendingOutcomes() {
  try {
    const cache = await caches.open(OUTCOMES_CACHE);
    const keys = await cache.keys();
    for (const key of keys) {
      await cache.delete(key);
    }
  } catch {}
}

async function fireBackgroundNotification(alert, price) {
  if (!("Notification" in self)) return;
  const icon = alert.type === "stopLoss" ? "🛑" : alert.type === "takeProfit" ? "📈" : "🔔";
  const title = `${icon} Lotwise — ${alert.symbolLabel}`;
  const body =
    alert.direction === "above"
      ? `Crossed above ${alert.targetPrice} (now ${price})`
      : `Crossed below ${alert.targetPrice} (now ${price})${alert.label ? ` · ${alert.label}` : ""}`;

  try {
    await self.registration.showNotification(title, {
      body, icon: "/icon-192.png", badge: "/icon-192-maskable.png",
      tag: alert.id, requireInteraction: true,
      data: { alertId: alert.id, url: "/" },
    });
  } catch {}
}

async function fireTradeNotification(trade, outcome, price) {
  if (!("Notification" in self)) return;
  const icon = outcome === "win" ? "📈" : "🛑";
  const result = outcome === "win" ? "Take profit hit — WIN" : "Stop loss hit — LOSS";
  const title = `${icon} Lotwise — ${trade.symbolLabel}`;
  const body = `${result} at ${price}`;

  try {
    await self.registration.showNotification(title, {
      body, icon: "/icon-192.png", badge: "/icon-192-maskable.png",
      tag: `trade-${trade.id}`, requireInteraction: true,
      data: { tradeId: trade.id, url: "/" },
    });
  } catch {}
}

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
