"use client";
import { useEffect, useState } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

export function InstallBanner() {
  const [deferred, setDeferred] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  async function install() {
    const d = deferred as unknown as { prompt: () => Promise<void> } | null;
    if (d) {
      await d.prompt();
      setDeferred(null);
    } else {
      setDismissed(true);
    }
  }

  return (
    <div className="mt-4 rounded-3xl border border-[#f2e2c9] bg-white p-4">
      <p className="text-sm font-extrabold">📲 Install the MEHFIL app</p>
      <p className="mt-0.5 text-xs text-[#7a4f26]">
        {deferred
          ? "Add to your home screen in one tap - open fast via QR."
          : "Android: Chrome menu → Add to Home Screen. iPhone: Share → Add to Home Screen."}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={install}
          className="min-h-[44px] flex-1 rounded-2xl bg-[#2b1a0e] px-4 text-sm font-black text-[#fdf8f0]"
        >
          {deferred ? "INSTALL" : "GOT IT"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="min-h-[44px] rounded-2xl border border-[#e5d3b3] px-4 text-sm font-bold"
        >
          Later
        </button>
      </div>
    </div>
  );
}
