import type { Config } from "@netlify/functions";
import {
  deviceStoreKey,
  isAllowedPushEndpoint,
  isDeviceToken,
  pushStore,
  type PushDevice,
  type PushEvent,
  validLevel,
} from "./_shared/push";

const MAX_BODY_BYTES = 48_000;
const MAX_LEVELS = 50;

async function handlePushSync(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Invalid origin." }, { status: 403 });
    }
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!isDeviceToken(body.deviceToken)) {
    return Response.json({ error: "Invalid device token." }, { status: 400 });
  }

  const key = await deviceStoreKey(body.deviceToken);
  const store = pushStore();
  if (body.action === "unsubscribe") {
    await store.delete(key);
    return Response.json({ ok: true });
  }
  if (body.action !== "sync") {
    return Response.json({ error: "Unsupported action." }, { status: 400 });
  }

  const subscription = body.subscription as PushDevice["subscription"] | undefined;
  if (!subscription || !isAllowedPushEndpoint(subscription.endpoint) ||
      typeof subscription.keys?.p256dh !== "string" || typeof subscription.keys?.auth !== "string") {
    return Response.json({ error: "Invalid push subscription." }, { status: 400 });
  }
  const alerts = body.alerts;
  const trades = body.trades;
  if (!Array.isArray(alerts) || !Array.isArray(trades) || alerts.length > MAX_LEVELS || trades.length > MAX_LEVELS ||
      !alerts.every((level) => validLevel(level, "alert")) || !trades.every((level) => validLevel(level, "trade"))) {
    return Response.json({ error: "Invalid alert or trade data." }, { status: 400 });
  }

  const old = await store.get(key, { type: "json" }) as PushDevice | null;
  const pendingEvents = Array.isArray(old?.pendingEvents) ? old.pendingEvents.slice(-MAX_LEVELS * 2) : [];
  const pendingDeliveries = Array.isArray(old?.pendingDeliveries) ? old.pendingDeliveries.slice(-MAX_LEVELS * 2) : [];
  const triggeredEvents = [...pendingEvents, ...pendingDeliveries.map((item) => item.event)];
  const triggeredAlerts = new Set(triggeredEvents.map((event) => event.alertId).filter(Boolean));
  const triggeredTrades = new Set(triggeredEvents.map((event) => event.tradeId).filter(Boolean));
  const activeAlerts = (alerts as PushDevice["alerts"]).filter((alert) => !triggeredAlerts.has(alert.id));
  const activeTrades = (trades as PushDevice["trades"]).filter((trade) => !triggeredTrades.has(trade.id));
  if (activeAlerts.length === 0 && activeTrades.length === 0 && pendingDeliveries.length === 0) {
    await store.delete(key);
    return Response.json({ ok: true, events: pendingEvents });
  }
  const next: PushDevice = {
    subscription,
    alerts: activeAlerts,
    trades: activeTrades,
    previousPrices: old?.previousPrices ?? {},
    pendingEvents: [],
    pendingDeliveries,
    updatedAt: Date.now(),
  };

  await store.setJSON(key, next);
  return Response.json({ ok: true, events: pendingEvents });
}

export default handlePushSync;

export const config: Config = {
  path: "/api/push/sync",
  method: ["POST"],
  rateLimit: { action: "rate_limit", aggregateBy: "ip", windowSize: 60, windowLimit: 30 },
};

