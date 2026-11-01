import { getStore } from "@netlify/blobs";

export const PUSH_STORE_NAME = "lotwise-push-watchlists";
export const PUSH_STORE_PREFIX = "devices/";

export interface BackgroundLevel {
  id: string;
  symbolId: string;
  symbolLabel: string;
  label?: string;
  price?: number;
  direction?: "above" | "below";
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  actualLoss?: number;
  actualProfit?: number;
  derivSymbol?: string;
  binanceSymbol?: string;
  tvScannerSymbol?: string;
}

export interface PushEvent {
  id: string;
  type: "alert" | "win" | "loss";
  symbolId: string;
  symbolLabel: string;
  alertId?: string;
  tradeId?: string;
  price: number;
  timestamp: number;
  realizedPnL?: number;
  title: string;
  body: string;
}

export interface PushDevice {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
  alerts: BackgroundLevel[];
  trades: BackgroundLevel[];
  previousPrices: Record<string, number>;
  pendingEvents: PushEvent[];
  updatedAt: number;
}

export const pushStore = () => {
  const context = process.env.CONTEXT || "local";
  const safeContext = /^[a-z0-9-]{1,20}$/i.test(context) ? context.toLowerCase() : "other";
  return getStore(`${PUSH_STORE_NAME}-${safeContext}`);
};

export async function deviceStoreKey(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${PUSH_STORE_PREFIX}${hex}`;
}

export function isDeviceToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

export function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "fcm.googleapis.com" || host.endsWith(".fcm.googleapis.com") ||
      host === "updates.push.services.mozilla.com" || host.endsWith(".push.services.mozilla.com") ||
      host === "web.push.apple.com" || host.endsWith(".notify.windows.com");
  } catch {
    return false;
  }
}

export function validLevel(value: unknown, mode: "alert" | "trade"): value is BackgroundLevel {
  if (!value || typeof value !== "object") return false;
  const level = value as Record<string, unknown>;
  if (typeof level.id !== "string" || level.id.length > 100 ||
      typeof level.symbolId !== "string" || level.symbolId.length > 100 ||
      typeof level.symbolLabel !== "string" || level.symbolLabel.length > 80) return false;
  if (![level.derivSymbol, level.binanceSymbol, level.tvScannerSymbol].some((symbol) => typeof symbol === "string")) return false;
  if (level.derivSymbol !== undefined && (typeof level.derivSymbol !== "string" || !/^[A-Za-z0-9_]{2,30}$/.test(level.derivSymbol))) return false;
  if (level.binanceSymbol !== undefined && (typeof level.binanceSymbol !== "string" || !/^[A-Z0-9]{3,25}$/.test(level.binanceSymbol))) return false;
  if (level.tvScannerSymbol !== undefined && (typeof level.tvScannerSymbol !== "string" || !/^[A-Z0-9:_-]{2,60}$/i.test(level.tvScannerSymbol))) return false;
  if (mode === "alert") {
    return typeof level.price === "number" && Number.isFinite(level.price) && level.price > 0 &&
      (level.direction === "above" || level.direction === "below") &&
      (level.label === undefined || typeof level.label === "string");
  }
  return [level.entry, level.stopLoss, level.takeProfit, level.actualLoss, level.actualProfit]
    .every((number) => typeof number === "number" && Number.isFinite(number) && number > 0);
}

export function marketKey(level: Pick<BackgroundLevel, "derivSymbol" | "binanceSymbol" | "tvScannerSymbol">): string | null {
  if (level.derivSymbol) return `deriv:${level.derivSymbol}`;
  if (level.binanceSymbol) return `binance:${level.binanceSymbol}`;
  if (level.tvScannerSymbol) return `tv:${level.tvScannerSymbol}`;
  return null;
}

