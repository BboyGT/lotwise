"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playAlarmSound, type AlarmSoundType } from "@/lib/sound-engine";

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
  currentSymbolLabel: string,
  tradeLevels: ActiveTradeLevels | null
) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [settings, setSettings] = useState<AlarmSettings>(DEFAULT_SETTINGS);
  const [events, setEvents] = useState<AlarmEvent[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  // Refs for use inside callbacks without re-subscribing
  const alertsRef = useRef<PriceAlert[]>([]);
  const settingsRef = useRef<AlarmSettings>(DEFAULT_SETTINGS);
  const tradeLevelsRef = useRef<ActiveTradeLevels | null>(null);
  const firedTradeLevelsRef = useRef<Set<string>>(new Set()); // dedupe: don't re-fire same level until price moves away

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    tradeLevelsRef.current = tradeLevels;
  }, [tradeLevels]);

  // ----- load persisted state -----
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const savedAlerts = localStorage.getItem(ALERTS_KEY);
      if (savedAlerts) setAlerts(JSON.parse(savedAlerts));
      const savedSettings = localStorage.getItem(ALARM_SETTINGS_KEY);
      if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    } catch {
      // ignore
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ----- persist alerts -----
  useEffect(() => {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }, [alerts]);

  // ----- persist settings -----
  useEffect(() => {
    localStorage.setItem(ALARM_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

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

      // Browser notification
      if (s.browserNotifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const icon = type === "takeProfit" ? "📈" : type === "stopLoss" ? "🛑" : type === "entry" ? "🎯" : "🔔";
          new Notification(`${icon} Lotwise Alert — ${currentSymbolLabel}`, {
            body: message,
            tag: event.id,
            // No icon URL — browser will use default
          });
        } catch {
          // ignore
        }
      }
    },
    [currentSymbolLabel]
  );

  // ----- watch current price for trade level hits (entry/SL/TP) -----
  useEffect(() => {
    if (!currentPrice || currentPrice <= 0) return;
    if (!tradeLevels) return;
    if (tradeLevels.symbolId !== currentSymbolId) return;

    const s = settingsRef.current;
    if (!s.enabled) return;

    const levels = tradeLevels;
    const key = (lvl: number | undefined) =>
      `${currentSymbolId}:${currentPrice.toFixed(4)}:${lvl}`;

    // ENTRY hit detection
    if (levels.entry != null && levels.entry > 0) {
      const k = `entry:${key(levels.entry)}`;
      const tolerance = levels.entry * 0.0001; // 1bp tolerance
      const hit = Math.abs(currentPrice - levels.entry) <= tolerance;
      if (hit && !firedTradeLevelsRef.current.has(k) && s.notifyEntry) {
        const price = currentPrice;
        setTimeout(() => emitEvent("entry", `Entry level reached at ${price}`, price), 0);
        firedTradeLevelsRef.current.add(k);
      }
    }

    // SL hit detection
    if (levels.stopLoss != null && levels.stopLoss > 0) {
      const k = `sl:${key(levels.stopLoss)}`;
      const tolerance = levels.stopLoss * 0.0001;
      const hit = Math.abs(currentPrice - levels.stopLoss) <= tolerance;
      if (hit && !firedTradeLevelsRef.current.has(k) && s.notifySL) {
        const price = currentPrice;
        setTimeout(() => emitEvent("stopLoss", `Stop loss triggered at ${price}`, price), 0);
        firedTradeLevelsRef.current.add(k);
      }
    }

    // TP hit detection
    if (levels.takeProfit != null && levels.takeProfit > 0) {
      const k = `tp:${key(levels.takeProfit)}`;
      const tolerance = levels.takeProfit * 0.0001;
      const hit = Math.abs(currentPrice - levels.takeProfit) <= tolerance;
      if (hit && !firedTradeLevelsRef.current.has(k) && s.notifyTP) {
        const price = currentPrice;
        setTimeout(() => emitEvent("takeProfit", `Take profit reached at ${price}`, price), 0);
        firedTradeLevelsRef.current.add(k);
      }
    }
  }, [currentPrice, tradeLevels, currentSymbolId]);

  // ----- watch current price for custom alerts -----
  useEffect(() => {
    if (!currentPrice || currentPrice <= 0) return;

    const activeAlerts = alertsRef.current.filter(
      (a) =>
        a.status === "active" &&
        a.symbolId === currentSymbolId
    );

    for (const alert of activeAlerts) {
      const tolerance = alert.price * 0.0001;
      let hit = false;
      if (alert.direction === "above" && currentPrice >= alert.price - tolerance) {
        hit = true;
      } else if (alert.direction === "below" && currentPrice <= alert.price + tolerance) {
        hit = true;
      }
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
              `${label} ${directionLabel} ${alertPrice}${alertLabel ? ` — ${alertLabel}` : ""}`,
              price
            ),
          0
        );
      }
    }
  }, [currentPrice, currentSymbolId]);

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

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    alerts,
    settings,
    setSettings,
    events,
    permission,
    requestNotificationPermission,
    addAlert,
    removeAlert,
    clearTriggeredAlerts,
    reactivateAlert,
    clearEvents,
  };
}
