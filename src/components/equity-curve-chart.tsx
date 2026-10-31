"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatMoney } from "@/lib/calculator";

export interface TradeRecord {
  id: string;
  timestamp: number;
  actualLoss: number;
  actualProfit: number;
  rrRatio: number;
  outcome?: "win" | "loss" | "breakeven" | "pending";
  realizedPnL?: number;
  symbolLabel: string;
  note?: string;
}

interface EquityCurveChartProps {
  trades: TradeRecord[];
  startingBalance: number;
  displayCurrency: string;
}

/**
 * Equity curve visualization of saved trade history.
 * Each trade's realized P/L (if user-set) is added cumulatively.
 * If outcome is "pending", assumes the planned loss (conservative).
 */
export function EquityCurveChart({
  trades,
  startingBalance,
  displayCurrency,
}: EquityCurveChartProps) {
  const data = useMemo(() => {
    // Sort oldest → newest
    const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
    let equity = startingBalance;
    const points: {
      x: number;
      equity: number;
      pnl: number;
      outcome: TradeRecord["outcome"];
      symbol: string;
      timestamp: number;
      note?: string;
    }[] = [
      { x: 0, equity, pnl: 0, outcome: undefined, symbol: "Start", timestamp: 0 },
    ];
    sorted.forEach((t, i) => {
      let pnl = 0;
      let outcome = t.outcome || "pending";

      if (t.realizedPnL != null) {
        pnl = t.realizedPnL;
      } else if (outcome === "win") {
        pnl = t.actualProfit;
      } else if (outcome === "loss") {
        pnl = -t.actualLoss;
      } else if (outcome === "breakeven") {
        pnl = 0;
      } else {
        // pending — assume planned loss (conservative)
        pnl = -t.actualLoss;
      }

      equity += pnl;
      points.push({
        x: i + 1,
        equity,
        pnl,
        outcome,
        symbol: t.symbolLabel,
        timestamp: t.timestamp,
        note: t.note,
      });
    });
    return points;
  }, [trades, startingBalance]);

  // Chart dimensions
  const width = 100; // percentage-based
  const height = 180; // px
  const padding = { top: 20, right: 8, bottom: 20, left: 8 };

  // Compute Y range
  const equities = data.map((d) => d.equity);
  const minEq = Math.min(...equities, startingBalance * 0.95);
  const maxEq = Math.max(...equities, startingBalance * 1.05);
  const range = maxEq - minEq || 1;

  // Convert to SVG coordinates
  const xStep = (100 - padding.left - padding.right) / Math.max(1, data.length - 1);
  const points = data.map((d, i) => ({
    ...d,
    px: padding.left + i * xStep,
    py: padding.top + (1 - (d.equity - minEq) / range) * (height - padding.top - padding.bottom),
  }));

  // Build path string
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.px} ${p.py}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].px} ${height - padding.bottom} L ${points[0].px} ${height - padding.bottom} Z`;

  // Determine if equity is up or down overall
  const finalEquity = points[points.length - 1].equity;
  const totalChange = finalEquity - startingBalance;
  const isUp = totalChange >= 0;
  const totalPct = (totalChange / startingBalance) * 100;

  // Color the line based on overall direction
  const lineColor = isUp ? "#10e0a1" : "#ff3b5c";
  const areaColor = isUp ? "rgba(16,224,161,0.12)" : "rgba(255,59,92,0.12)";

  // Win rate
  const completedTrades = trades.filter((t) => t.outcome && t.outcome !== "pending");
  const wins = completedTrades.filter((t) => t.outcome === "win").length;
  const winRate = completedTrades.length > 0 ? (wins / completedTrades.length) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-white/5 bg-black/40 p-2">
          <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
            Equity
          </p>
          <p className={`text-base font-mono font-bold tabular-nums ${
            isUp ? "text-emerald-400" : "text-rose-400"
          }`}>
            {formatMoney(finalEquity, displayCurrency)}
          </p>
        </div>
        <div className="rounded-md border border-white/5 bg-black/40 p-2">
          <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
            Total P/L
          </p>
          <p className={`text-base font-mono font-bold tabular-nums ${
            isUp ? "text-emerald-400" : "text-rose-400"
          }`}>
            {isUp ? "+" : ""}{formatMoney(totalChange, displayCurrency)}
          </p>
        </div>
        <div className="rounded-md border border-white/5 bg-black/40 p-2">
          <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
            Return
          </p>
          <p className={`text-base font-mono font-bold tabular-nums ${
            isUp ? "text-emerald-400" : "text-rose-400"
          }`}>
            {isUp ? "+" : ""}{totalPct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* SVG chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: `${height}px` }}
        >
          {/* Background grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <line
              key={g}
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + g * (height - padding.top - padding.bottom)}
              y2={padding.top + g * (height - padding.top - padding.bottom)}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="0.3"
              strokeDasharray="1,1"
            />
          ))}

          {/* Starting balance reference line */}
          {(() => {
            const startY = padding.top + (1 - (startingBalance - minEq) / range) * (height - padding.top - padding.bottom);
            return (
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={startY}
                y2={startY}
                stroke="rgba(255,184,0,0.3)"
                strokeWidth="0.4"
                strokeDasharray="2,1"
              />
            );
          })()}

          {/* Area fill */}
          <path d={areaPath} fill={areaColor} />

          {/* Line */}
          <path
            d={linePath}
            stroke={lineColor}
            strokeWidth="0.6"
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Points */}
          {points.slice(1).map((p, i) => {
            const color =
              p.outcome === "win" ? "#10e0a1" :
              p.outcome === "loss" ? "#ff3b5c" :
              p.outcome === "breakeven" ? "#94a3b8" :
              "rgba(255,184,0,0.7)"; // pending
            return (
              <circle
                key={i}
                cx={p.px}
                cy={p.py}
                r="1.2"
                fill={color}
                stroke="#0a0f1a"
                strokeWidth="0.3"
              />
            );
          })}

          {/* Start point */}
          <circle
            cx={points[0].px}
            cy={points[0].py}
            r="1.5"
            fill="#FFB000"
          />
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] font-mono uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Win
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Loss
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Breakeven
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Pending
          </span>
        </div>
      </div>

      {/* Win rate summary */}
      {completedTrades.length > 0 && (
        <div className="rounded-md border border-white/5 bg-black/40 p-2.5 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
              Recorded
            </p>
            <p className="text-sm font-mono font-bold text-white tabular-nums">
              {completedTrades.length}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
              Wins
            </p>
            <p className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
              {wins}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
              Win rate
            </p>
            <p className="text-sm font-mono font-bold text-amber-400 tabular-nums">
              {winRate.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {trades.length === 0 && (
        <p className="text-xs font-mono text-slate-600 text-center py-4 uppercase tracking-wider">
          Save trades and set outcomes to see equity curve
        </p>
      )}
    </div>
  );
}
