"use client";

import { useState, useEffect } from "react";
import { Bell, BellRing, Plus, Trash2, X, Volume2, VolumeX, Check, RotateCcw, Settings, AlertTriangle, ArrowUp, ArrowDown, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAlarmManager } from "@/hooks/use-alarm-manager";
import { testSound, primeAudioContext } from "@/lib/sound-engine";
import { formatPrice } from "@/lib/calculator";

interface AlarmPanelProps {
  open: boolean;
  onClose: () => void;
  currentSymbolId: string;
  currentSymbolLabel: string;
  currentSymbolAssetClass: string;
  currentPrice: number | null;
  currentSymbolDecimals: number;
  tradeLevels: {
    symbolId: string;
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
  } | null;
  onOutcome?: (symbolId: string, outcome: "win" | "loss", price: number) => void;
}

export function AlarmPanel({
  open,
  onClose,
  currentSymbolId,
  currentSymbolLabel,
  currentSymbolAssetClass,
  currentPrice,
  currentSymbolDecimals,
  tradeLevels,
  onOutcome,
}: AlarmPanelProps) {
  const manager = useAlarmManager(
    currentSymbolId,
    currentPrice,
    currentSymbolLabel,
    tradeLevels,
    onOutcome
  );

  const [newAlertPrice, setNewAlertPrice] = useState("");
  const [newAlertDirection, setNewAlertDirection] = useState<"above" | "below">("above");
  const [newAlertLabel, setNewAlertLabel] = useState("");

  // Sync active alerts + trades to service worker for background monitoring
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Sync alerts
    const activeAlerts = manager.alerts
      .filter((a) => a.status === "active")
      .map((a) => ({
        id: a.id,
        symbolLabel: a.symbolLabel,
        targetPrice: a.price,
        direction: a.direction,
        type: a.type,
        label: a.label,
      }));
    navigator.serviceWorker?.controller?.postMessage({
      type: "SYNC_ALERTS",
      alerts: activeAlerts,
    });

    // Sync trades with SL/TP for background monitoring
    // The parent component needs to pass trade data — we use a global window property
    // set by the page when trades are saved
    const trades = (window as unknown as { __lotwiseTrades?: unknown[] }).__lotwiseTrades || [];
    if (trades.length > 0) {
      navigator.serviceWorker?.controller?.postMessage({
        type: "SYNC_TRADES",
        trades,
      });
    }
  }, [manager.alerts]);

  if (!open) return null;

  function handleAddAlert() {
    const p = parseFloat(newAlertPrice);
    if (!p || p <= 0) {
      alert("Enter a valid price");
      return;
    }
    manager.addAlert({
      symbolId: currentSymbolId,
      symbolLabel: currentSymbolLabel,
      assetClass: currentSymbolAssetClass,
      price: p,
      direction: newAlertDirection,
      label: newAlertLabel.trim() || undefined,
    });
    setNewAlertPrice("");
    setNewAlertLabel("");
  }

  function handleEnableNotifications() {
    primeAudioContext();
    manager.requestNotificationPermission();
  }

  async function handleTestSound(type: "entry" | "stopLoss" | "takeProfit" | "custom") {
    primeAudioContext();
    await testSound(type);

    // Also fire a real notification so the user can preview what an actual
    // alarm will look like when a price level is hit.
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      const icon = type === "takeProfit" ? "📈" : type === "stopLoss" ? "🛑" : type === "entry" ? "🎯" : "🔔";
      const title =
        type === "entry" ? "Entry level reached" :
        type === "stopLoss" ? "Stop loss triggered" :
        type === "takeProfit" ? "Take profit hit" :
        "Price alert triggered";
      const body =
        type === "entry"
          ? `BTC/USD reached your entry price — ready to enter`
          : type === "stopLoss"
          ? `BTC/USD hit your stop loss — position closed at a loss`
          : type === "takeProfit"
          ? `BTC/USD hit your take profit — position closed in profit`
          : `BTC/USD crossed your alert price`;
      try {
        new Notification(`${icon} Lotwise — ${title}`, {
          body,
          tag: `preview-${type}-${Date.now()}`,
        });
      } catch {
        // some browsers block notifications without interaction
      }
    }
  }

  const activeAlerts = manager.alerts.filter((a) => a.status === "active");
  const triggeredAlerts = manager.alerts.filter((a) => a.status === "triggered");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg max-h-[92vh] bg-[#0a0f1a] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-mono uppercase tracking-wider text-white font-bold">
              Alarms &amp; Alerts
            </h2>
            {manager.events.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">
                {manager.events.length} events
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rm-scroll">
          <Tabs defaultValue="alerts" className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-black/40 border border-white/5 h-auto rounded-none border-x-0 border-t-0">
              <TabsTrigger value="alerts" className="py-2 text-[10px] font-mono uppercase tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300">
                Alerts
                <span className="ml-1 text-[9px] opacity-60">({activeAlerts.length})</span>
              </TabsTrigger>
              <TabsTrigger value="add" className="py-2 text-[10px] font-mono uppercase tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </TabsTrigger>
              <TabsTrigger value="settings" className="py-2 text-[10px] font-mono uppercase tracking-wider data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300">
                <Settings className="h-3 w-3 mr-1" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* ---------- Alerts list ---------- */}
            <TabsContent value="alerts" className="p-4 space-y-4 mt-0">
              {/* Active alerts */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Active alerts for {currentSymbolLabel}
                </p>
                {activeAlerts.filter(a => a.symbolId === currentSymbolId).length === 0 ? (
                  <p className="text-xs font-mono text-slate-600 py-4 text-center">
                    No active alerts for this symbol.
                  </p>
                ) : (
                  activeAlerts.filter(a => a.symbolId === currentSymbolId).map((a) => (
                    <AlertRow
                      key={a.id}
                      alert={a}
                      onRemove={() => manager.removeAlert(a.id)}
                      decimals={currentSymbolDecimals}
                    />
                  ))
                )}
                {/* Other symbols' alerts */}
                {activeAlerts.filter(a => a.symbolId !== currentSymbolId).length > 0 && (
                  <>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-600 mt-3">
                      Other symbols
                    </p>
                    {activeAlerts.filter(a => a.symbolId !== currentSymbolId).map((a) => (
                      <AlertRow
                        key={a.id}
                        alert={a}
                        onRemove={() => manager.removeAlert(a.id)}
                        decimals={currentSymbolDecimals}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Triggered alerts */}
              {triggeredAlerts.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      Recently triggered
                    </p>
                    <button
                      onClick={manager.clearTriggeredAlerts}
                      className="text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase tracking-wider"
                    >
                      Clear
                    </button>
                  </div>
                  {triggeredAlerts.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-emerald-500/15 bg-emerald-500/[0.04] p-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span className="font-mono text-xs text-slate-300 truncate">
                            {a.symbolLabel} {a.direction === "above" ? "↑" : "↓"} {formatPrice(a.price, currentSymbolDecimals)}
                          </span>
                        </div>
                        {a.triggeredAt && (
                          <p className="text-[10px] font-mono text-slate-600 ml-5 mt-0.5">
                            {new Date(a.triggeredAt).toLocaleTimeString()}
                            {a.label && ` · ${a.label}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => manager.reactivateAlert(a.id)}
                        className="text-[10px] font-mono text-amber-400 hover:text-amber-300 uppercase tracking-wider shrink-0 flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reactivate
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent events */}
              {manager.events.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-white/5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Recent events
                  </p>
                  {manager.events.slice(0, 8).map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2 text-xs font-mono">
                      <span className={`rm-pulse-dot mt-1 ${
                        ev.type === "stopLoss" ? "bg-rose-400" :
                        ev.type === "takeProfit" ? "bg-emerald-400" :
                        ev.type === "entry" ? "bg-cyan-400" : "bg-amber-400"
                      }`} style={{ width: 6, height: 6 }} />
                      <div className="min-w-0 flex-1">
                        <span className="text-slate-300">{ev.message}</span>
                        <span className="text-slate-600 ml-2">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={manager.clearEvents}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase tracking-wider"
                  >
                    Clear events
                  </button>
                </div>
              )}
            </TabsContent>

            {/* ---------- Add alert ---------- */}
            <TabsContent value="add" className="p-4 space-y-4 mt-0">
              <div className="rounded-md border border-amber-500/15 bg-amber-500/[0.04] p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80 mb-1">
                  Add price alert for
                </p>
                <p className="text-sm font-mono text-white font-semibold">
                  {currentSymbolLabel}
                  {currentPrice != null && (
                    <span className="text-[10px] text-slate-500 ml-2 font-normal">
                      · current: {formatPrice(currentPrice, currentSymbolDecimals)}
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Target price
                </Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={newAlertPrice}
                  onChange={(e) => setNewAlertPrice(e.target.value)}
                  className="bg-black/40 border-white/10 text-white font-mono tabular-nums focus-visible:border-amber-500/40"
                />
                {currentPrice != null && newAlertPrice && (
                  <p className="text-[10px] font-mono text-slate-500">
                    {parseFloat(newAlertPrice) > currentPrice
                      ? `${((parseFloat(newAlertPrice) / currentPrice - 1) * 100).toFixed(2)}% above current`
                      : parseFloat(newAlertPrice) < currentPrice
                      ? `${((1 - parseFloat(newAlertPrice) / currentPrice) * 100).toFixed(2)}% below current`
                      : "Same as current"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Trigger direction
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAlertDirection("above")}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-md border text-xs font-mono uppercase tracking-wider transition-colors ${
                      newAlertDirection === "above"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-black/40 text-slate-500 border-white/5 hover:bg-white/5"
                    }`}
                  >
                    <ArrowUp className="h-3 w-3" />
                    Crosses above
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAlertDirection("below")}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-md border text-xs font-mono uppercase tracking-wider transition-colors ${
                      newAlertDirection === "below"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : "bg-black/40 text-slate-500 border-white/5 hover:bg-white/5"
                    }`}
                  >
                    <ArrowDown className="h-3 w-3" />
                    Crosses below
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Label (optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. breakout, support, etc."
                  value={newAlertLabel}
                  onChange={(e) => setNewAlertLabel(e.target.value)}
                  maxLength={50}
                  className="bg-black/40 border-white/10 text-white font-mono focus-visible:border-amber-500/40"
                />
              </div>

              <Button
                onClick={handleAddAlert}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono uppercase tracking-wider text-xs font-bold"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create alert
              </Button>
            </TabsContent>

            {/* ---------- Settings ---------- */}
            <TabsContent value="settings" className="p-4 space-y-5 mt-0">
              {/* Master toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {manager.settings.enabled ? (
                    <BellRing className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Bell className="h-4 w-4 text-slate-600" />
                  )}
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-white">
                      Alarm system
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      {manager.settings.enabled ? "Active" : "Disabled"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={manager.settings.enabled}
                  onCheckedChange={(v) =>
                    manager.setSettings({ ...manager.settings, enabled: v })
                  }
                />
              </div>

              <div className="border-t border-white/5" />

              {/* Per-event toggles */}
              <div className="space-y-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Notification types
                </p>
                <ToggleRow
                  icon={<Target className="h-3 w-3 text-cyan-400" />}
                  label="Entry hit"
                  description="Price reaches your entry level"
                  checked={manager.settings.notifyEntry}
                  onChange={(v) =>
                    manager.setSettings({ ...manager.settings, notifyEntry: v })
                  }
                  onTest={() => handleTestSound("entry")}
                />
                <ToggleRow
                  icon={<AlertTriangle className="h-3 w-3 text-rose-400" />}
                  label="Stop loss hit"
                  description="Price reaches your SL level"
                  checked={manager.settings.notifySL}
                  onChange={(v) =>
                    manager.setSettings({ ...manager.settings, notifySL: v })
                  }
                  onTest={() => handleTestSound("stopLoss")}
                />
                <ToggleRow
                  icon={<Target className="h-3 w-3 text-emerald-400" />}
                  label="Take profit hit"
                  description="Price reaches your TP level"
                  checked={manager.settings.notifyTP}
                  onChange={(v) =>
                    manager.setSettings({ ...manager.settings, notifyTP: v })
                  }
                  onTest={() => handleTestSound("takeProfit")}
                />
                <ToggleRow
                  icon={<Bell className="h-3 w-3 text-amber-400" />}
                  label="Custom price alerts"
                  description="User-defined price triggers"
                  checked={true}
                  onChange={() => {
                    /* always on — alerts are user-initiated */
                  }}
                  onTest={() => handleTestSound("custom")}
                  disabled
                />
              </div>

              <div className="border-t border-white/5" />

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {manager.settings.volume > 0 ? (
                      <Volume2 className="h-3 w-3 text-amber-400" />
                    ) : (
                      <VolumeX className="h-3 w-3 text-slate-500" />
                    )}
                    <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      Volume
                    </Label>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">
                    {Math.round(manager.settings.volume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[manager.settings.volume * 100]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(v) =>
                    manager.setSettings({ ...manager.settings, volume: v[0] / 100 })
                  }
                />
              </div>

              <div className="border-t border-white/5" />

              {/* Browser notifications */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-white">
                      Browser notifications
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      Status:{" "}
                      {manager.permission === "granted"
                        ? "✓ Enabled"
                        : manager.permission === "denied"
                        ? "✗ Blocked"
                        : manager.permission === "unsupported"
                        ? "Unsupported"
                        : "Not asked yet"}
                    </p>
                  </div>
                  <Switch
                    checked={manager.settings.browserNotifications}
                    onCheckedChange={(v) => {
                      manager.setSettings({ ...manager.settings, browserNotifications: v });
                      if (v && manager.permission !== "granted") {
                        handleEnableNotifications();
                      }
                    }}
                  />
                </div>
                {manager.permission !== "granted" &&
                  manager.permission !== "unsupported" && (
                    <Button
                      onClick={handleEnableNotifications}
                      variant="outline"
                      size="sm"
                      className="w-full bg-black/40 border-white/10 text-slate-300 hover:bg-white/5 hover:text-amber-300 font-mono text-[10px] uppercase tracking-wider"
                    >
                      Enable browser notifications
                    </Button>
                  )}
              </div>

              <div className="border-t border-white/5" />

              {/* Quick reference */}
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Sound reference
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    Entry: C-E-G major triad
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    SL: A-F-C descending sawtooth
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    TP: C-E-G-C octave arpeggio
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Custom: E-A perfect fifth
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function AlertRow({
  alert,
  onRemove,
  decimals,
}: {
  alert: {
    id: string;
    symbolLabel: string;
    price: number;
    direction: "above" | "below";
    label?: string;
    createdAt: number;
  };
  onRemove: () => void;
  decimals: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-black/40 p-2.5 hover:bg-white/5 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {alert.direction === "above" ? (
            <ArrowUp className="h-3 w-3 text-emerald-400 shrink-0" />
          ) : (
            <ArrowDown className="h-3 w-3 text-rose-400 shrink-0" />
          )}
          <span className="font-mono text-xs text-white truncate">
            {alert.symbolLabel}
          </span>
          <span className="font-mono text-xs text-amber-300 tabular-nums">
            {formatPrice(alert.price, decimals)}
          </span>
        </div>
        {alert.label && (
          <p className="text-[10px] font-mono text-slate-500 ml-5 mt-0.5 truncate">
            {alert.label}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
        aria-label="Remove alert"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
  onTest,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  onTest?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-xs font-mono text-white">{label}</p>
          <p className="text-[10px] font-mono text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onTest && !disabled && (
          <button
            onClick={onTest}
            className="text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-amber-300 transition-colors"
          >
            Preview
          </button>
        )}
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}
