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
  title: "RiskMate — Trading Position Calculator",
  description:
    "Calculate exact lot size, risk, and reward for forex, synthetic indices, real indices, and crypto trades. Live prices via TradingView.",
  keywords: [
    "trading calculator",
    "forex lot size",
    "position sizing",
    "risk management",
    "Boom 500",
    "Crash 1000",
    "EURUSD",
    "crypto calculator",
  ],
  authors: [{ name: "RiskMate" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "RiskMate — Trading Position Calculator",
    description:
      "Calculate exact lot size, risk, and reward for forex, indices, crypto trades.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RiskMate — Trading Position Calculator",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
