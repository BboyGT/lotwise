<div align="center">

# ⚡ Lotwise

### Position Terminal — Trading Risk Calculator

**Calculate exact lot size, risk, and reward for Forex, Synthetic Indices, Crypto & Real Indices — with live prices, alarms, and PWA install.**

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-5A0EA8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)
[![Build](https://img.shields.io/badge/Build-Passing-22C55E?style=for-the-badge)]()
[![Lint](https://img.shields.io/badge/Lint-Clean-22C55E?style=for-the-badge)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-FFB000?style=for-the-badge)]()

</div>

---

<div align="center">

<img src="download/screenshots/01-synthetic-overview.png" alt="Lotwise Position Terminal" width="100%">

*Dark-mode trading terminal aesthetic with live price feeds, candlestick charts, and real-time position sizing*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Live Price Feeds](#-live-price-feeds)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Deploy Your Own](#-deploy-your-own)
- [Project Structure](#-project-structure)
- [Disclaimer](#-disclaimer)
- [License](#-license)

---

## 🎯 Overview

**Lotwise** is a privacy-first, client-side trading position calculator. It runs entirely in your browser — no account, no server, no tracking. Enter your balance, risk percentage, and trade setup, and Lotwise calculates the exact lot size to use, your potential loss, potential profit, and risk-to-reward ratio — with broker minimum lot validation.

### Why Lotwise?

| Traditional Calculators | Lotwise |
|---|---|
| Static formulas, no live prices | **Real-time price feeds** from Binance, Deriv & TradingView |
| Manual lot size entry | **Auto-calculated exact lot** based on your risk % |
| No broker minimum check | **Min-lot validation** with adjusted scenario warnings |
| No alerts | **Sound alarms + browser notifications** for entry/SL/TP hits |
| No trade journal | **Built-in journal + equity curve** with win-rate tracking |
| Web only | **Installable PWA** — works offline, launches like a native app |
| Risk capped at 1-3% | **Adjustable 0.5%–100%** with high-risk warnings |

---

## ✨ Features

### 📊 Position Calculator
- **112 trading symbols** across 4 asset classes (Forex, Synthetic Indices, Real Indices, Crypto)
- **Exact lot size** auto-calculated from your risk percentage and SL distance
- **Min-lot validation** — warns when calculated lot is below broker minimum, shows adjusted scenario
- **Risk-to-reward visualizer** — color-coded bar showing SL zone (red), entry marker (gold), TP zone (green)
- **0.5%–100% risk slider** with quick presets (1%, 2%, 5%, 10%, 25%, 50%, 100%)
- **Multi-currency display** — switch between USD, EUR, GBP, NGN, JPY

### 📈 Live Price Feeds
- **Crypto**: Real-time prices from Binance REST API (BTC, ETH, SOL, 26 pairs)
- **Forex**: Real-time prices from TradingView Scanner API (EUR/USD, GBP/USD, 35 pairs)
- **Indices**: Real-time prices from TradingView Scanner API (US30, NAS100, DAX, 16 indices)
- **Synthetic**: Deriv WebSocket API for Boom/Crash/Volatility/Jump/Step indices
- **One-click price fill** — "Fill Live Entry" auto-populates the entry field

### 🕯️ Candlestick Charts
- **TradingView widget** for Forex, Indices & Crypto (with symbol search + drawing tools)
- **Custom candlestick chart** for Synthetic indices (TradingView Lightweight Charts + Deriv candles API)
- **6 timeframes** — 1m, 5m, 15m, 1h, 4h, 1D
- **Volume histogram** + crosshair + live price overlay

### 🔔 Alarm & Notification System
- **Auto-detect** when live price hits your entry, stop loss, or take profit
- **4 distinct sound profiles** (synthesized via Web Audio API — no audio files):
  - 🎯 Entry: C-E-G major triad ascending
  - 🛑 Stop Loss: A-F-C descending sawtooth
  - 📈 Take Profit: C-E-G-C octave arpeggio
  - 🔔 Custom: E-A perfect fifth
- **Custom price alerts** — set any target price with "crosses above" or "crosses below" direction
- **Browser notifications** with OS-level alerts
- **Adjustable volume** + per-event-type toggles
- **Preview button** to test each alarm before relying on it

### 📝 Trade Journal & Equity Curve
- **Save trades** with journal notes (up to 300 characters)
- **Outcome tracking** — mark trades as Win / Loss / Breakeven / Pending
- **Equity curve chart** — SVG-based, updates in real-time as you mark outcomes
- **Win-rate statistics** — recorded trades, wins, win rate %
- **Replay function** — reload any saved trade's exact parameters
- **localStorage persistence** — survives page refresh

### 📱 PWA — Install as a Native App
- **Installable** on desktop (Chrome/Edge) and mobile (Chrome/Safari)
- **Standalone window** — no browser chrome
- **Offline shell** — service worker caches the UI for instant load
- **Background alarm polling** for crypto alerts (even when app is closed)
- **App shortcuts** — quick-access to Synthetic, Forex, or Crypto tabs
- **Custom icons** — 192px, 512px, maskable, Apple touch icon, favicon

### 🔍 Searchable Symbol Picker
- **Type-to-filter** across all sub-categories simultaneously
- **Grouped display** when browsing (Majors, EUR Crosses, Volatility Indices, etc.)
- **LIVE badge** on every synthetic symbol with Deriv feed
- **Active indicator** on currently selected symbol

### ⚖️ Legal & Compliance
- **Terms of Service** (10 sections covering service nature, no financial advice, risk disclosure)
- **Privacy Policy** (9 sections — privacy-first, no tracking, localStorage only)
- **Risk Disclaimer** (10 sections + problem gambling help links)

---

## 🔴 Live Price Feeds

| Asset Class | Source | Status | Pairs |
|---|---|---|---|
| **Crypto** | Binance REST API | ✅ Real-time (no key needed) | 26 |
| **Forex** | TradingView Scanner API | ✅ Real-time (no key needed) | 35 |
| **Indices** | TradingView Scanner API | ✅ Real-time (no key needed) | 16 |
| **Synthetic** | Deriv WebSocket API | ⚠️ Requires non-blocked IP | 37 |

> **Note on Synthetic Indices**: Deriv blocks WebSocket connections from cloud/datacenter IPs. If running on a cloud server, synthetic prices will use a simulator fallback. On residential IPs or local development, real Deriv prices stream live. Crypto, Forex, and Indices prices work everywhere via REST APIs.

---

## 📸 Screenshots

### Desktop — Position Calculator with Live Candlestick Chart
<img src="download/screenshots/01-synthetic-overview.png" alt="Synthetic Overview" width="100%">

### Calculation Output — Lot Size, Risk:Reward, Stats
<img src="download/screenshots/02-calc-output.png" alt="Calc Output" width="100%">

### Risk:Reward Visual Bar + Min-Lot Warning
<img src="download/screenshots/03-rr-bar.png" alt="R:R Bar" width="100%">

### Crypto — Real Binance Live Prices
<img src="download/screenshots/04-crypto-btc.png" alt="Crypto BTC" width="100%">

### Crypto Position Calculation
<img src="download/screenshots/05-crypto-calc.png" alt="Crypto Calc" width="100%">

### Forex — Real EUR/USD Live Price
<img src="download/screenshots/06-forex-eurusd.png" alt="Forex EURUSD" width="100%">

### Alarm & Notification Panel
<img src="download/screenshots/07-alarm-panel.png" alt="Alarm Panel" width="100%">

### Alarm Settings — Sound Profiles + Volume
<img src="download/screenshots/08-alarm-settings.png" alt="Alarm Settings" width="100%">

### Equity Curve + Trade Journal
<img src="download/screenshots/09-equity-curve.png" alt="Equity Curve" width="100%">

### Legal Modal — Terms of Service
<img src="download/screenshots/10-legal-modal.png" alt="Legal Modal" width="100%">

### Mobile — Full Responsive Layout
<p float="left">
  <img src="download/screenshots/11-mobile-view.png" alt="Mobile View" width="45%">
  <img src="download/screenshots/12-mobile-calc.png" alt="Mobile Calc" width="45%">
</p>

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 (strict mode) |
| **Styling** | Tailwind CSS 4 + custom terminal aesthetic |
| **UI Components** | shadcn/ui (New York style) + Radix UI primitives |
| **Charts** | TradingView Lightweight Charts v5 + custom SVG equity curve |
| **Live Prices** | Binance REST API + TradingView Scanner API + Deriv WebSocket |
| **Sound** | Web Audio API (synthesized tones, no audio files) |
| **PWA** | Service Worker + Web App Manifest + custom icons |
| **Notifications** | Browser Notification API + Service Worker push |
| **Storage** | localStorage (no backend, no database, no tracking) |
| **Icons** | Lucide React |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- A modern browser with WebSocket support

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lotwise.git
cd lotwise

# Install dependencies
bun install
# or
npm install

# Start the dev server
bun run dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
bun run build
bun run start
```

### Lint & Type Check

```bash
bun run lint          # ESLint
npx tsc --noEmit      # TypeScript type checking
```

---

## 🌐 Deploy Your Own

### Vercel (Recommended — Free)
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Select your repo → Deploy
4. Done! Your app is live with HTTPS (required for PWA)

> **Important**: Deploy to Vercel or any non-cloud-blocked server to get real Deriv synthetic index prices. Cloud IPs (AWS, GCP, Azure) are blocked by Deriv's anti-abuse measures.

### Netlify
1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git
3. Build command: `bun run build` or `npm run build`
4. Publish directory: `.next`
5. Deploy

### Local Development
```bash
bun run dev
# Open http://localhost:3000
# All price feeds work on localhost (including Deriv WS)
```

### Register Your Own Deriv App ID (Optional)
For production use with synthetic indices:
1. Go to [api.deriv.com](https://api.deriv.com) → Register
2. Create a new app (free, takes 2 minutes)
3. Replace `app_id=1089` in `src/hooks/use-live-price-v2.ts` and `src/hooks/use-deriv-candles.ts`

---

## 📁 Project Structure

```
lotwise/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + PWA meta tags
│   │   ├── page.tsx            # Main app (calculator UI)
│   │   └── globals.css        # Terminal theme + custom styles
│   ├── components/
│   │   ├── alarm-panel.tsx           # Alarm/alerts UI (3 tabs)
│   │   ├── connection-diagnostic.tsx  # WS reachability tester
│   │   ├── equity-curve-chart.tsx     # SVG equity curve + win rate
│   │   ├── legal-modal.tsx            # Terms/Privacy/Disclaimer
│   │   ├── lotwise-logo.tsx          # Brand SVG logo
│   │   ├── searchable-symbol-picker.tsx  # Type-to-filter combobox
│   │   ├── synthetic-candle-chart.tsx     # Candlestick chart for synthetics
│   │   ├── tradingview-widget.tsx    # TradingView embed widgets
│   │   └── ui/                        # 22 shadcn/ui components
│   ├── hooks/
│   │   ├── use-alarm-manager.ts       # Alarm detection + sound + notifications
│   │   ├── use-deriv-candles.ts       # Deriv candle stream + simulator
│   │   ├── use-live-price-v2.ts       # Multi-source live price hook
│   │   ├── use-pwa.ts                # PWA install + SW registration
│   │   └── use-toast.ts              # Toast notifications
│   └── lib/
│       ├── calculator.ts              # Position sizing engine
│       ├── sound-engine.ts            # Web Audio synthesized tones
│       └── symbols.ts                # 112 symbol specs + contract data
├── public/
│   ├── logo.svg                # Brand logo
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service worker
│   ├── icon-192.png            # PWA icons (6 variants)
│   └── icon-512.png
└── package.json
```

---

## 📊 Supported Symbols (112 Total)

### Forex (35 pairs)
- **Majors** (7): EUR/USD, GBP/USD, USD/JPY, USD/CHF, USD/CAD, AUD/USD, NZD/USD
- **EUR Crosses** (6): EUR/GBP, EUR/JPY, EUR/CHF, EUR/AUD, EUR/CAD, EUR/NZD
- **GBP Crosses** (5): GBP/JPY, GBP/CHF, GBP/AUD, GBP/CAD, GBP/NZD
- **AUD Crosses** (4): AUD/JPY, AUD/CHF, AUD/CAD, AUD/NZD
- **NZD & Other** (5): NZD/JPY, NZD/CHF, NZD/CAD, CHF/JPY, CAD/JPY
- **Exotics** (8): USD/MXN, USD/ZAR, USD/TRY, USD/SGD, USD/HKD, USD/SEK, USD/NOK, USD/DKK

### Synthetic Indices (37 pairs)
- **Boom & Crash** (6): Boom 300/500/1000, Crash 300/500/1000
- **Volatility** (5): V10, V25, V50, V75, V100
- **Volatility 1s** (5): V10(1s), V25(1s), V50(1s), V75(1s), V100(1s)
- **Jump** (5): Jump 10/25/50/75/100
- **Step** (9): Step 0.1 through 0.9
- **Bull/Bear/Smart** (7): Bull Market, Bear Market, Z Volatility 75, Smart 5R/10R/20R/40R

### Real Indices (16 pairs)
- **US** (4): US30, NAS100, S&P 500, Russell 2000
- **Europe** (7): GER40 (DAX), UK100 (FTSE), FRA40 (CAC), ESP35, ITA40, NETH25, SWISS20
- **Asia** (4): JPN225 (Nikkei), HKG50 (Hang Seng), AUS200 (ASX), KOSPI 200
- **Volatility** (1): VIX

### Crypto (26 pairs)
- **Major** (8): BTC, ETH, XRP, SOL, ADA, DOT, LTC, BCH
- **Layer 1 & 2** (10): AVAX, ATOM, NEAR, ARB, OP, APT, MATIC, FIL, INJ, SUI
- **DeFi & Oracles** (8): LINK, UNI, AAVE, MKR, RUNE, TIA, SEI, BNB

---

## ⚖️ Disclaimer

**Lotwise is for educational purposes only.** It is not financial advice. Trading forex, synthetic indices, cryptocurrencies, and derivatives carries substantial risk of loss. You could lose all of your invested capital. Never trade with money you cannot afford to lose.

All calculations are based on standard retail broker formulas and may differ from your broker's actual execution due to spreads, slippage, swap fees, and broker-specific contract sizes. Always verify calculations independently before placing a trade.

See the in-app **Disclaimer** tab (footer link) for the full risk disclosure.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with [Next.js](https://nextjs.org) · [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) · [Binance API](https://binance-docs.github.io/apidocs/) · [Deriv API](https://api.deriv.com)**

<br>

**If this project helped you, give it a ⭐**

</div>
