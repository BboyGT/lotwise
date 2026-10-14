// Lotwise service worker — PWA shell caching + push notifications + background alarm checks
// Strategy: cache-first for static assets, network-first for everything else.

const CACHE_NAME = "lotwise-v2";
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
  // Only handle GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Skip cross-origin requests (TradingView, Binance, Deriv)
  if (url.origin !== self.location.origin) return;
  // Skip Next.js HMR and dev-only paths
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Network-first for navigation (always get fresh HTML)
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

  // Cache-first for static assets
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

// Allow page to trigger skipWaiting from install prompt
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// ===========================================================================
// Background alarm polling
// ===========================================================================

// In-memory store of active alerts (synced from page via postMessage)
let backgroundAlerts = [];
let pollInterval = null;

self.addEventListener("message", (event) => {
  if (!event.data) return;
  const { type, alerts } = event.data;

  if (type === "SYNC_ALERTS") {
    backgroundAlerts = alerts || [];
    // Restart polling if we have alerts, stop if none
    if (backgroundAlerts.length > 0) {
      startBackgroundPolling();
    } else {
      stopBackgroundPolling();
    }
  } else if (type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function startBackgroundPolling() {
  if (pollInterval) return; // already running

  // Poll every 5 seconds while the page is closed/backgrounded
  pollInterval = setInterval(async () => {
    if (backgroundAlerts.length === 0) return;

    // Group by source (deriv vs binance)
    const derivAlerts = backgroundAlerts.filter((a) => a.derivSymbol);
    const binanceAlerts = backgroundAlerts.filter((a) => a.binanceSymbol);

    // Check Binance alerts
    for (const alert of binanceAlerts) {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/price?symbol=${alert.binanceSymbol}`,
          { cache: "no-store" }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const price = parseFloat(data.price);

        const tolerance = alert.targetPrice * 0.0001;
        let hit = false;
        if (alert.direction === "above" && price >= alert.targetPrice - tolerance) {
          hit = true;
        } else if (alert.direction === "below" && price <= alert.targetPrice + tolerance) {
          hit = true;
        }

        if (hit) {
          await fireBackgroundNotification(alert, price);
          // Remove from background alerts (one-shot)
          backgroundAlerts = backgroundAlerts.filter((a) => a.id !== alert.id);
          // Notify the page (if it's open) to update state
          const clients = await self.clients.matchAll({ type: "window" });
          clients.forEach((client) =>
            client.postMessage({
              type: "ALERT_TRIGGERED",
              alertId: alert.id,
              price,
            })
          );
        }
      } catch {
        // Network error — skip this cycle
      }
    }

    // Note: Deriv WS is not available in the service worker context (no WS support in SW).
    // For Deriv synthetic alerts, we'd need a push server. The page handles Deriv alerts
    // while it's open. When the page is closed, only Binance alerts are checked.
    void derivAlerts;
  }, 5000);
}

function stopBackgroundPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function fireBackgroundNotification(alert, price) {
  if (!("Notification" in self)) return;
  // Notifications from SW don't need permission check (granted on subscribe)
  const icon = alert.type === "stopLoss" ? "🛑" : alert.type === "takeProfit" ? "📈" : "🔔";
  const title = `${icon} Lotwise — ${alert.symbolLabel}`;
  const body =
    alert.direction === "above"
      ? `Crossed above ${alert.targetPrice} (now ${price})`
      : `Crossed below ${alert.targetPrice} (now ${price})${alert.label ? ` · ${alert.label}` : ""}`;

  try {
    await self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192-maskable.png",
      tag: alert.id,
      requireInteraction: true,
      data: { alertId: alert.id, url: "/" },
    });
  } catch (err) {
    // Some browsers require a click interaction — silently fail
    console.warn("[SW] Notification failed:", err);
  }
}

// Handle notification click — focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});
