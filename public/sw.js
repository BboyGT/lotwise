// Lotwise service worker — PWA shell caching + background price monitoring
// Monitors crypto (Binance), forex & indices (TradingView Scanner) in background.
// Stores auto-outcomes in Cache API, syncs to page on reopen.

const CACHE_NAME = "lotwise-v6";
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
const STATIC_ASSET_PATHS = new Set(STATIC_ASSETS.filter((path) => path !== "/"));

function isHtmlResponse(response) {
  return response?.headers.get("content-type")?.toLowerCase().includes("text/html") ?? false;
}

async function cachedAppShell() {
  const response = await caches.match("/");
  return isHtmlResponse(response) ? response : null;
}

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
        // Keep durable app data caches (for example pending journal outcomes)
        // when rotating only the shell cache version.
        keys.filter((k) => k.startsWith("lotwise-v") && k !== CACHE_NAME).map((k) => caches.delete(k))
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
  // Next.js App Router uses Flight responses for client navigation. They must
  // stay network-only; caching one as a document can make the browser display
  // the serialized page payload as text after a button action or navigation.
  if (
    url.searchParams.has("_rsc") ||
    request.headers.has("RSC") ||
    request.headers.has("Next-Router-State-Tree") ||
    request.headers.has("Next-Router-Prefetch")
  ) return;
  // API responses contain live configuration and user-specific sync results.
  // Never cache them, even when the caller requests cache: "no-store".
  if (url.pathname.startsWith("/api/") || request.cache === "no-store") return;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(async (response) => {
        if (isHtmlResponse(response)) {
          await caches.open(CACHE_NAME).then((cache) => cache.put("/", response.clone()));
          return response;
        }
        // Never let a non-document (including an RSC payload) become a browser
        // page. Prefer the cached app shell when the server returns the wrong
        // content type for a document navigation.
        return (await cachedAppShell()) || new Response(
          "Lotwise could not load the page. Check your connection and try again.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      })
        .catch(async () => {
          return (await cachedAppShell()) || new Response(
            "Lotwise is unavailable offline. Reconnect and try again.",
            { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
          );
        })
    );
    return;
  }

  // Cache only immutable static assets. Dynamic Next.js responses are never
  // safe to serve from this cache because they can contain Flight data.
  if (!STATIC_ASSET_PATHS.has(url.pathname) && !url.pathname.startsWith("/_next/static/")) return;

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

// Remote Web Push is the reliable background path; service-worker timers below
// remain a best-effort enhancement while a browser chooses to keep this worker alive.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {}
  const title = typeof payload.title === "string" ? payload.title : "Lotwise alert";
  const body = typeof payload.body === "string" ? payload.body : "A monitored price level was reached.";
  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/";
  const notification = self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192-maskable.png",
    tag: typeof payload.tag === "string" ? payload.tag : undefined,
    requireInteraction: true,
    data: { url, event: payload.event },
  });
  const notifyOpenClients = self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    if (!payload.event || typeof payload.event !== "object") return;
    for (const client of clients) client.postMessage({ type: "PUSH_EVENT", event: payload.event });
  });
  event.waitUntil(Promise.all([notification, notifyOpenClients]));
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
  const target = event.notification.data?.url;
  const targetUrl = typeof target === "string" && target.startsWith("/")
    ? new URL(target, self.location.origin).href
    : self.location.origin + "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          return client.navigate?.(targetUrl).then(() => client.focus()) ?? client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
