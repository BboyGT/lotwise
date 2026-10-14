"use client";

import { useEffect, useState } from "react";

// ===========================================================================
// PWA install prompt + service worker registration hook
// ===========================================================================

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        setInterval(() => reg.update().catch(() => {}), 60_000);
      } catch (err) {
        console.warn("[PWA] SW registration failed:", err);
      }
    };
    register();

    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(typeof navigator !== "undefined" && (navigator as { standalone?: boolean }).standalone);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (installed) setIsInstalled(true);
    /* eslint-enable react-hooks/set-state-in-effect */

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    return choice.outcome === "accepted";
  }

  return {
    canInstall: !!installPrompt,
    isInstalled,
    promptInstall,
  };
}
