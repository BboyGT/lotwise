"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playAlarmSound, type AlarmSoundType } from "@/lib/sound-engine";
import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertStatus = "active" | "triggered" | "dismissed";

export interface PriceAlert {
  id: string;
  symbolId: string;
  symbolLabel: string;
  assetClass: string;
  price: number;          // target price
  direction: "above" | "below"; // trigger when price crosses above/below this
  label?: string;         // user note
  createdAt: number;
  triggeredAt?: number;
  status: AlertStatus;
  type: AlarmSoundType;   // sound to play when triggered
}

export interface AlarmSettings {
  enabled: boolean;
  notifyEntry: boolean;
  notifySL: boolean;
  notifyTP: boolean;
  volume: number;          // 0..1
  browserNotifications: boolean;
}

export interface ActiveTradeLevels {
  symbolId: string;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export function didCrossPriceLevel(
  previous: number | undefined,
  current: number,
  target: number,
  direction: "above" | "below"
): boolean {
  if (previous == null || ![previous, current, target].every(Number.isFinite)) return false;
  return direction === "above"
    ? previous < target && current >= target
    : previous > target && current <= target;
}

// ---------------------------------------------------------------------------
// Event emission
// ---------------------------------------------------------------------------

export interface AlarmEvent {
  id: string;
  type: AlarmSoundType;
  symbolLabel: string;
  message: string;
  timestamp: number;
  price?: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const ALERTS_KEY = "lotwise.alerts.v1";
const ALARM_SETTINGS_KEY = "lotwise.alarm-settings.v1";

const DEFAULT_SETTINGS: AlarmSettings = {
  enabled: true,
  notifyEntry: true,
  notifySL: true,
  notifyTP: true,
  volume: 0.6,
  browserNotifications: true,
};

export function useAlarmManager(
  currentSymbolId: string,
  currentPrice: number | null,
  currentPriceIsLive: boolean,
  currentSymbolLabel: string,
  tradeLevels: ActiveTradeLevels | null
) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [settings, setSettings] = useState<AlarmSettings>(DEFAULT_SETTINGS);
  const [events, setEvents] = useState<AlarmEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  // Refs for use inside callbacks without re-subscribing
  const settingsRef = useRef<AlarmSettings>(DEFAULT_SETTINGS);
  const firedTradeLevelsRef = useRef<Set<string>>(new Set());
  const activeTradeLevelsKeyRef = useRef("");
  const previousPriceRef = useRef(new Map<string, number>());
  const lastWatchedSymbolRef = useRef(currentSymbolId);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // A symbol may have changed while the user was viewing another market.
  // Start with a fresh baseline on return so an old quote cannot produce a
  // false crossing notification when the current live feed reconnects.
  useEffect(() => {
    if (lastWatchedSymbolRef.current !== currentSymbolId) {
      previousPriceRef.current.clear();
      lastWatchedSymbolRef.current = currentSymbolId;
    }
  }, [currentSymbolId]);

  // ----- load persisted state -----
  useEffect(() => {
    try {
      const savedAlerts = localStorage.getItem(ALERTS_KEY);
      if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
      const savedSettings = localStorage.getItem(ALARM_SETTINGS_KEY);
      if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  // ----- persist alerts -----
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }, [alerts, hydrated]);

  // ----- persist settings -----
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(ALARM_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  // ----- request notification permission -----
  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
      return "unsupported" as const;
    }
    if (Notification.permission === "granted") {
      setPermission("granted");
      return "granted" as const;
    }
    if (Notification.permission === "denied") {
      setPermission("denied");
      return "denied" as const;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  // ----- emit event helper -----
  const emitEvent = useCallback(
    (type: AlarmSoundType, message: string, price?: number) => {
      const event: AlarmEvent = {
        id: crypto.randomUUID(),
        type,
        symbolLabel: currentSymbolLabel,
        message,
        timestamp: Date.now(),
        price,
      };
      setEvents((prev) => [event, ...prev].slice(0, 50));

      const icon = type === "takeProfit" ? "📈" : type === "stopLoss" ? "🛑" : type === "entry" ? "🎯" : "🔔";
      const isPageVisible = typeof document !== "undefined" && document.visibilityState === "visible";
      if (isPageVisible) {
        toast({
          title: `${icon} ${currentSymbolLabel} alert`,
          description: message,
          duration: 8000,
          variant: type === "stopLoss" || type === "error" ? "destructive" : "default",
        });
      }

      // Play sound if enabled
      const s = settingsRef.current;
      if (s.enabled) {
        const shouldPlay =
          (type === "entry" && s.notifyEntry) ||
          (type === "stopLoss" && s.notifySL) ||
          (type === "takeProfit" && s.notifyTP) ||
          type === "custom" ||
          type === "error";
        if (shouldPlay) {
          playAlarmSound(type, s.volume).catch(() => {});
        }
      }

      // Service worker notifications also work when the installed app is in the background.
      if (
        !isPageVisible &&
        s.browserNotifications &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        const options = { body: message, tag: event.id, icon: "/icon-192.png" };
        if ("serviceWorker" in navigator) {
          void navigator.serviceWorker.getRegistration()
            .then((registration) => registration?.showNotification(`${icon} Lotwise Alert: ${currentSymbolLabel}`, options))
            .catch(() => {});
        } else {
          try { new Notification(`${icon} Lotwise Alert: ${currentSymbolLabel}`, options); } catch {}
        }
      }
    },
    [currentSymbolLabel]
  );

  const tradeLevelsKey = tradeLevels
    ? `${tradeLevels.symbolId}:${tradeLevels.entry ?? ""}:${tradeLevels.stopLoss ?? ""}:${tradeLevels.takeProfit ?? ""}`
    : "";

  // Treat a changed calculator setup as a new set of alert levels. Without
  // this reset, reusing a price level later in the same session stays muted.
  useEffect(() => {
    if (activeTradeLevelsKeyRef.current === tradeLevelsKey) return;
    activeTradeLevelsKeyRef.current = tradeLevelsKey;
    firedTradeLevelsRef.current.clear();
    if (currentPriceIsLive && currentPrice != null && currentPrice > 0) {
      previousPriceRef.current.set(currentSymbolId, currentPrice);
    } else {
      previousPriceRef.current.delete(currentSymbolId);
    }
  }, [tradeLevelsKey, currentSymbolId, currentPrice, currentPriceIsLive]);

  // ----- watch current price for trade level hits (entry/SL/TP) -----
  useEffect(() => {
    if (!currentPrice || currentPrice <= 0) return;
    if (!currentPriceIsLive) return;
    const previousPrice = previousPriceRef.current.get(currentSymbolId);
    if (!tradeLevels) return;
    if (tradeLevels.symbolId !== currentSymbolId) return;

    const s = settingsRef.current;
    if (!s.enabled) return;

    const levels = tradeLevels;
    const key = (lvl: number | undefined) => `${currentSymbolId}:${lvl}`;

    // ENTRY hit detection
    if (levels.entry != null && levels.entry > 0) {
      const k = `entry:${key(levels.entry)}`;
      const hit = didCrossPriceLevel(previousPrice, currentPrice, levels.entry, "above") ||
        didCrossPriceLevel(previousPrice, currentPrice, levels.entry, "below");
      if (hit && !firedTradeLevelsRef.current.has(k) && s.notifyEntry) {
        const price = currentPrice;
        setTimeout(() => emitEvent("entry", `Entry level reached at ${price}`, price), 0);
        firedTradeLevelsRef.current.add(k);
      }
    }

    // SL hit detection → auto-mark trade as loss
    if (levels.stopLoss != null && levels.stopLoss > 0) {
      const k = `sl:${key(levels.stopLoss)}`;
      const isLong = levels.entry != null && levels.stopLoss < levels.entry;
      const hit = didCrossPriceLevel(previousPrice, currentPrice, levels.stopLoss, isLong ? "below" : "above");
      if (hit && !firedTradeLevelsRef.current.has(k) && s.notifySL) {
        const price = currentPrice;
        setTimeout(() => emitEvent("stopLoss", `Stop loss triggered at ${price}`, price), 0);
        firedTradeLevelsRef.current.add(k);
      }
    }

    // TP hit detection → auto-mark trade as win
    if (levels.takeProfit != null && levels.takeProfit > 0) {
      const k = `tp:${key(levels.takeProfit)}`;
      const isLong = levels.entry != null && levels.takeProfit > levels.entry;
      const hit = didCrossPriceLevel(previousPrice, currentPrice, levels.takeProfit, isLong ? "above" : "below");
      if (hit && !firedTradeLevelsRef.current.has(k) && s.notifyTP) {
        const price = currentPrice;
        setTimeout(() => emitEvent("takeProfit", `Take profit reached at ${price}`, price), 0);
        firedTradeLevelsRef.current.add(k);
      }
    }
  }, [currentPrice, currentPriceIsLive, tradeLevels, currentSymbolId, emitEvent]);

  // ----- watch current price for custom alerts -----
  useEffect(() => {
    if (!currentPrice || currentPrice <= 0) return;
    if (!currentPriceIsLive) return;
    if (!settingsRef.current.enabled) return;
    const previousPrice = previousPriceRef.current.get(currentSymbolId);
    if (previousPrice == null) return;

    const activeAlerts = alerts.filter(
      (a) =>
        a.status === "active" &&
        a.symbolId === currentSymbolId
    );

    for (const alert of activeAlerts) {
      const hit = didCrossPriceLevel(previousPrice, currentPrice, alert.price, alert.direction);
      if (hit) {
        // Mark alert as triggered
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alert.id
              ? { ...a, status: "triggered", triggeredAt: Date.now() }
              : a
          )
        );
        const directionLabel =
          alert.direction === "above" ? "crossed above" : "crossed below";
        const price = currentPrice;
        const label = currentSymbolLabel;
        const alertType = alert.type || "custom";
        const alertLabel = alert.label;
        const alertPrice = alert.price;
        setTimeout(
          () =>
            emitEvent(
              alertType,
              `${label} ${directionLabel} ${alertPrice}${alertLabel ? `: ${alertLabel}` : ""}`,
              price
            ),
          0
        );
      }
    }
  }, [alerts, currentPrice, currentPriceIsLive, currentSymbolId, currentSymbolLabel, emitEvent]);

  // Both watchers read the previous tick before it is advanced here.
  useEffect(() => {
    if (currentPriceIsLive && currentPrice != null && currentPrice > 0) previousPriceRef.current.set(currentSymbolId, currentPrice);
  }, [currentPrice, currentPriceIsLive, currentSymbolId]);

  // ----- API: add custom price alert -----
  const addAlert = useCallback(
    (params: {
      symbolId: string;
      symbolLabel: string;
      assetClass: string;
      price: number;
      direction: "above" | "below";
      label?: string;
      type?: AlarmSoundType;
    }) => {
      const alert: PriceAlert = {
        id: crypto.randomUUID(),
        symbolId: params.symbolId,
        symbolLabel: params.symbolLabel,
        assetClass: params.assetClass,
        price: params.price,
        direction: params.direction,
        label: params.label,
        createdAt: Date.now(),
        status: "active",
        type: params.type || "custom",
      };
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    },
    []
  );

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearTriggeredAlerts = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => a.status !== "triggered"));
  }, []);

  const reactivateAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "active", triggeredAt: undefined } : a
      )
    );
  }, []);

  const markAlertTriggered = useCallback((id: string) => {
    setAlerts((prev) => prev.map((alert) => alert.id === id && alert.status === "active"
      ? { ...alert, status: "triggered", triggeredAt: Date.now() }
      : alert));
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    alerts,
    setAlerts,
    settings,
    setSettings,
    events,
    permission,
    requestNotificationPermission,
    addAlert,
    removeAlert,
    clearTriggeredAlerts,
    reactivateAlert,
    markAlertTriggered,
    clearEvents,
  };
}
