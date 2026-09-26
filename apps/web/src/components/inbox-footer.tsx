"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLocale } from "@/i18n/context";
import { SitePageLinks } from "@/components/site-page-links";

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function formatRelativeTime(iso: string, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return locale === "es" ? "hace un momento" : "just now";
  if (minutes < 60) return locale === "es" ? `hace ${minutes} minuto${minutes === 1 ? "" : "s"}` : `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale === "es" ? `hace ${hours} hora${hours === 1 ? "" : "s"}` : `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return locale === "es" ? `hace ${days} día${days === 1 ? "" : "s"}` : `${days} day${days === 1 ? "" : "s"} ago`;
}

// Pie de página persistente estilo Gmail: uso de espacio del buzón
// principal (dato real vía cuota IMAP, no inventado — si el hosting no la
// expone, esa parte simplemente no se muestra), enlaces legales, última
// actividad de la cuenta, y el crédito de la empresa.
export function InboxFooter() {
  const { t, locale } = useLocale();
  const [quota, setQuota] = useState<{ usedBytes: number; limitBytes: number } | null>(null);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [accounts, profile] = await Promise.all([api.mailAccounts.list(), api.me.getProfile()]);
        if (cancelled) return;
        setLastLoginAt(profile.lastLoginAt);
        const target = accounts.find((a) => a.isPrimary) ?? accounts[0];
        if (target) {
          const q = await api.mailAccounts.quota(target.id).catch(() => null);
          if (!cancelled) setQuota(q);
        }
      } catch {
        // El footer es informativo — si falla, simplemente no se muestra esa parte.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const percent = quota ? Math.min(100, Math.round((quota.usedBytes / quota.limitBytes) * 100)) : null;

  return (
    <div className="shrink-0 border-t border-border bg-surface px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {quota && percent !== null ? (
          <div className="flex min-w-0 shrink-0 flex-col gap-1">
            <span className="whitespace-nowrap">
              {t("footer.using")} {percent}% {t("footer.of")} {formatBytes(quota.limitBytes)}
            </span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ) : (
          <span />
        )}

        <SitePageLinks className="flex items-center gap-1.5" />

        <div className="flex shrink-0 items-center gap-3">
          {lastLoginAt ? (
            <span className="whitespace-nowrap">
              {t("footer.lastActivity")}: {formatRelativeTime(lastLoginAt, locale)}
            </span>
          ) : null}
          <Link href="/inbox/settings" className="whitespace-nowrap hover:text-accent">
            {t("footer.details")}
          </Link>
        </div>
      </div>

      <p className="mt-1 text-center text-[11px] text-muted-foreground/70">{t("footer.copyright")}</p>
    </div>
  );
}
