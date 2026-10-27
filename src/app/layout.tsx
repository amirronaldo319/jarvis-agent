import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({ variable: "--f-orbitron", subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });
const rajdhani = Rajdhani({ variable: "--f-rajdhani", subsets: ["latin"], weight: ["500", "600", "700"], display: "swap" });
const mono = Share_Tech_Mono({ variable: "--f-mono", subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: "Jarvis",
  description: "Personal AI agent: chat, tasks and an honest activity log.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#020812" };

const THEME_SCRIPT = `try{var t=JSON.parse(localStorage.getItem("jv.settings")||"{}").theme;if(t==="alert"||t==="stark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="jarvis" suppressHydrationWarning className={`${orbitron.variable} ${rajdhani.variable} ${mono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body>{children}</body>
    </html>
  );
}
