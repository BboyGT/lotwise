<div align="center">

<h1><img src="public/logo.svg" alt="Lotwise logo" width="48"><br>Lotwise</h1>

### Position Terminal: Trading Risk Calculator

**Calculate exact lot size, risk, and reward for Forex, Synthetic Indices, Crypto & Real Indices with live prices, alarms, and PWA install.**

**[Open the live Lotwise app](https://lotwises.netlify.app)** to try the project.

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-5A0EA8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-FFB000?style=for-the-badge)]()

</div>

---

<div align="center">

<img src="public/logo.svg" alt="Lotwise logo" width="160">

*Risk-first position sizing and trade journal for Forex, Deriv synthetic indices, real indices, and crypto.*

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

**Lotwise** is a browser-based trading position calculator. The calculator and trade journal run on your device; live prices and chart embeds connect to third-party providers. No Lotwise account or application server is required. Enter your balance, risk percentage, and trade setup to calculate a position size, estimated loss and profit, and risk-to-reward ratio, with broker minimum-lot validation.

### Why Lotwise?

| Traditional Calculators | Lotwise |
|---|---|
| Static formulas, no live prices | **Real-time price feeds** from Binance, Deriv & TradingView |
| Manual lot size entry | **Auto-calculated exact lot** based on your risk % |
| No broker minimum check | **Min-lot validation** with adjusted scenario warnings |
| No alerts | **Sound alarms + browser notifications** for entry/SL/TP hits |
| No trade journal | **Built-in journal + equity curve** with win-rate tracking |
| Web only | **Installable PWA**: works offline, launches like a native app |
| Risk capped at 1-3% | **Adjustable 0.5%–100%** with high-risk warnings |

---

## Features

### 📊 Position Calculator
- **160 trading symbols** across 4 asset classes: 35 forex, 46 synthetic indices currently listed by Deriv's public market feed, 16 real indices, and 63 crypto symbols
- **Exact lot size** auto-calculated from your risk percentage and SL distance
- **Forex pip values** converted to USD from the live quote-currency rate for cross pairs; without that conversion the calculator labels the value as estimated
- **Minimum-size validation**: warns when calculated lot is below the catalog baseline and shows the adjusted scenario; confirm broker minimums and volume steps
- **Risk-to-reward visualizer**: color-coded bar showing SL zone (red), entry marker (gold), TP zone (green)
- **0.5%–100% risk slider** with quick presets (1%, 2%, 5%, 10%, 25%, 50%, 100%)
- **Multi-currency display**: switch between USD, EUR, GBP, NGN, JPY

### 📈 Live Price Feeds
- **Crypto**: Prices from Binance REST API (63 catalog symbols; availability depends on Binance market listings)
- **Forex**: Real-time prices from TradingView Scanner API (EUR/USD, GBP/USD, 35 pairs)
- **Indices**: Real-time prices from TradingView Scanner API (US30, NAS100, DAX, 16 indices)
- **Synthetic**: Deriv's public WebSocket market-data API for 46 currently listed Boom, Crash, Volatility, Jump, Step, Range Break, and basket indices; only provider quotes are shown
- **One-click price fill**: "Fill Live Entry" auto-populates the entry field

### 🕯️ Candlestick Charts
- **TradingView widget** for Forex, Indices & Crypto (with symbol search + drawing tools)
- **Custom candlestick chart** for Synthetic indices (TradingView Lightweight Charts + Deriv candles API)
- **6 timeframes**: 1m, 5m, 15m, 1h, 4h, 1D
- **Volume histogram** + crosshair + live price overlay

### 🔔 Alarm & Notification System
- **Auto-detect** when live price hits your entry, stop loss, or take profit
- **4 distinct sound profiles** (synthesized via Web Audio API: no audio files):
  - 🎯 Entry: C-E-G major triad ascending
  - 🛑 Stop Loss: A-F-C descending sawtooth
  - 📈 Take Profit: C-E-G-C octave arpeggio
  - 🔔 Custom: E-A perfect fifth
- **Custom price alerts**: set any target price with "crosses above" or "crosses below" direction
- **Readable in-app alert cards** while Lotwise is open, plus OS notifications and Web Push while it is in the background when push is configured
- **Scheduled background monitoring** for active alerts and open journal trades; Netlify checks about once per minute, so short crossings can occur between checks
- **Adjustable volume** + per-event-type toggles
- **Preview button** to test each alarm before relying on it

### 📝 Trade Journal & Equity Curve
- **Save trades** with journal notes (up to 200 characters)
- **Automatic outcomes**: live feed price crossings record win/loss, exit price, close time, and estimated realized P/L; outcomes can also be edited manually
- **Equity curve chart**: SVG-based, includes completed trades only and orders them by close time
- **Win-rate statistics**: recorded trades, wins, win rate %
- **Replay function**: reload any saved trade's exact parameters
- **localStorage persistence**: survives page refresh

### 📱 PWA: Install as a Native App
- **Installable** on desktop (Chrome/Edge) and mobile (Chrome/Safari)
- **Standalone window**: no browser chrome
- **Offline shell**: service worker caches the UI for instant load
- **Background push alerts** are implemented with a scheduled Netlify Function; the deployed site needs VAPID keys before closed-app push can be enabled
- **App shortcuts**: quick-access to Synthetic, Forex, or Crypto tabs
- **Custom icons**: 192px, 512px, maskable, Apple touch icon, favicon

### 🔍 Searchable Symbol Picker
- **Type-to-filter** across all sub-categories simultaneously
- **Grouped display** when browsing (Majors, EUR Crosses, Volatility Indices, etc.)
- **LIVE badge** on every synthetic symbol with Deriv feed
- **Active indicator** on currently selected symbol

### ⚖️ Legal & Compliance
- **Terms of Service** (10 sections covering service nature, no financial advice, risk disclosure)
- **Privacy Policy** (9 sections: local-first storage, optional encrypted vault and background alerts, no analytics)
- **Risk Disclaimer** (10 sections + problem gambling help links)

---

## 🔴 Live Price Feeds

| Asset Class | Source | Status | Catalog symbols |
|---|---|---|---:|
| **Crypto** | Binance public REST API | ✅ Live quotes, no API key | 63 |
| **Forex** | TradingView Scanner API | ✅ Live quotes, no API key; market-hours dependent | 35 |
| **Indices** | TradingView Scanner API | ✅ Live quotes, no API key; market-hours dependent | 16 |
| **Synthetic** | Deriv public WebSocket API | ✅ Live ticks and candles, no API key | 46 |

> **Market data and alerts**: All four asset classes use live quotes from their listed external providers. The feeds are integrated and do not need provider API keys. Quote freshness still depends on the provider, market hours where applicable, and the visitor's internet connection. Lotwise does not generate substitute prices or candles. Deriv synthetic indices are synthetic market products streamed live by Deriv. If a feed disconnects, its status changes to unavailable; alerts and automatic trade closure wait for live data to resume. Netlify's background monitor checks about once per minute and can miss brief crossings.

> **Notifications**: In-app alerts and browser notifications work while the site is open when permission is granted. Closed-app Web Push requires browser permission and VAPID keys; the production keys are not currently configured (`/api/push/config` returns HTTP 503). Once configured, the Netlify monitor checks about once per minute.

> **Position sizing note**: Forex pip values use a standard 100,000-unit lot and convert the quote currency into USD using live FX data where available. The displayed conversion is still an estimate if that feed is unavailable. Crypto sizing treats one catalog lot as one coin/token. Synthetic and index point values use Lotwise's baseline assumptions; CFD contract sizes and minimum trade increments vary by broker, so verify those figures against your broker before trading.

### Current limitations

- Forex pip-value conversion quotes are configured for GBP, AUD, NZD, JPY, CHF, and CAD. Calculations that lack a live conversion use the catalog estimate and are marked as estimated.
- Journal entries, alerts, and app settings are stored on the device by default. The Alerts panel's **Data** tab can export/import a password-encrypted backup file, or optionally save/restore an encrypted snapshot through a Netlify sync vault without an account. Vault updates are manual and replace the previous snapshot. The recovery key is required; if it is lost, the vault cannot be decrypted. Keep a separate copy of the key and continue to keep offline backup files.
- The repository does not contain a built APK. Lotwise can be installed as a PWA; `scripts/build-apk.sh` documents the manual PWABuilder or Bubblewrap packaging steps.
- Offline caching covers the app shell only. Live market quotes, chart updates, and price-triggered alerts need an internet connection.
- Position sizing uses Lotwise's baseline contract and minimum-size assumptions, not a broker-specific instrument specification. Confirm contract size, lot step, and pip/point value with the broker before trading.

---

## 📸 Screenshots

### Desktop: Position Calculator with Live Candlestick Chart
<img src="download/screenshots/01-synthetic-overview.png" alt="Synthetic Overview" width="100%">

### Calculation Output: Lot Size, Risk:Reward, Stats
<img src="download/screenshots/02-calc-output.png" alt="Calc Output" width="100%">

### Risk:Reward Visual Bar + Min-Lot Warning
<img src="download/screenshots/03-rr-bar.png" alt="R:R Bar" width="100%">

### Crypto: Real Binance Live Prices
<img src="download/screenshots/04-crypto-btc.png" alt="Crypto BTC" width="100%">

### Crypto Position Calculation
<img src="download/screenshots/05-crypto-calc.png" alt="Crypto Calc" width="100%">

### Forex: Real EUR/USD Live Price
<img src="download/screenshots/06-forex-eurusd.png" alt="Forex EURUSD" width="100%">

### Alarm & Notification Panel
<img src="download/screenshots/07-alarm-panel.png" alt="Alarm Panel" width="100%">

### Alarm Settings: Sound Profiles + Volume
<img src="download/screenshots/08-alarm-settings.png" alt="Alarm Settings" width="100%">

### Equity Curve + Trade Journal
<img src="download/screenshots/09-equity-curve.png" alt="Equity Curve" width="100%">

### Legal Modal: Terms of Service
<img src="download/screenshots/10-legal-modal.png" alt="Legal Modal" width="100%">

### Mobile: Full Responsive Layout
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
| **Storage** | Browser localStorage by default; optional AES-GCM encrypted exports and Netlify Blobs sync vault |
| **Icons** | Lucide React |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 20.9 or later
- A modern browser with WebSocket support
- [Bun](https://bun.sh/) only if you want to run the optional price relay

### Installation

```bash
# Clone the repository
git clone https://github.com/BboyGT/lotwise.git
cd lotwise

# Install the exact dependency versions in the lockfile
npm ci

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The app does not require environment variables for local development. Browser price feeds connect directly to their providers. Netlify background push monitoring uses `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` environment variables. Keep the private VAPID key in Netlify's secret environment variables; never commit it. An optional Deriv WebSocket-to-HTTP relay is available for local integrations:

```bash
npm run dev:relay
```

To run the app and relay together, use `npm run dev:all` (requires Bun). The calculator and direct price feeds work without the relay.

### Build for Production

```bash
npm run build
npm run start
```

### Lint & Type Check

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript type checking
npm test              # Calculator unit tests (Vitest)
```

The calculator is a pure function (`src/lib/calculator.ts`) and is covered by unit tests in `tests/`. Forex pip values convert quote currencies to USD with live FX quotes where available; values show as estimates when the conversion feed is unavailable.

## Continuous integration and releases

GitHub Actions runs linting, TypeScript checks, tests, and a production build on pushes and pull requests to `main`, using Node.js 20 and 22. CodeQL scans the JavaScript and TypeScript code, and Dependabot checks npm dependencies and GitHub Actions weekly. Test output is retained in the workflow run logs; temporary local tool captures are intentionally not versioned.

To publish a GitHub Release and container image, update the version in `package.json` and `package-lock.json`, then push a matching version tag such as `v1.1.0`. The release workflow reruns CI, creates release notes, and publishes a Docker image to GitHub Container Registry (`ghcr.io`). Lotwise is an application, not an npm library.

---

## 🌐 Deploy Your Own

### Vercel (Recommended: Free)
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Select your repo → Deploy
4. Done! Your app is live with HTTPS (required for PWA)

> **Market data**: Prices are requested directly by each visitor's browser from the configured provider. Synthetic quotes and candles use Deriv's public WebSocket feed. If a provider or local connection is unavailable, the app reports the feed as unavailable and does not substitute simulated data.

### Netlify
1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git
3. Build command: `npm run build` (already set in `netlify.toml`)
4. Use the detected Next.js runtime with build command `npm run build` and publish directory `.next`
5. Deploy

The optional sync vault uses Netlify Blobs through the `/api/sync-vault` function. It requires no account or extra environment variables. The browser encrypts each snapshot with AES-GCM before upload; the recovery key's separate storage-access portion is used only to locate the ciphertext. Vault saves overwrite the previous snapshot, and restoring replaces the current device's journal, alerts, and preferences.

### Local Development
```bash
npm run dev
# Open http://localhost:3000
# Live prices require the browser to reach the provider's public endpoint.
```

### Register Your Own Deriv App ID (Optional)
The current public market-data endpoint requires no app ID. Register an app ID only if you choose to use the legacy WebSocket fallback:
1. Go to [api.deriv.com](https://api.deriv.com) → Register
2. Create a new app (free, takes 2 minutes)
3. Replace the legacy fallback's `app_id=1089` value in the two Deriv hooks

---

## 📁 Project Structure

```
lotwise/
├── .github/workflows/           # CI, CodeQL, release and dependency updates
├── .zscripts/                   # Project maintenance scripts
├── download/                    # Screenshots, logo and download notes
├── examples/websocket/          # WebSocket integration examples
├── mini-services/price-relay/  # Optional Bun Deriv-to-HTTP relay
├── netlify/functions/           # Push config, subscription sync and monitor
├── public/                      # PWA manifest, service worker and brand icons
├── scripts/                     # Build, APK and icon-generation scripts
├── src/
│   ├── app/                     # Next.js app, layout and global styles
│   ├── components/              # Calculator, charts, alerts and UI components
│   ├── hooks/                   # Live provider feeds, alarms and PWA behavior
│   └── lib/                     # Calculator, symbols, trade outcomes and sounds
├── tests/                       # Vitest tests for calculator, alerts and feeds
├── tool-results/                # Maintained diagnostic and tool output artifacts
├── upload/                      # Uploaded project asset
├── Caddyfile                    # Caddy deployment configuration
├── Dockerfile                   # Container build
├── netlify.toml                 # Netlify build, functions and scheduled monitor
├── next.config.ts                # Next.js configuration
├── package.json                 # Scripts and dependencies
├── vitest.config.mts             # Test runner configuration
└── README.md
```

---

## 📊 Supported Symbols (160 Total)

### Forex (35 pairs)
- **Majors** (7): EUR/USD, GBP/USD, USD/JPY, USD/CHF, USD/CAD, AUD/USD, NZD/USD
- **EUR Crosses** (6): EUR/GBP, EUR/JPY, EUR/CHF, EUR/AUD, EUR/CAD, EUR/NZD
- **GBP Crosses** (5): GBP/JPY, GBP/CHF, GBP/AUD, GBP/CAD, GBP/NZD
- **AUD Crosses** (4): AUD/JPY, AUD/CHF, AUD/CAD, AUD/NZD
- **NZD Crosses** (3): NZD/JPY, NZD/CHF, NZD/CAD
- **Other Crosses** (2): CHF/JPY, CAD/JPY
- **Exotics** (8): USD/MXN, USD/ZAR, USD/TRY, USD/SGD, USD/HKD, USD/SEK, USD/NOK, USD/DKK

### Synthetic Indices (46 symbols)
- **Boom & Crash** (14): Boom 50/150/300/500/600/900/1000, Crash 50/150/300/500/600/900/1000
- **Volatility** (5): V10, V25, V50, V75, V100
- **Volatility 1s** (8): V10, V15, V25, V30, V50, V75, V90, V100 (1s)
- **Jump** (5): Jump 10/25/50/75/100
- **Step** (5): Step 100/200/300/400/500
- **Bull/Bear** (2): Bull Market, Bear Market
- **Range Break** (2): Range Break 100/200
- **Baskets** (5): AUD, EUR, GBP, USD, and Gold

### Real Indices (16 pairs)
- **US** (4): US30, NAS100, S&P 500, Russell 2000
- **Europe** (7): GER40 (DAX), UK100 (FTSE), FRA40 (CAC), ESP35, ITA40, NETH25, SWISS20
- **Asia** (4): JPN225 (Nikkei), HKG50 (Hang Seng), AUS200 (ASX), KOSPI 200
- **Volatility** (1): VIX

### Crypto (63 symbols)
- **Major** (8): BTC, ETH, XRP, SOL, ADA, DOT, LTC, BCH
- **Layer 1 & 2** (10): AVAX, ATOM, NEAR, ARB, OP, APT, MATIC, FIL, INJ, SUI
- **DeFi & Oracles** (15): LINK, UNI, AAVE, SKY (formerly MKR), RUNE, TIA, SEI, BNB, DYDX, CRV, SUSHI, YFI, COMP, SNX, 1INCH
- **Layer 1 Additional** (8): TRX, ETC, XLM, VET, ALGO, ICP, EGLD, STX
- **Gaming & NFT** (7): SAND, MANA, AXS, GALA, THETA, CHZ, ENJ
- **Meme Coins** (5): DOGE, SHIB, PEPE, BONK, WIF
- **AI & Infrastructure** (5): RENDER (formerly RNDR), GRT, LDO, ORDI, WLD
- **Additional** (5): Sonic (formerly FTM), ZIL, FLOW, IOTA, JUP

---

## ⚖️ Disclaimer

**Lotwise is for educational purposes only.** It is not financial advice. Trading forex, synthetic indices, cryptocurrencies, and derivatives carries substantial risk of loss. You could lose all of your invested capital. Never trade with money you cannot afford to lose.

All calculations are based on standard retail broker formulas and may differ from your broker's actual execution due to spreads, slippage, swap fees, and broker-specific contract sizes. Always verify calculations independently before placing a trade.

See the in-app **Disclaimer** tab (footer link) for the full risk disclosure.

---

## 📄 License

This project is licensed under the MIT License: see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with [Next.js](https://nextjs.org) · [TradingView Lightweight Charts](https://www.tradingview.com/lightweight-charts/) · [Binance API](https://binance-docs.github.io/apidocs/) · [Deriv API](https://api.deriv.com)**

<br>

**If this project helped you, give it a ⭐**

</div>
