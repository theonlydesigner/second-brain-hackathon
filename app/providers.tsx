"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, createContext, useContext, useState, useEffect } from "react";

// Fallback to avoid crashing before convex dev is run
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://happy-animal-123.convex.cloud");

type Mode = "demo" | "personal";

interface ModeContextType {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}

export default function Providers({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("personal");

  useEffect(() => {
    const saved = localStorage.getItem("workspace-mode") as Mode;
    if (saved === "demo" || saved === "personal") {
      setModeState(saved);
    }
  }, []);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    localStorage.setItem("workspace-mode", newMode);
  };

  return (
    <ConvexProvider client={convex}>
      <ModeContext.Provider value={{ mode, setMode }}>
        {children}
      </ModeContext.Provider>
    </ConvexProvider>
  );
}
