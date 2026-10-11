"use client";
import QRCode from "react-qr-code";

export function QrDisplay({ token }: { token: string }) {
  return (
    <div className="mx-auto w-fit rounded-3xl border border-[#f2e2c9] bg-white p-4">
      <QRCode value={token} size={200} aria-label={`Reward QR code ${token}`} />
      <p className="mt-2 max-w-[200px] break-all text-center font-mono text-[10px] text-[#7a4f26]">
        {token}
      </p>
    </div>
  );
}
