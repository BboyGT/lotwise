"use client";

import { useState } from "react";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectionDiagnosticProps {
  className?: string;
}

interface TestResult {
  endpoint: string;
  status: "testing" | "open" | "error" | "timeout";
  latency?: number;
  error?: string;
}

const DERIV_ENDPOINTS = [
  { label: "Deriv public market data", url: "wss://api.derivws.com/trading/v1/options/ws/public" },
  { label: "Deriv legacy API fallback", url: "wss://ws.derivws.com/websockets/v3?app_id=1089" },
];

const BINANCE_ENDPOINT = "wss://stream.binance.com:9443/ws/btcusdt@trade";

/**
 * Tests WebSocket connectivity to Deriv and Binance endpoints.
 * Shows the user exactly which connections work and which are blocked.
 */
export function ConnectionDiagnostic({ className }: ConnectionDiagnosticProps) {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [binanceResult, setBinanceResult] = useState<TestResult | null>(null);

  async function testConnection(url: string): Promise<TestResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      let resolved = false;

      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { ws.close(); } catch {}
          resolve({
            endpoint: url,
            status: "timeout",
            latency: Date.now() - start,
            error: "Connection timed out (10s)",
          });
        }
      }, 10000);

      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          const latency = Date.now() - start;
          try { ws.close(); } catch {}
          resolve({ endpoint: url, status: "open", latency });
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          try { ws.close(); } catch {}
          resolve({
            endpoint: url,
            status: "error",
            latency: Date.now() - start,
            error: "Connection refused or blocked",
          });
        }
      };

      ws.onclose = (event) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            endpoint: url,
            status: "error",
            latency: Date.now() - start,
            error: `Closed (code: ${event.code})`,
          });
        }
      };
    });
  }

  async function runTests() {
    setTesting(true);
    setResults([]);
    setBinanceResult(null);

    // Test all Deriv endpoints in parallel
    const derivTests = DERIV_ENDPOINTS.map(async (ep) => {
      const result = await testConnection(ep.url);
      return { ...result, endpoint: ep.label };
    });

    // Also test Binance
    const binanceTest = testConnection(BINANCE_ENDPOINT);

    const allResults = await Promise.all(derivTests);
    const binRes = await binanceTest;

    setResults(allResults);
    setBinanceResult({ ...binRes, endpoint: "Binance WS" });
    setTesting(false);
  }

  function toggle() {
    setOpen(!open);
    if (!open && results.length === 0) {
      runTests();
    }
  }

  return (
    <div className={className}>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 hover:text-amber-300 transition-colors"
      >
        <Wifi className="h-3 w-3" />
        Connection Diagnostic
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300">
              WebSocket Connection Test
            </h3>
            <Button
              onClick={runTests}
              disabled={testing}
              variant="outline"
              size="sm"
              className="h-7 bg-white/5 border-white/10 text-[10px] font-mono uppercase tracking-wider hover:bg-white/10"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${testing ? "animate-spin" : ""}`} />
              {testing ? "Testing…" : "Retest"}
            </Button>
          </div>

          {/* Results */}
          <div className="space-y-2">
            {results.map((r, i) => (
              <ResultRow key={i} result={r} />
            ))}
            {binanceResult && <ResultRow result={binanceResult} />}
          </div>

          {/* Interpretation */}
          {results.length > 0 && binanceResult && (
            <div className="mt-3 pt-3 border-t border-white/5">
              {results.every((r) => r.status !== "open") && binanceResult.status === "open" ? (
                <div className="flex items-start gap-2 text-[10px] font-mono text-amber-300/90 leading-relaxed">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    <strong>Deriv WS is blocked on your network.</strong> Synthetic prices
                    and candles will be unavailable until the live feed reconnects. This is typically caused by a network firewall,
                    browser extension, or provider restriction.
                    <br /><br />
                    <strong>To restore live synthetic prices:</strong> Open this app on a
                    different network (residential WiFi or mobile data), or allow Deriv
                    WebSocket connections through your firewall or browser extension.
                    Crypto prices (Binance) work normally.
                  </span>
                </div>
              ) : results.some((r) => r.status === "open") ? (
                <div className="flex items-start gap-2 text-[10px] font-mono text-emerald-300/90 leading-relaxed">
                  <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    Deriv WS is reachable. Synthetic prices and candles should stream live.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-[10px] font-mono text-rose-300/90 leading-relaxed">
                  <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    Deriv WebSocket and Binance REST checks both failed. Check your network
                    connection or firewall settings.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultRow({ result }: { result: TestResult }) {
  const icon = result.status === "open" ? (
    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
  ) : result.status === "testing" ? (
    <RefreshCw className="h-3 w-3 text-amber-400 animate-spin" />
  ) : (
    <XCircle className="h-3 w-3 text-rose-400" />
  );

  const statusText = result.status === "open"
    ? `Connected${result.latency ? ` · ${result.latency}ms` : ""}`
    : result.status === "testing"
    ? "Testing…"
    : result.error || "Failed";

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-black/40 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="text-[11px] font-mono text-slate-300 truncate">
          {result.endpoint}
        </span>
      </div>
      <span className={`text-[10px] font-mono shrink-0 ${
        result.status === "open" ? "text-emerald-400" : "text-rose-400"
      }`}>
        {statusText}
      </span>
    </div>
  );
}
