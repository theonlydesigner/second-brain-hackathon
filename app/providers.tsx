"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Fallback to avoid crashing before convex dev is run
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://happy-animal-123.convex.cloud");

export default function Providers({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
