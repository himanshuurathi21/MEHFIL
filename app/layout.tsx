import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa";

export const metadata: Metadata = {
  title: "MEHFIL - Loyalty & Rewards",
  description: "Earn rewards every time you visit MEHFIL.",
  icons: { icon: "/icon", apple: "/apple-icon" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MEHFIL" },
};

export const viewport: Viewport = {
  themeColor: "#2b1a0e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#fdf8f0] text-[#1c1008] antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
