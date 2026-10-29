"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  Forklift,
  LayoutDashboard,
  MapPinned,
  PackageOpen,
  PackageSearch,
  Receipt,
  RefreshCw,
  Settings2,
  Ship,
  Split,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/provider";
import { useWmsStore } from "@/lib/store";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { href: "/", key: "workbench", icon: LayoutDashboard },
  { href: "/inbound", key: "inbound", icon: PackageOpen },
  { href: "/outbound", key: "outbound", icon: ClipboardList },
  { href: "/inventory", key: "inventory", icon: PackageSearch },
  { href: "/locations", key: "locations", icon: MapPinned },
  { href: "/smart-allocate", key: "smartAllocate", icon: Split },
  { href: "/fleet", key: "fleet", icon: Ship },
  { href: "/assets", key: "assets", icon: Boxes },
  { href: "/billing", key: "billing", icon: Receipt },
  { href: "/reports", key: "reports", icon: Warehouse, planned: true },
  { href: "/integration", key: "integration", icon: RefreshCw },
  { href: "/settings", key: "settings", icon: Settings2 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();
  const users = useWmsStore((s) => s.users);
  const currentUserId = useWmsStore((s) => s.currentUserId);
  const setCurrentUser = useWmsStore((s) => s.setCurrentUser);
  const resetDemo = useWmsStore((s) => s.resetDemo);
  const currentUser = users.find((u) => u.id === currentUserId);

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #0f766e 1px, transparent 1px), linear-gradient(to bottom, #0f766e 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-teal-900/10 bg-[color-mix(in_oklab,var(--surface)_88%,white)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 md:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-800 text-white shadow-sm transition group-hover:scale-[1.03]">
              <Forklift className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-teal-950">
                {t.brand}
              </span>
              <span className="hidden text-[11px] text-teal-900/60 sm:block">
                {t.brandTag}
              </span>
            </span>
          </Link>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select
              value={locale}
              onValueChange={(v) => setLocale(v as Locale)}
            >
              <SelectTrigger className="h-9 w-[110px] bg-white/70">
                <SelectValue placeholder={t.common.language} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">中文</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
                <SelectItem value="es-US">Español</SelectItem>
              </SelectContent>
            </Select>

            <Select value={currentUserId} onValueChange={setCurrentUser}>
              <SelectTrigger className="h-9 min-w-[160px] bg-white/70">
                <SelectValue placeholder={t.common.role} />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} · {(t.roles as Record<string, string>)[u.role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="bg-white/70"
              onClick={() => {
                if (confirm(t.common.resetHint)) {
                  resetDemo();
                  toast.success(t.common.reset);
                }
              }}
            >
              {t.common.reset}
            </Button>
          </div>
        </div>
        <div className="bg-teal-900 px-4 py-1.5 text-center text-xs text-teal-50 md:px-6">
          {t.demoBanner}
          {currentUser ? (
            <span className="opacity-80">
              {" "}
              · {currentUser.name} (
              {(t.roles as Record<string, string>)[currentUser.role]})
            </span>
          ) : null}
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6">
        <aside className="h-fit rounded-2xl border border-teal-900/10 bg-white/70 p-2 shadow-sm backdrop-blur md:sticky md:top-28">
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              const label = (t.nav as Record<string, string>)[item.key];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-max items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-teal-800 text-white shadow-sm"
                      : "text-teal-950/80 hover:bg-teal-50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                  {"planned" in item && item.planned ? (
                    <span
                      className={cn(
                        "ml-auto rounded px-1.5 py-0.5 text-[10px]",
                        active ? "bg-white/20" : "bg-amber-100 text-amber-800"
                      )}
                    >
                      {t.nav.planned}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 animate-in fade-in duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
