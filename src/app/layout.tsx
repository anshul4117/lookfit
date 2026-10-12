import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LookFit — Posture & Mobility Fitness",
  description:
    "Private, equipment-free posture awareness, spinal mobility, and lean strength fitness routines.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-teal-500/20 selection:text-teal-300">
        {children}
      </body>
    </html>
  );
}
