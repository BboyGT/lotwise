"use client";

import { useEffect, useRef } from "react";

interface TradingViewWidgetProps {
  symbol: string;          // e.g. "FX:EURUSD"
  height?: number;
  type?: "ticker" | "mini" | "symbol";
}

/**
 * TradingView embed widgets (no API key required).
 * Docs: https://www.tradingview.com/widget/
 */
export function TradingViewWidget({
  symbol,
  height = 200,
  type = "mini",
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";

    const config =
      type === "ticker"
        ? {
            symbols: [{ proName: symbol }],
            showSymbolLogo: true,
            isTransparent: true,
            displayMode: "adaptive",
            colorTheme: "dark",
            locale: "en",
          }
        : {
            autosize: true,
            symbol,
            interval: "15",
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "en",
            hide_top_toolbar: false,
            hide_side_toolbar: false,
            hide_legend: false,
            allow_symbol_change: true,
            withdateranges: true,
            save_image: false,
            details: false,
            backgroundColor: "rgba(8, 12, 20, 1)",
            gridColor: "rgba(255, 255, 255, 0.05)",
          };

    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);
  }, [symbol, type]);

  return (
    <div
      className="tradingview-widget-container w-full"
      ref={containerRef}
      style={{ height }}
    >
      <div
        className="tradingview-widget-container__widget w-full"
        style={{ height: "100%" }}
      />
    </div>
  );
}

export function TradingViewTicker({ symbols }: { symbols: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.type = "text/javascript";

    script.innerHTML = JSON.stringify({
      symbols: symbols.map((s) => ({ proName: s, title: s.split(":")[1] || s })),
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en",
    });
    container.appendChild(script);
  }, [symbols.join(",")]);

  return (
    <div
      className="tradingview-widget-container w-full"
      ref={containerRef}
    >
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}
