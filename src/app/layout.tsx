import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals-mark.css";
import { Toaster } from "@/components/ui/toaster";
import { CustomScrollbar } from "@/components/custom-scrollbar";
import { GTMonogram } from "@/components/gt-mark";

/**
 * Inline script that updates the CSS variable --scroll-percent on scroll.
 * This drives the "depth gauge" effect on the scrollbar track.
 * Must run before hydration to avoid layout shift.
 */
function ScrollProgressScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){var t=false;function u(){var s=window.scrollY||document.documentElement.scrollTop;var h=document.documentElement.scrollHeight-document.documentElement.clientHeight;var p=h>0?Math.round(s/h*100):0;document.documentElement.style.setProperty('--scroll-percent',p+'%');t=false}function r(){if(!t){t=true;requestAnimationFrame(u)}}window.addEventListener('scroll',r,{passive:true});window.addEventListener('resize',r,{passive:true});u()})();`,
      }}
    />
  );
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lotwise — Trading Position Calculator",
  description:
    "Calculate exact lot size, risk, and reward for forex, synthetic indices, real indices, and crypto trades. Live prices via Deriv WebSocket + TradingView.",
  keywords: [
    "trading calculator",
    "forex lot size",
    "position sizing",
    "risk management",
    "Boom 300",
    "Boom 500",
    "Crash 1000",
    "Volatility 75",
    "Deriv",
    "crypto calculator",
  ],
  authors: [{ name: "Lotwise" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Lotwise — Trading Position Calculator",
    description:
      "Calculate exact lot size, risk, and reward for forex, indices, crypto trades.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lotwise — Trading Position Calculator",
    description:
      "Calculate exact lot size, risk, and reward for forex, indices, crypto trades.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0f1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lotwise" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ScrollProgressScript />
        <CustomScrollbar />
        <GTMonogram />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
