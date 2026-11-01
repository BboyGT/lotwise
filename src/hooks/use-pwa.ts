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

    let updateTimer: number | undefined;
    const register = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        updateTimer = window.setInterval(() => reg.update().catch(() => {}), 60_000);
      } catch (err) {
        console.warn("[PWA] SW registration failed:", err);
      }
    };
    void register();

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const isStandalone = () =>
      standaloneQuery.matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      !!(typeof navigator !== "undefined" && (navigator as { standalone?: boolean }).standalone);
    const updateInstalled = () => setIsInstalled(isStandalone());
    updateInstalled();
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    const onDisplayModeChange = () => updateInstalled();
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    standaloneQuery.addEventListener?.("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      standaloneQuery.removeEventListener?.("change", onDisplayModeChange);
      if (updateTimer != null) window.clearInterval(updateTimer);
    };
  }, []);

  async function promptInstall(): Promise<boolean | null> {
    if (!installPrompt) return null;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      return choice.outcome === "accepted";
    } catch {
      setInstallPrompt(null);
      return null;
    }
  }

  return {
    canInstall: !isInstalled,
    isInstalled,
    promptInstall,
  };
}
