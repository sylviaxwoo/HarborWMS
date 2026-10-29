"use client";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";

export default function ReportsPage() {
  const { t } = useI18n();
  return (
    <div>
      <PageHeader title={t.reports.title} />
      <Card className="border-dashed border-amber-300 bg-amber-50/70">
        <CardContent className="flex items-start gap-3 pt-6">
          <Badge className="bg-amber-200 text-amber-900 hover:bg-amber-200">
            {t.nav.planned}
          </Badge>
          <p className="text-sm text-amber-950">{t.reports.plannedBody}</p>
        </CardContent>
      </Card>
    </div>
  );
}
