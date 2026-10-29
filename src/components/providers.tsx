"use client";

import { useEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n/provider";

export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] text-[var(--ink)]">
        <div className="animate-pulse text-sm tracking-wide">HarborWMS</div>
      </div>
    );
  }

  return (
    <I18nProvider>
      <TooltipProvider>
        {children}
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </I18nProvider>
  );
}
