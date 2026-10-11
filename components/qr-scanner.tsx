"use client";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export type LastScan = { text: string; at: number } | null;

/**
 * Pure dedupe rule: the camera fires onScan on EVERY frame while a QR is
 * visible (10 fps), so without this the page verifies + toasts repeatedly.
 * Fire only when the token changed or the cooldown expired.
 */
export function shouldFireScan(
  last: LastScan,
  text: string,
  now: number,
  cooldownMs: number
): boolean {
  if (!last) return true;
  if (last.text !== text) return true;
  return now - last.at >= cooldownMs;
}

export function QrScanner({
  onScan,
  cooldownMs = 3000,
}: {
  onScan: (text: string) => void;
  cooldownMs?: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<LastScan>(null);

  useEffect(() => {
    return () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          const stopPromise = s.stop();
          if (stopPromise && typeof stopPromise.catch === "function") {
            stopPromise.catch(() => {});
          }
        } catch {
          // already stopped
        }
        try {
          s.clear();
        } catch {
          // already cleared
        }
      }
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const elId = "mehfil-qr-reader";
      // Stop any previous instance before starting a new one.
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // already stopped
        }
        try {
          scannerRef.current.clear();
        } catch {
          // already cleared
        }
        scannerRef.current = null;
      }
      const scanner = new Html5Qrcode(elId);
      scannerRef.current = scanner;
      lastScanRef.current = null;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          // Same QR stays in view across frames - report it once per cooldown.
          if (!shouldFireScan(lastScanRef.current, decoded, Date.now(), cooldownMs)) {
            return;
          }
          lastScanRef.current = { text: decoded, at: Date.now() };
          onScan(decoded);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      setError("Camera unavailable. You can paste the token manually below.");
    }
  }

  async function stop() {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
      } catch {
        // already stopped
      }
      try {
        s.clear();
      } catch {
        // already cleared
      }
    }
    setScanning(false);
  }

  return (
    <div>
      <div id="mehfil-qr-reader" className="overflow-hidden rounded-3xl border border-[#f2e2c9] bg-black" />
      {error ? <p className="mt-2 text-sm font-medium text-red-800">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        {!scanning ? (
          <button
            type="button"
            onClick={start}
            className="min-h-[52px] flex-1 rounded-2xl bg-[#2b1a0e] px-5 text-base font-bold text-[#fdf8f0]"
          >
            📷 START CAMERA
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="min-h-[52px] flex-1 rounded-2xl border border-[#e5d3b3] bg-white px-5 text-base font-bold text-[#5a3a1e]"
          >
            STOP
          </button>
        )}
      </div>
    </div>
  );
}
