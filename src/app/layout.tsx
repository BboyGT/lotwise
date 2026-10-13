import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
