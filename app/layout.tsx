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

function NavBar() {
  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 shrink-0 transition-all">
      <div className="w-full px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 bg-zinc-100 rounded-md flex items-center justify-center group-hover:bg-zinc-300 transition-colors">
            <svg className="w-3.5 h-3.5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-[14px] tracking-tight text-zinc-50 group-hover:text-zinc-300 transition-colors">Second Brain</span>
        </Link>
        <div className="flex items-center gap-3">
           <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shadow-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-zinc-600 mt-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
           </div>
        </div>
      </div>
    </header>
  );
}

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
        </Providers>
      </body>
    </html>
  );
}
