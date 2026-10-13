"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ASSET_CLASSES,
  AssetClass,
  SYMBOLS,
  SymbolSpec,
  getSymbol,
  symbolsByClass,
  groupedSymbolsByClass,
} from "@/lib/symbols";
import {
  calculateTrade,
  currencySymbol,
  formatLot,
  formatMoney,
  formatPrice,
  FX_RATES,
} from "@/lib/calculator";
import { useDerivTicks } from "@/hooks/use-deriv-ticks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  Target,
  Shield,
  Layers,
  CircleDot,
  Zap,
  Wifi,
  WifiOff,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { TradingViewWidget, TradingViewTicker } from "@/components/tradingview-widget";

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "JPY"] as const;
type CurrencyCode = (typeof CURRENCIES)[number];

interface TradeRecord {
  id: string;
  timestamp: number;
  symbolId: string;
  symbolLabel: string;
  assetClass: AssetClass;
  balance: number;
  riskPercent: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  recommendedLot: number;
  actualLoss: number;
  actualProfit: number;
  rrRatio: number;
}

const HISTORY_KEY = "riskmate.history.v1";
const SETTINGS_KEY = "riskmate.settings.v1";

export default function Home() {
  // ----- settings -----
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>("USD");

  // ----- inputs -----
  const [assetClass, setAssetClass] = useState<AssetClass>("synthetic"); // start on synthetic to showcase live Deriv feed
  const [symbolId, setSymbolId] = useState<string>("VOL75");
  const [balance, setBalance] = useState<number>(100);
  const [riskPercent, setRiskPercent] = useState<number>(10);
  const [entry, setEntry] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");

  // ----- history -----
  const [history, setHistory] = useState<TradeRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  // ----- hydrated flag for localStorage load -----
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj.displayCurrency) setDisplayCurrency(obj.displayCurrency);
        if (obj.balance) setBalance(obj.balance);
        if (obj.riskPercent) setRiskPercent(obj.riskPercent);
      }
      const hist = localStorage.getItem(HISTORY_KEY);
      if (hist) setHistory(JSON.parse(hist));
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ displayCurrency, balance, riskPercent })
    );
  }, [displayCurrency, balance, riskPercent, hydrated]);

  const symbol = useMemo(() => getSymbol(symbolId), [symbolId]);
  const symbolList = useMemo(() => symbolsByClass(assetClass), [assetClass]);
  const groupedSymbols = useMemo(
    () => groupedSymbolsByClass(assetClass),
    [assetClass]
  );

  function changeAssetClass(next: AssetClass) {
    const first = symbolsByClass(next)[0];
    setAssetClass(next);
    if (first) {
      setSymbolId(first.id);
      setEntry("");
      setStopLoss("");
      setTakeProfit("");
    }
  }

  // Live Deriv ticks for synthetic symbols (undefined for others → no-op)
  const derivTicks = useDerivTicks(symbol.derivSymbol);
  const hasLiveFeed = !!symbol.derivSymbol;

  const calc = useMemo(
    () =>
      calculateTrade({
        symbol,
        balance,
        riskPercent,
        entry: parseFloat(entry) || 0,
        stopLoss: parseFloat(stopLoss) || 0,
        takeProfit: parseFloat(takeProfit) || 0,
      }),
    [symbol, balance, riskPercent, entry, stopLoss, takeProfit]
  );

  const fxRate = FX_RATES[displayCurrency] ?? 1;

  // Unit label: forex = "pips", others = "points"
  const unitLabel = symbol.assetClass === "forex" ? "pips" : "points";

  const tickerSymbols = useMemo(
    () => [
      "FX:EURUSD",
      "FX:GBPUSD",
      "TVC:US30",
      "TVC:NAS100",
      "TVC:VIX",
      "BINANCE:BTCUSDT",
      "BINANCE:ETHUSDT",
    ],
    []
  );

  // Auto-fill entry from live Deriv tick on demand (button click)
  function useLivePriceAsEntry() {
    if (!hasLiveFeed || derivTicks.price == null) {
      // fallback: try TradingView widget — but TV doesn't expose prices
      // without their paid API. Show a hint instead.
      alert(
        "Live feed unavailable for this symbol. Look at the chart above and enter the price manually."
      );
      return;
    }
    setEntry(derivTicks.price!.toFixed(symbol.decimals));
  }

  // Quick-fill SL and TP based on entry + suggested distances
  function quickFillDistances() {
    const e = parseFloat(entry);
    if (!(e > 0)) {
      alert("Enter an entry price first.");
      return;
    }
    // Suggest 1% SL distance, 3% TP distance (1:3 R:R) as starting point
    const slDist = e * 0.01;
    const tpDist = e * 0.03;
    setStopLoss((e - slDist).toFixed(symbol.decimals));
    setTakeProfit((e + tpDist).toFixed(symbol.decimals));
  }

  function saveTrade() {
    if (!calc.valid) return;
    const record: TradeRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      symbolId: symbol.id,
      symbolLabel: symbol.label,
      assetClass: symbol.assetClass,
      balance,
      riskPercent,
      entry: parseFloat(entry),
      stopLoss: parseFloat(stopLoss),
      takeProfit: parseFloat(takeProfit),
      recommendedLot: calc.recommendedLot,
      actualLoss: calc.actualLoss,
      actualProfit: calc.actualProfit,
      rrRatio: calc.rrRatio,
    };
    const next = [record, ...history].slice(0, 20);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  function replayTrade(rec: TradeRecord) {
    setAssetClass(rec.assetClass);
    setSymbolId(rec.symbolId);
    setBalance(rec.balance);
    setRiskPercent(rec.riskPercent);
    setEntry(String(rec.entry));
    setStopLoss(String(rec.stopLoss));
    setTakeProfit(String(rec.takeProfit));
    setHistoryOpen(false);
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  // ----- R:R bar geometry -----
  // The bar runs from SL to TP. Entry sits between them.
  // We compute percentages of the full SL→TP distance.
  const rrBar = useMemo(() => {
    if (!calc.valid) return null;
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);
    const e = parseFloat(entry);
    const min = Math.min(sl, tp);
    const max = Math.max(sl, tp);
    const range = max - min || 1;
    const entryPct = ((e - min) / range) * 100;
    const slPct = ((sl - min) / range) * 100;
    const tpPct = ((tp - min) / range) * 100;
    return { entryPct, slPct, tpPct, isLong: sl < e };
  }, [calc.valid, stopLoss, takeProfit, entry]);

  // Display the converted amount (USD → display currency)
  function conv(amountUsd: number): number {
    return amountUsd / FX_RATES.USD * FX_RATES[displayCurrency];
  }

  // Format live tick price for display
  function fmtLivePrice(p: number | null): string {
    if (p == null) return "—";
    return p.toFixed(symbol.decimals);
  }

  return (
    <div className="rm-grid-bg rm-scanlines min-h-screen flex flex-col text-slate-100">
      {/* ===== Top Ticker ===== */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-sm">
        <TradingViewTicker symbols={tickerSymbols} />
      </div>

      {/* ===== Header ===== */}
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-gradient-to-br from-amber-400/90 via-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-300/20">
              <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-none">
                RISK<span className="text-amber-400">MATE</span>
                <span className="ml-2 text-[9px] uppercase tracking-[0.3em] text-slate-500 font-mono align-middle">
                  v2.0
                </span>
              </h1>
              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500 font-mono mt-0.5">
                Position Terminal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* System status */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
              <span
                className={`rm-pulse-dot ${
                  hasLiveFeed
                    ? derivTicks.connected
                      ? derivTicks.usingFallback
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                      : "bg-amber-400"
                    : "bg-cyan-400"
                }`}
                style={{ width: 6, height: 6 }}
              />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {hasLiveFeed
                  ? derivTicks.connected
                    ? derivTicks.usingFallback
                      ? "Deriv WS · SIM"
                      : "Deriv WS · Live"
                    : "Connecting…"
                  : "TV Chart Mode"}
              </span>
              {hasLiveFeed ? (
                <Wifi className="h-3 w-3 text-emerald-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-slate-500" />
              )}
            </div>
            <Select
              value={displayCurrency}
              onValueChange={(v) => setDisplayCurrency(v as CurrencyCode)}
            >
              <SelectTrigger className="w-[80px] h-8 bg-white/5 border-white/10 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {currencySymbol(c)} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-5">
        {/* Asset class tabs */}
        <Tabs
          value={assetClass}
          onValueChange={(v) => changeAssetClass(v as AssetClass)}
        >
          <TabsList className="grid grid-cols-4 w-full bg-black/40 border border-white/5 h-auto p-1">
            {ASSET_CLASSES.map((ac) => (
              <TabsTrigger
                key={ac.id}
                value={ac.id}
                className="py-2.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-300 data-[state=active]:shadow-none data-[state=active]:border data-[state=active]:border-amber-500/20 border border-transparent font-mono text-xs uppercase tracking-wider"
              >
                {ac.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Top row: Symbol picker + Live price */}
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="rm-glass border-white/5">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CircleDot className="h-3 w-3 text-amber-400" />
                Symbol
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Select value={symbolId} onValueChange={setSymbolId}>
                <SelectTrigger className="bg-black/40 border-white/10 font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80 rm-scroll">
                  {groupedSymbols.map((group) => (
                    <SelectGroup key={group.category}>
                      <SelectLabel className="text-[10px] text-amber-400/80 uppercase tracking-[0.2em] font-mono">
                        {group.category}
                      </SelectLabel>
                      {group.symbols.map((s) => (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          className="font-mono text-sm"
                        >
                          {s.label}
                          {s.derivSymbol && (
                            <Badge
                              variant="secondary"
                              className="ml-2 bg-emerald-500/10 text-emerald-400 text-[9px] font-mono px-1 py-0"
                            >
                              LIVE
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {symbol.note && (
                <p className="text-[10px] text-slate-500 font-mono mt-2 leading-relaxed">
                  {symbol.note}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Live price card */}
          <Card className="rm-glass border-white/5">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="rm-pulse-dot bg-cyan-400" style={{ width: 6, height: 6 }} />
                  Live Price
                </span>
                <span className="text-[9px] text-slate-600 font-mono">
                  {hasLiveFeed
                    ? derivTicks.usingFallback
                      ? "DERIV · SIM"
                      : "DERIV · WS"
                    : "TRADINGVIEW"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {hasLiveFeed ? (
                <div className="space-y-2">
                  <div className="flex items-end gap-3">
                    <span
                      className={`text-4xl font-bold font-mono tabular-nums tracking-tight ${
                        derivTicks.direction === "up"
                          ? "text-emerald-400 rm-flash-up"
                          : derivTicks.direction === "down"
                          ? "text-rose-400 rm-flash-down"
                          : "text-white"
                      }`}
                    >
                      {fmtLivePrice(derivTicks.price)}
                    </span>
                    {derivTicks.direction && (
                      <span
                        className={`flex items-center gap-0.5 text-sm font-mono mb-1 ${
                          derivTicks.direction === "up"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {derivTicks.direction === "up" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    <span>Symbol: <span className="text-slate-300">{symbol.derivSymbol}</span></span>
                    <span>·</span>
                    <span>
                      {derivTicks.usingFallback
                        ? "Simulated"
                        : derivTicks.isLoading
                        ? "Subscribing…"
                        : derivTicks.error
                        ? "Error"
                        : "Streaming"}
                    </span>
                  </div>
                  {derivTicks.error && (
                    <p className="text-[10px] text-rose-400 font-mono">
                      ⚠ {derivTicks.error}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl font-mono text-slate-500">—</p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    No live feed — refer to chart below
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live chart */}
        <Card className="overflow-hidden rm-glass border-white/5">
          <CardContent className="p-0">
            <TradingViewWidget
              symbol={symbol.tvSymbol}
              height={300}
              type="mini"
            />
          </CardContent>
        </Card>

        {/* Inputs row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Account & Risk */}
          <Card className="rm-glass border-white/5">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Shield className="h-3 w-3 text-amber-400" />
                Account · Risk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Balance (USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-mono text-sm">$</span>
                  <Input
                    type="number"
                    value={balance}
                    min={0}
                    step={10}
                    onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                    className="pl-7 bg-black/40 border-white/10 text-white font-mono tabular-nums focus-visible:border-amber-500/40"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  ≈ {formatMoney(conv(balance), displayCurrency)}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Risk per trade
                  </Label>
                  <span className="text-sm font-mono font-semibold text-amber-400 tabular-nums">
                    {riskPercent}%
                  </span>
                </div>
                <Slider
                  value={[riskPercent]}
                  min={0.5}
                  max={20}
                  step={0.5}
                  onValueChange={(v) => setRiskPercent(v[0])}
                  className="[&_[role=slider]]:bg-amber-400 [&_[role=slider]]:border-amber-300 [&_[role=slider]]:shadow-amber-400/40"
                />
                <Input
                  type="number"
                  value={riskPercent}
                  min={0}
                  step={0.5}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                  className="bg-black/40 border-white/10 text-white font-mono tabular-nums focus-visible:border-amber-500/40"
                />
                <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                  <span className="text-slate-500 uppercase tracking-wider">At risk:</span>
                  <span className="font-semibold text-rose-400 tabular-nums">
                    {formatMoney(conv((balance * riskPercent) / 100), displayCurrency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trade Setup */}
          <Card className="rm-glass border-white/5">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Target className="h-3 w-3 text-cyan-400" />
                Trade Setup
              </CardTitle>
              <CardDescription className="text-[10px] font-mono uppercase tracking-wider text-slate-600">
                LONG if SL &lt; entry · SHORT if SL &gt; entry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Entry
                  </Label>
                  {hasLiveFeed && derivTicks.price != null && (
                    <button
                      onClick={useLivePriceAsEntry}
                      className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
                    >
                      ↳ Use live
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={entry}
                  step="any"
                  onChange={(e) => setEntry(e.target.value)}
                  className="bg-black/40 border-white/10 text-white font-mono tabular-nums focus-visible:border-amber-500/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-rose-400/70">
                    Stop Loss
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stopLoss}
                    step="any"
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="bg-black/40 border-white/10 text-white font-mono tabular-nums focus-visible:border-rose-500/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/70">
                    Take Profit
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={takeProfit}
                    step="any"
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="bg-black/40 border-white/10 text-white font-mono tabular-nums focus-visible:border-emerald-500/40"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={useLivePriceAsEntry}
                  disabled={!hasLiveFeed || derivTicks.price == null}
                  className="flex-1 bg-black/40 border-white/10 text-slate-300 hover:bg-white/5 hover:text-emerald-300 font-mono text-[10px] uppercase tracking-wider"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Fill Live Entry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickFillDistances}
                  className="flex-1 bg-black/40 border-white/10 text-slate-300 hover:bg-white/5 hover:text-cyan-300 font-mono text-[10px] uppercase tracking-wider"
                >
                  Quick 1:3
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============== RESULT HERO ============== */}
        <Card className="rm-glass-gold overflow-hidden">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-xs font-mono uppercase tracking-[0.2em] text-amber-400/80 flex items-center gap-2">
              <Layers className="h-3 w-3" />
              Calculation Output
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!calc.valid ? (
              <Alert className="bg-amber-500/5 border-amber-500/20 text-amber-200">
                <AlertTitle className="text-amber-300 font-mono uppercase tracking-wider text-xs">
                  Awaiting Input
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc ml-4 mt-1 text-xs font-mono space-y-0.5 text-slate-400">
                    {calc.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Big lot size hero */}
                <div className="text-center py-4">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-amber-400/70 font-mono mb-2">
                    Recommended Lot Size
                  </p>
                  <p className="text-7xl sm:text-8xl font-bold text-amber-400 rm-glow-gold font-mono tabular-nums leading-none">
                    {formatLot(calc.recommendedLot)}
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-3 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    <span>exact: <span className="text-slate-300">{calc.exactLot.toFixed(4)}</span></span>
                    <span className="text-slate-700">·</span>
                    <span>step: <span className="text-slate-300">{symbol.lotStep}</span></span>
                    <span className="text-slate-700">·</span>
                    <span>min: <span className="text-slate-300">{symbol.minLot}</span></span>
                  </div>
                  <div className="mt-3">
                    {calc.minLotOk ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono uppercase tracking-wider">
                        <span className="rm-pulse-dot bg-emerald-400" style={{ width: 6, height: 6 }} />
                        Within broker min
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-mono uppercase tracking-wider">
                        <span className="rm-pulse-dot bg-rose-400" style={{ width: 6, height: 6 }} />
                        Below broker min ({symbol.minLot})
                      </span>
                    )}
                  </div>
                </div>

                {/* R:R visual bar */}
                {rrBar && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      <span>Risk : Reward Visualization</span>
                      <span className="text-amber-400">1 : {calc.rrRatio.toFixed(2)}</span>
                    </div>
                    <div className="rm-rr-bar">
                      {/* SL zone (left half) — red */}
                      <div
                        className="rm-rr-bar-segment"
                        style={{
                          left: 0,
                          width: `${rrBar.isLong ? rrBar.entryPct : 100 - rrBar.entryPct}%`,
                          background:
                            "linear-gradient(90deg, rgba(255, 59, 92, 0.45), rgba(255, 59, 92, 0.15))",
                        }}
                      >
                        <span className="text-rose-200">SL</span>
                      </div>
                      {/* TP zone (right half) — green */}
                      <div
                        className="rm-rr-bar-segment"
                        style={{
                          right: 0,
                          width: `${rrBar.isLong ? 100 - rrBar.entryPct : rrBar.entryPct}%`,
                          background:
                            "linear-gradient(90deg, rgba(16, 224, 161, 0.15), rgba(16, 224, 161, 0.45))",
                        }}
                      >
                        <span className="text-emerald-200">TP</span>
                      </div>
                      {/* Entry marker */}
                      <div
                        className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
                        style={{
                          left: `${rrBar.entryPct}%`,
                          transform: "translateX(-50%)",
                          width: 2,
                          background: "rgba(255, 184, 0, 0.9)",
                          boxShadow: "0 0 8px rgba(255, 184, 0, 0.6)",
                        }}
                      >
                        <div
                          className="absolute -top-1 w-2 h-2 rounded-full bg-amber-400"
                          style={{ boxShadow: "0 0 6px rgba(255, 184, 0, 0.8)" }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>SL @ <span className="text-rose-300">{formatPrice(parseFloat(stopLoss), symbol.decimals)}</span></span>
                      <span className="text-amber-400">ENTRY @ <span className="text-amber-300">{formatPrice(parseFloat(entry), symbol.decimals)}</span></span>
                      <span>TP @ <span className="text-emerald-300">{formatPrice(parseFloat(takeProfit), symbol.decimals)}</span></span>
                    </div>
                  </div>
                )}

                {/* 4-stat grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatTile
                    label="Risk $"
                    value={formatMoney(conv(calc.riskAmount), displayCurrency)}
                    color="amber"
                    icon={<Shield className="h-3 w-3" />}
                  />
                  <StatTile
                    label="Loss"
                    value={formatMoney(conv(calc.actualLoss), displayCurrency)}
                    color="rose"
                    icon={<TrendingDown className="h-3 w-3" />}
                  />
                  <StatTile
                    label="Win"
                    value={formatMoney(conv(calc.actualProfit), displayCurrency)}
                    color="emerald"
                    icon={<TrendingUp className="h-3 w-3" />}
                  />
                  <StatTile
                    label="R : R"
                    value={`1:${calc.rrRatio.toFixed(2)}`}
                    color="cyan"
                    icon={<Target className="h-3 w-3" />}
                  />
                </div>

                {/* Detailed breakdown */}
                <div className="rounded-md border border-white/5 bg-black/40 p-3 grid grid-cols-2 gap-y-2 text-xs font-mono">
                  <div className="flex justify-between pr-3">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">SL dist</span>
                    <span className="text-rose-300 tabular-nums">
                      {formatPrice(calc.slDistance, symbol.decimals)} <span className="text-slate-600">({calc.slPips.toFixed(1)} {unitLabel})</span>
                    </span>
                  </div>
                  <div className="flex justify-between pl-3 border-l border-white/5">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">TP dist</span>
                    <span className="text-emerald-300 tabular-nums">
                      {formatPrice(calc.tpDistance, symbol.decimals)} <span className="text-slate-600">({calc.tpPips.toFixed(1)} {unitLabel})</span>
                    </span>
                  </div>
                  <div className="flex justify-between pr-3">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">Direction</span>
                    <span className={calc.minLotOk ? "text-cyan-300" : "text-rose-300"}>
                      {stopLoss && entry && parseFloat(stopLoss) < parseFloat(entry) ? "▲ LONG" : "▼ SHORT"}
                    </span>
                  </div>
                  <div className="flex justify-between pl-3 border-l border-white/5">
                    <span className="text-slate-500 uppercase tracking-wider text-[10px]">Acct risk</span>
                    <span className="text-amber-300 tabular-nums">
                      {riskPercent}% of {formatMoney(balance, "USD")}
                    </span>
                  </div>
                </div>

                {/* Min lot warning */}
                {calc.minLotWarning && (
                  <Alert className="bg-rose-500/5 border-rose-500/30 text-rose-200">
                    <AlertTitle className="text-rose-300 font-mono uppercase tracking-wider text-xs flex items-center gap-2">
                      ⚠ Below Broker Minimum Lot
                    </AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p className="text-xs font-mono text-slate-300">
                        Calculated lot (<span className="text-rose-300 font-bold">{formatLot(calc.recommendedLot)}</span>) is below broker minimum of <span className="text-amber-300 font-bold">{calc.minLotWarning.minLot}</span> for {symbol.label}.
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        If you trade the min lot:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-black/40 rounded-md p-3 border border-white/5">
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Loss @ min</p>
                          <p className="text-rose-300 font-bold tabular-nums">
                            {formatMoney(conv(calc.minLotWarning.lossAtMinLot), displayCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Win @ min</p>
                          <p className="text-emerald-300 font-bold tabular-nums">
                            {formatMoney(conv(calc.minLotWarning.profitAtMinLot), displayCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Excess risk</p>
                          <p className="text-rose-300 font-bold tabular-nums">
                            {formatMoney(conv(calc.minLotWarning.excessRisk), displayCurrency)}
                            <span className="text-slate-500 font-normal ml-1">(+{calc.minLotWarning.excessRiskPercent.toFixed(2)}%)</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Options</p>
                          <p className="text-slate-300 text-[11px] leading-tight">
                            Widen SL · ↑ Balance · Accept higher risk
                          </p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Save */}
                <Button
                  onClick={saveTrade}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono uppercase tracking-wider text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  <History className="h-3 w-3 mr-1.5" />
                  Save to History
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="rm-glass border-white/5">
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CardHeader className="pb-2 pt-3">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between hover:opacity-80 transition">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <History className="h-3 w-3" />
                    History
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-400 text-[10px] font-mono ml-1"
                    >
                      {history.length}
                    </Badge>
                  </CardTitle>
                  {historyOpen ? (
                    <ChevronUp className="h-3 w-3 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  )}
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-xs font-mono text-slate-600 text-center py-6 uppercase tracking-wider">
                    No saved trades yet
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto rm-scroll pr-1">
                    {history.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-black/40 p-2.5 hover:bg-white/5 transition font-mono text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {rec.symbolLabel}
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0"
                            >
                              {formatLot(rec.recommendedLot)} lot
                            </Badge>
                          </div>
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            {new Date(rec.timestamp).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex gap-3 flex-wrap">
                            <span>R:R 1:{rec.rrRatio.toFixed(2)}</span>
                            <span className="text-rose-300">L: {formatMoney(rec.actualLoss, "USD")}</span>
                            <span className="text-emerald-300">W: {formatMoney(rec.actualProfit, "USD")}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 bg-white/5 border-white/10 text-[10px] font-mono uppercase tracking-wider"
                          onClick={() => replayTrade(rec)}
                        >
                          Replay
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="w-full text-rose-300 hover:text-rose-200 hover:bg-rose-500/5 font-mono text-[10px] uppercase tracking-wider mt-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear All
                    </Button>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/5 bg-black/60 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-slate-600">
            <span>RISKMATE · POSITION TERMINAL · v2.0</span>
            <span className="flex items-center gap-3">
              <span>SYNTHETIC FEED · DERIV WS</span>
              <span className="text-slate-700">·</span>
              <span>CHARTS · TRADINGVIEW</span>
              <span className="text-slate-700">·</span>
              <span className="text-amber-500/70">FOR EDUCATIONAL USE</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ----- Stat tile component -----
function StatTile({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: "amber" | "rose" | "emerald" | "cyan";
  icon?: React.ReactNode;
}) {
  const colors: Record<string, { border: string; bg: string; text: string }> = {
    amber: {
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
      text: "text-amber-300",
    },
    rose: {
      border: "border-rose-500/20",
      bg: "bg-rose-500/5",
      text: "text-rose-300",
    },
    emerald: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/5",
      text: "text-emerald-300",
    },
    cyan: {
      border: "border-cyan-500/20",
      bg: "bg-cyan-500/5",
      text: "text-cyan-300",
    },
  };
  const c = colors[color];
  return (
    <div className={`rounded-md border ${c.border} ${c.bg} p-2.5`}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider opacity-70 font-mono">
        {icon}
        {label}
      </div>
      <p className={`text-lg font-bold tabular-nums mt-1 font-mono ${c.text}`}>
        {value}
      </p>
    </div>
  );
}
