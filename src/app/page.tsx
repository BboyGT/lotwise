"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ASSET_CLASSES,
  AssetClass,
  SYMBOLS,
  SymbolSpec,
  getSymbol,
  symbolsByClass,
} from "@/lib/symbols";
import {
  calculateTrade,
  currencySymbol,
  formatLot,
  formatMoney,
  formatPrice,
  FX_RATES,
} from "@/lib/calculator";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Layers,
  CircleDot,
  Download,
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
  const [assetClass, setAssetClass] = useState<AssetClass>("forex");
  const [symbolId, setSymbolId] = useState<string>("EURUSD");
  const [balance, setBalance] = useState<number>(100);
  const [riskPercent, setRiskPercent] = useState<number>(10);
  const [entry, setEntry] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [takeProfit, setTakeProfit] = useState<string>("");

  // ----- history -----
  const [history, setHistory] = useState<TradeRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  // ----- load saved settings on mount -----
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Reading from localStorage on mount is the canonical pattern for
    // restoring persisted client state. The cascading-render concern of
    // react-hooks/set-state-in-effect does not apply to a one-shot mount load.
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

  // ----- persist settings -----
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ displayCurrency, balance, riskPercent })
    );
  }, [displayCurrency, balance, riskPercent, hydrated]);

  const symbol = useMemo(() => getSymbol(symbolId), [symbolId]);
  const symbolList = useMemo(() => symbolsByClass(assetClass), [assetClass]);

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
    () => ["FX:EURUSD", "TVC:US30", "BINANCE:BTCUSDT", "DERIV:BOOM500"],
    []
  );

  function useLivePriceAsEntry() {
    // Best-effort: pull last price from TradingView widget is not directly exposed
    // without their paid API. We provide a "fill from manual input" hint instead.
    alert(
      "Tip: Look at the live chart above for current price, then type it into Entry field. (TradingView widget does not expose live price via free API.)"
    );
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

  function fmtUSD(n: number): string {
    return formatMoney(n / fxRate * fxRate, displayCurrency);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100">
      {/* ===== Top Ticker ===== */}
      <div className="border-b border-white/5 bg-[#0a1018]">
        <TradingViewTicker symbols={tickerSymbols} />
      </div>

      {/* ===== Header ===== */}
      <header className="border-b border-white/5 bg-[#0a1018]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Target className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Risk<span className="text-emerald-400">Mate</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 -mt-0.5">
                Position Calculator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-400 hidden sm:inline">Display:</Label>
            <Select
              value={displayCurrency}
              onValueChange={(v) => setDisplayCurrency(v as CurrencyCode)}
            >
              <SelectTrigger className="w-[80px] h-8 bg-white/5 border-white/10">
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-5">
        {/* Asset class tabs */}
        <Tabs
          value={assetClass}
          onValueChange={(v) => changeAssetClass(v as AssetClass)}
        >
          <TabsList className="grid grid-cols-4 w-full bg-white/5 border border-white/10 h-auto">
            {ASSET_CLASSES.map((ac) => (
              <TabsTrigger
                key={ac.id}
                value={ac.id}
                className="py-2 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-300 data-[state=active]:shadow-none"
              >
                <span className="text-xs sm:text-sm">{ac.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Symbol selector */}
        <Card className="bg-[#0d1320] border-white/10 shadow-xl shadow-black/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-emerald-400" />
              Trading Pair
            </CardTitle>
            <CardDescription className="text-slate-400">
              Select a symbol — live chart will update automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Symbol</Label>
              <Select value={symbolId} onValueChange={setSymbolId}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>
                      {ASSET_CLASSES.find((a) => a.id === assetClass)?.label}
                    </SelectLabel>
                    {symbolList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Live Price (TradingView)</Label>
              <div className="rounded-md border border-white/10 bg-black/30 p-2 h-9 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {symbol.tvSymbol}
                </span>
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/15 text-emerald-300 text-[10px]"
                >
                  LIVE
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live chart */}
        <Card className="overflow-hidden bg-[#0d1320] border-white/10">
          <CardContent className="p-0">
            <TradingViewWidget
              symbol={symbol.tvSymbol}
              height={320}
              type="mini"
            />
          </CardContent>
        </Card>

        {/* Inputs */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Account & Risk */}
          <Card className="bg-[#0d1320] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                Account & Risk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Account balance (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <Input
                    type="number"
                    value={balance}
                    min={0}
                    step={10}
                    onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                    className="pl-7 bg-white/5 border-white/10 text-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  ≈ {formatMoney(balance / FX_RATES.USD * FX_RATES[displayCurrency], displayCurrency)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Risk per trade (%)</Label>
                  <span className="text-sm font-semibold text-amber-400">
                    {riskPercent}%
                  </span>
                </div>
                <Slider
                  value={[riskPercent]}
                  min={0.5}
                  max={20}
                  step={0.5}
                  onValueChange={(v) => setRiskPercent(v[0])}
                  className="[&_[role=slider]]:bg-amber-400"
                />
                <Input
                  type="number"
                  value={riskPercent}
                  min={0}
                  step={0.5}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                  className="bg-white/5 border-white/10 text-white"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Amount at risk:</span>
                  <span className="font-semibold text-rose-400">
                    {formatMoney((balance * riskPercent) / 100 / FX_RATES.USD * FX_RATES[displayCurrency], displayCurrency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entry / SL / TP */}
          <Card className="bg-[#0d1320] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-sky-400" />
                Trade Setup
              </CardTitle>
              <CardDescription className="text-slate-400">
                Long if SL &lt; entry. Short if SL &gt; entry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Entry price</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1.08500"
                  value={entry}
                  step="any"
                  onChange={(e) => setEntry(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Stop loss</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1.08200"
                    value={stopLoss}
                    step="any"
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Take profit</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 1.09700"
                    value={takeProfit}
                    step="any"
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={useLivePriceAsEntry}
                className="w-full bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              >
                Use live price as entry (tip)
              </Button>
              {symbol.note && (
                <p className="text-[11px] text-slate-500 italic">{symbol.note}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <Card className="bg-gradient-to-br from-[#0d1320] to-[#0a0f1a] border-emerald-500/20 shadow-2xl shadow-emerald-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Calculation Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!calc.valid ? (
              <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-200">
                <AlertTitle className="text-amber-300">Heads up</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc ml-5 mt-1 text-sm space-y-0.5">
                    {calc.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Big lot size display */}
                <div className="rounded-xl bg-black/40 border border-white/10 p-5 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-1">
                    Recommended Lot Size
                  </p>
                  <p className="text-5xl font-bold text-emerald-400 tabular-nums">
                    {formatLot(calc.recommendedLot)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    exact: {calc.exactLot.toFixed(4)} · step: {symbol.lotStep} · min: {symbol.minLot}
                  </p>
                  <div className="mt-3">
                    {calc.minLotOk ? (
                      <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                        ✓ Within broker minimum
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30">
                        ⚠ Below broker minimum ({symbol.minLot})
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Stat grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox
                    label="Risk Amount"
                    value={formatMoney(calc.riskAmount / FX_RATES.USD * FX_RATES[displayCurrency], displayCurrency)}
                    tone="amber"
                    icon={<Shield className="h-3.5 w-3.5" />}
                  />
                  <StatBox
                    label="Potential Loss"
                    value={formatMoney(calc.actualLoss / FX_RATES.USD * FX_RATES[displayCurrency], displayCurrency)}
                    tone="rose"
                    icon={<TrendingDown className="h-3.5 w-3.5" />}
                  />
                  <StatBox
                    label="Potential Win"
                    value={formatMoney(calc.actualProfit / FX_RATES.USD * FX_RATES[displayCurrency], displayCurrency)}
                    tone="emerald"
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                  />
                  <StatBox
                    label="Risk:Reward"
                    value={`1:${calc.rrRatio.toFixed(2)}`}
                    tone="sky"
                    icon={<Target className="h-3.5 w-3.5" />}
                  />
                </div>

                {/* Distances */}
                <div className="rounded-lg bg-white/5 border border-white/10 p-3 grid grid-cols-2 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">SL distance</span>
                    <span className="font-mono text-rose-300">
                      {formatPrice(calc.slDistance, symbol.decimals)} ({calc.slPips.toFixed(1)} {unitLabel})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">TP distance</span>
                    <span className="font-mono text-emerald-300">
                      {formatPrice(calc.tpDistance, symbol.decimals)} ({calc.tpPips.toFixed(1)} {unitLabel})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Direction</span>
                    <span className="font-mono text-sky-300">
                      {stopLoss && entry && parseFloat(stopLoss) < parseFloat(entry) ? "LONG" : "SHORT"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account risk</span>
                    <span className="font-mono text-amber-300">
                      {riskPercent}% of {formatMoney(balance, "USD")}
                    </span>
                  </div>
                </div>

                {/* Min lot warning */}
                {calc.minLotWarning && (
                  <Alert className="bg-rose-500/10 border-rose-500/30 text-rose-200">
                    <AlertTitle className="text-rose-300 flex items-center gap-2">
                      ⚠ Below broker minimum lot size
                    </AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p className="text-sm">
                        Your calculated lot (<b>{formatLot(calc.recommendedLot)}</b>) is below the broker's minimum of <b>{calc.minLotWarning.minLot}</b> for {symbol.label}.
                      </p>
                      <p className="text-sm">
                        If you trade the minimum lot, your numbers become:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm bg-black/30 rounded-md p-3">
                        <div>
                          <p className="text-slate-400 text-xs">Loss at min lot</p>
                          <p className="text-rose-300 font-semibold">
                            {formatMoney(calc.minLotWarning.lossAtMinLot / FX_RATES.USD * FX_RATES[displayCurrency], displayCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Profit at min lot</p>
                          <p className="text-emerald-300 font-semibold">
                            {formatMoney(calc.minLotWarning.profitAtMinLot / FX_RATES.USD * FX_RATES[displayCurrency], displayCurrency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Excess risk</p>
                          <p className="text-rose-300 font-semibold">
                            {formatMoney(calc.minLotWarning.excessRisk / FX_RATES.USD * FX_RATES[displayCurrency], displayCurrency)} (+{calc.minLotWarning.excessRiskPercent.toFixed(2)}%)
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs">Tip</p>
                          <p className="text-slate-300 text-xs">
                            Widen SL distance, increase balance, or accept higher risk.
                          </p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Save */}
                <Button
                  onClick={saveTrade}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
                >
                  Save to history
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="bg-[#0d1320] border-white/10">
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between hover:opacity-80 transition">
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-400" />
                    Trade History
                    <Badge variant="secondary" className="bg-white/10 text-slate-300 ml-1">
                      {history.length}
                    </Badge>
                  </CardTitle>
                  {historyOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No saved trades yet. Calculate and click "Save to history".
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {history.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/5 p-3 hover:bg-white/10 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                              {rec.symbolLabel}
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-emerald-500/15 text-emerald-300 text-[10px]"
                            >
                              {formatLot(rec.recommendedLot)} lot
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(rec.timestamp).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex gap-3 flex-wrap">
                            <span>R:R 1:{rec.rrRatio.toFixed(2)}</span>
                            <span className="text-rose-300">
                              Loss: {formatMoney(rec.actualLoss, "USD")}
                            </span>
                            <span className="text-emerald-300">
                              Win: {formatMoney(rec.actualProfit, "USD")}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 bg-white/5 border-white/10 text-xs"
                            onClick={() => replayTrade(rec)}
                          >
                            Replay
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="w-full text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear history
                    </Button>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/5 bg-[#0a1018] mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center">
          <p className="text-[11px] text-slate-500">
            RiskMate — Position Calculator. For educational use only. Trading carries risk.
          </p>
          <p className="text-[10px] text-slate-600 mt-1">
            Prices via TradingView widgets. Calculation formulas are standard retail broker approximations.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "amber" | "rose" | "emerald" | "sky";
  icon?: React.ReactNode;
}) {
  const toneClasses: Record<string, string> = {
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-300",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    sky: "bg-sky-500/10 border-sky-500/20 text-sky-300",
  };
  return (
    <div className={`rounded-lg border p-3 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold tabular-nums mt-1">{value}</p>
    </div>
  );
}
