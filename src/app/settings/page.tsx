"use client";

import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const state = useWmsStore();

  return (
    <div className="space-y-4">
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.common.language}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh-CN">中文 (zh-CN)</SelectItem>
              <SelectItem value="en-US">English (en-US)</SelectItem>
              <SelectItem value="es-US">Español (es-US)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.common.role}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-teal-900/60">{t.demoBanner}</p>
          <Select value={state.currentUserId} onValueChange={state.setCurrentUser}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} · {(t.roles as Record<string, string>)[u.role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Owner read-only user only sees Aurora owner data. Switch to verify A14.
          </div>
        </CardContent>
      </Card>

      <Card className="border-teal-900/10 bg-white/80">
        <CardHeader>
          <CardTitle className="text-base">{t.common.reset}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-teal-900/65">{t.settings.persistence}</p>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm(t.common.resetHint)) {
                state.resetDemo();
                toast.success(t.common.reset);
              }
            }}
          >
            {t.common.reset}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
