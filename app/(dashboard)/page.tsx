import db, { toIso } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import OverviewClient from "./OverviewClient";
import {
  accessLists,
  auditEvents,
  certificates,
  proxyHosts
} from "@/src/lib/db/schema";
import { count, desc, isNull, sql } from "drizzle-orm";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SecurityIcon from "@mui/icons-material/Security";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import { ReactNode } from "react";
import { getAnalyticsSummary } from "@/src/lib/analytics-db";
import { getGeneralSettings } from "@/src/lib/settings";
import { isProxyHostPublicCertAutomationEnabled } from "@/src/lib/proxy-host-automatic-https";

type StatCard = {
  label: string;
  icon: ReactNode;
  count: number;
  href: string;
};

async function loadStats(): Promise<StatCard[]> {
  const [general, proxyHostCountResult, autoCertCandidates, importedCertCountResult, accessListCountResult] =
    await Promise.all([
      getGeneralSettings(),
      db.select({ value: count() }).from(proxyHosts),
      db.select({ certificateId: proxyHosts.certificateId, meta: proxyHosts.meta }).from(proxyHosts).where(isNull(proxyHosts.certificateId)),
      // Imported certs with actual PEM data (valid, user-managed)
      db.select({ value: count() }).from(certificates).where(
        sql`${certificates.type} = 'imported' AND ${certificates.certificatePem} IS NOT NULL`
      ),
      db.select({ value: count() }).from(accessLists)
    ]);
  const proxyHostsCount = proxyHostCountResult[0]?.value ?? 0;
  const globalPublicCertAutomationEnabled = general?.publicCertAutomationEnabled ?? true;
  const acmeCertCount = autoCertCandidates.filter((row) =>
    isProxyHostPublicCertAutomationEnabled({
      certificateId: row.certificateId,
      meta: row.meta,
      globalPublicCertAutomationEnabled
    })
  ).length;
  const certificatesCount = acmeCertCount + (importedCertCountResult[0]?.value ?? 0);
  const accessListsCount = accessListCountResult[0]?.value ?? 0;

  return [
    { label: "Proxy Hosts", icon: <SwapHorizIcon fontSize="large" />, count: proxyHostsCount, href: "/proxy-hosts" },
    { label: "Certificates", icon: <SecurityIcon fontSize="large" />, count: certificatesCount, href: "/certificates" },
    { label: "Access Lists", icon: <VpnKeyIcon fontSize="large" />, count: accessListsCount, href: "/access-lists" }
  ];
}

export default async function OverviewPage() {
  const session = await requireAdmin();
  const [stats, trafficSummary, recentEventsRaw] = await Promise.all([
    loadStats(),
    getAnalyticsSummary(Math.floor(Date.now() / 1000) - 86400, Math.floor(Date.now() / 1000), []).catch(() => null),
    db
      .select({
        action: auditEvents.action,
        entityType: auditEvents.entityType,
        summary: auditEvents.summary,
        createdAt: auditEvents.createdAt
      })
      .from(auditEvents)
      .orderBy(desc(auditEvents.createdAt))
      .limit(8),
  ]);

  return (
    <OverviewClient
      userName={session.user.name ?? session.user.email ?? "Admin"}
      stats={stats}
      trafficSummary={trafficSummary}
      recentEvents={recentEventsRaw.map((event) => ({
        summary: event.summary ?? `${event.action} on ${event.entityType}`,
        created_at: toIso(event.createdAt)!
      }))}
    />
  );
}
