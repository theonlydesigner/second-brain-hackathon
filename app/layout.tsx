import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Second Brain AI",
  description: "Unlock your knowledge with AI.",
};

import NavBar from "./components/NavBar";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} w-full h-full antialiased bg-zinc-950`}
    >
      <body className="w-full min-h-screen flex flex-col bg-zinc-950 text-zinc-50 selection:bg-zinc-800 selection:text-zinc-50 m-0 p-0 overflow-x-hidden">
        <Providers>
          <NavBar />
          {children}
          <Toaster theme="dark" position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
