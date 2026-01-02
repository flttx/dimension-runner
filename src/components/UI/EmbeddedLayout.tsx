"use client";

import type { ReactNode } from "react";

export default function EmbeddedLayout({ children }: { children: ReactNode }) {
  return <div className="embed-shell">{children}</div>;
}
