import type { Config } from "@netlify/functions";
import webpush from "web-push";
import {
  marketKey,
  PUSH_STORE_PREFIX,
  pushFailureDisposition,
  pushStore,
  type BackgroundLevel,
  type PushDevice,
  type PushEvent,
} from "./_shared/push";

const DERIV_WS_URL = "wss://api.derivws.com/trading/v1/options/ws/public";
const PUSH_TTL_SECONDS = 60 * 60;
const DERIV_TIMEOUT_MS = 8_000;

function isPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function getDerivPrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (symbols.length === 0) return prices;
  try {
    const socket = new WebSocket(DERIV_WS_URL);
    await new Promise<void>((resolve) => {
      let finished = false;
      const requestSymbols = new Map(symbols.map((symbol, index) => [index + 1, symbol]));
      const pendingRequests = new Set(requestSymbols.keys());
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        try { socket.close(); } catch {}
        resolve();
      };
      const timer = setTimeout(finish, DERIV_TIMEOUT_MS);
      socket.addEventListener("open", () => {
        for (const [reqId, symbol] of requestSymbols) {
          setTimeout(() => {
            if (!finished && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ ticks: symbol, req_id: reqId }));
            }
          }, (reqId - 1) * 40);
        }
      }, { once: true });
      socket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(String(event.data));
          const reqId = Number(data.req_id);
          if (!pendingRequests.has(reqId)) return;
          pendingRequests.delete(reqId);
          if (data.msg_type === "tick" && typeof data.tick?.symbol === "string" && isPrice(data.tick.quote)) {
            prices.set(data.tick.symbol, data.tick.quote);
          } else if (data.error) {
            console.warn("[push-monitor] Deriv quote request failed:", data.error.code);
          }
          if (pendingRequests.size === 0) finish();
        } catch {}
      });
      socket.addEventListener("error", finish, { once: true });
      socket.addEventListener("close", finish, { once: true });
    });
  } catch (error) {
    console.warn("[push-monitor] Deriv WebSocket unavailable:", error instanceof Error ? error.message : "unknown error");
  }
  return prices;
}

async function getHttpPrice(level: BackgroundLevel): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    let response: Response;
    let price: number;
    if (level.binanceSymbol) {
      response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(level.binanceSymbol)}`, {
        cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) return null;
      const data = await response.json() as { price?: string };
      price = Number(data.price);
    } else if (level.tvScannerSymbol) {
      response = await fetch(`https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(level.tvScannerSymbol)}&fields=close`, {
        cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) return null;
      const data = await response.json() as { close?: number };
      price = Number(data.close);
    } else {
      return null;
    }
    return isPrice(price) ? price : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

type PushDeliveryResult = "sent" | "expired" | "retry";

async function sendEvent(device: PushDevice, event: PushEvent): Promise<PushDeliveryResult> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!device.subscription || !publicKey || !privateKey || !subject) return "retry";
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    await webpush.sendNotification(device.subscription, JSON.stringify({
      title: event.title,
      body: event.body,
      tag: event.id,
      url: "/",
      event,
    }), { TTL: PUSH_TTL_SECONDS });
    return "sent";
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    const disposition = pushFailureDisposition(statusCode);
    if (disposition === "expired") return disposition;
    console.warn("[push-monitor] Delivery failed:", statusCode ?? "unknown status");
    return disposition;
  }
}

async function monitorPushAlerts() {
  const pushConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);

  const store = pushStore();
  const { blobs } = await store.list({ prefix: PUSH_STORE_PREFIX });
  const devices: Array<{ key: string; record: PushDevice }> = [];
  for (const blob of blobs) {
    try {
      const record = await store.get(blob.key, { type: "json" }) as PushDevice | null;
      if (record && (record.alerts?.length || record.trades?.length || record.pendingDeliveries?.length)) {
        devices.push({ key: blob.key, record });
      }
    } catch (error) {
      console.warn("[push-monitor] Could not read a device record:", blob.key, error instanceof Error ? error.message : "unknown error");
    }
  }
  if (devices.length === 0) return new Response("No active push alerts");

  const levels = devices.flatMap(({ record }) => [...record.alerts, ...record.trades]);
  const derivSymbols = [...new Set(levels.map((level) => level.derivSymbol).filter((symbol): symbol is string => !!symbol))];
  const derivPrices = await getDerivPrices(derivSymbols);
  const uniqueHttp = new Map<string, BackgroundLevel>();
  for (const level of levels) {
    const key = marketKey(level);
    if (key && !key.startsWith("deriv:") && !uniqueHttp.has(key)) uniqueHttp.set(key, level);
  }
  const httpPrices = new Map<string, number>();
  await Promise.all([...uniqueHttp.entries()].map(async ([key, level]) => {
    const price = await getHttpPrice(level);
    if (price) httpPrices.set(key, price);
  }));
  const currentPrice = (level: BackgroundLevel) => {
    const key = marketKey(level);
    if (!key) return null;
    const price = key.startsWith("deriv:") ? derivPrices.get(key.slice(6)) : httpPrices.get(key);
    return isPrice(price) ? price : null;
  };

  let triggered = 0;
  for (const { key, record } of devices) {
    const events: PushEvent[] = [];
    const nextAlerts: BackgroundLevel[] = [];
    const nextTrades: BackgroundLevel[] = [];
    const previousPrices = { ...record.previousPrices };
    for (const alert of record.alerts) {
      const key = marketKey(alert);
      const price = currentPrice(alert);
      const previous = key ? previousPrices[key] : undefined;
      const crossed = price && previous != null && alert.price != null && alert.direction
        ? alert.direction === "above" ? previous < alert.price && price >= alert.price : previous > alert.price && price <= alert.price
        : false;
      if (crossed && price != null) {
        events.push({
          id: crypto.randomUUID(), type: "alert", symbolId: alert.symbolId, symbolLabel: alert.symbolLabel,
          alertId: alert.id, price, timestamp: Date.now(), title: `Lotwise alert: ${alert.symbolLabel}`,
          body: `${alert.symbolLabel} crossed ${alert.direction} ${alert.price}${alert.label ? `: ${alert.label}` : ""}`,
        });
      } else {
        nextAlerts.push(alert);
      }
    }
    for (const trade of record.trades) {
      const key = marketKey(trade);
      const price = currentPrice(trade);
      const previous = key ? previousPrices[key] : undefined;
      const isLong = trade.entry != null && trade.stopLoss != null && trade.takeProfit != null && trade.stopLoss < trade.entry && trade.takeProfit > trade.entry;
      const isShort = trade.entry != null && trade.stopLoss != null && trade.takeProfit != null && trade.stopLoss > trade.entry && trade.takeProfit < trade.entry;
      const lossHit = !!price && previous != null && trade.stopLoss != null && (isLong ? previous > trade.stopLoss && price <= trade.stopLoss : isShort && previous < trade.stopLoss && price >= trade.stopLoss);
      const winHit = !!price && previous != null && trade.takeProfit != null && (isLong ? previous < trade.takeProfit && price >= trade.takeProfit : isShort && previous > trade.takeProfit && price <= trade.takeProfit);
      if (price && (lossHit || winHit)) {
        const outcome = lossHit ? "loss" : "win";
        const pnl = outcome === "win" ? trade.actualProfit : -(trade.actualLoss ?? 0);
        events.push({
          id: crypto.randomUUID(), type: outcome, symbolId: trade.symbolId, symbolLabel: trade.symbolLabel,
          tradeId: trade.id, price, timestamp: Date.now(), realizedPnL: pnl,
          title: `${outcome === "win" ? "Take profit hit" : "Stop loss hit"}: ${trade.symbolLabel}`,
          body: `${outcome === "win" ? "WIN" : "LOSS"} at ${price}`,
        });
      } else {
        nextTrades.push(trade);
      }
    }

    if (pushConfigured && record.subscription && (events.length > 0 || record.pendingDeliveries?.length)) {
      const deliveries = [
        ...(record.pendingDeliveries ?? []),
        ...events.map((event) => ({ event, attempts: 0 })),
      ];
      const results = await Promise.all(deliveries.map(async (delivery) => ({
        delivery,
        result: await sendEvent(record, delivery.event),
      })));
      if (results.some(({ result }) => result === "expired")) {
        // Keep server-side monitoring and the journal event. The page will
        // provide a fresh subscription next time it opens.
        record.subscription = undefined;
        record.pendingDeliveries = [];
        record.pendingEvents = [...(record.pendingEvents ?? []), ...events].slice(-100);
        record.alerts = nextAlerts;
        record.trades = nextTrades;
        for (const level of [...nextAlerts, ...nextTrades]) {
          const priceKey = marketKey(level);
          const price = currentPrice(level);
          if (priceKey && price) record.previousPrices[priceKey] = price;
        }
        record.updatedAt = Date.now();
        await store.setJSON(key, record);
        continue;
      }
      const retryDeliveries = results.flatMap(({ delivery, result }) =>
        result === "retry" ? [{ event: delivery.event, attempts: delivery.attempts + 1 }] : []
      );
      record.pendingDeliveries = retryDeliveries.slice(-100);
      const deliveredCount = results.filter(({ result }) => result === "sent").length;
      triggered += deliveredCount;
    } else {
      // Do not strand a delivery queue when push is temporarily unavailable.
      // The outcome itself remains available in pendingEvents for journal sync.
      record.pendingDeliveries = [];
    }
    // Keep outcomes available to the app even when push is temporarily
    // unavailable or this device's subscription has expired.
    record.pendingEvents = [...(record.pendingEvents ?? []), ...events].slice(-100);
    record.alerts = nextAlerts;
    record.trades = nextTrades;
    for (const level of [...nextAlerts, ...nextTrades]) {
      const priceKey = marketKey(level);
      const price = currentPrice(level);
      if (priceKey && price) record.previousPrices[priceKey] = price;
    }
    record.updatedAt = Date.now();
    await store.setJSON(key, record);
  }
  return Response.json({ monitoredDevices: devices.length, triggered });
}

export default monitorPushAlerts;

export const config: Config = {
  schedule: "* * * * *",
};

