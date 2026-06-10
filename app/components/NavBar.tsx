"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useMode } from "../providers";

export default function NavBar() {
  const { mode, setMode } = useMode();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 text-xs font-semibold uppercase tracking-wider text-zinc-300 transition-all cursor-pointer shadow-sm"
          >
            <span>{mode} Mode</span>
            <svg className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => {
                  setMode("personal");
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg text-left transition-colors cursor-pointer ${
                  mode === "personal"
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <span>Personal Mode</span>
                {mode === "personal" && (
                  <svg className="w-4 h-4 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => {
                  setMode("demo");
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg text-left transition-colors cursor-pointer ${
                  mode === "demo"
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <span>Demo Mode</span>
                {mode === "demo" && (
                  <svg className="w-4 h-4 text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
