import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import EnvBanner from "./EnvBanner";
import { publicConfig } from "@/lib/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CI/CD med Render",
  description: "Next.js-app som driftsätts med Docker, GitHub Actions och Render",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Suspense fallback={null}>
          <EnvBanner />
        </Suspense>
        <header className="site-header">
          <nav className="site-nav">
            <strong>{publicConfig.appName}</strong>
            <Link href="/">Hem</Link>
            <Link href="/todos">Att göra</Link>
            <Link href="/om">Om</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">Next.js · Docker · GitHub Actions · Render</footer>
      </body>
    </html>
  );
}
