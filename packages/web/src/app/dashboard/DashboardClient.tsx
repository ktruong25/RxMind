'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Package, Users, FileX, Pill, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { StatCard, Panel, Tag, Spinner, Button } from '@/components/ui';
import { inventory, alerts, patients, claims, mtm } from '@/lib/api';
import type { InventorySummary, Alert, NonAdherentPatient, ClaimSummary, MtmSummary } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export function DashboardClient() {
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const [invSummary, setInvSummary] = useState<InventorySummary | null>(null);
  const [unackedAlerts, setUnackedAlerts] = useState<Alert[]>([]);
  const [nonAdherent, setNonAdherent] = useState<NonAdherentPatient[]>([]);
  const [claimSummary, setClaimSummary] = useState<ClaimSummary | null>(null);
  const [mtmSummary, setMtmSummary] = useState<MtmSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, al, na, cl, mt] = await Promise.all([
        inventory.summary(),
        alerts.list({ acknowledged: false }),
        patients.nonAdherent(),
        claims.summary(),
        mtm.summary(),
      ]);
      setInvSummary(inv);
      setUnackedAlerts(al.slice(0, 5));
      setNonAdherent(na);
      setClaimSummary(cl);
      setMtmSummary(mt);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateBriefing = async () => {
    if (!invSummary || !claimSummary || !mtmSummary) return;
    setBriefingLoading(true);
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: {
            expiringSoon: invSummary.expiring_90,
            expiredValue: Number(invSummary.expired_value),
            rejectedClaims: claimSummary.rejected,
            nonAdherentPatients: nonAdherent.length,
            openMtm: mtmSummary.open,
            topAlerts: unackedAlerts.slice(0, 3).map(a => a.title),
          },
        }),
      });
      const data = await res.json();
      setBriefing(data.briefing);
    } catch (err) {
      console.error(err);
    } finally {
      setBriefingLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !briefing) generateBriefing();
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Briefing */}
      <Panel
        title="Morning Briefing"
        action={
          <Button variant="ghost" size="sm" onClick={generateBriefing} loading={briefingLoading}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      >
        {briefingLoading ? (
          <div className="flex items-center gap-3 text-muted text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating AI briefing…
          </div>
        ) : briefing ? (
          <p className="text-sm text-text leading-relaxed">{briefing}</p>
        ) : (
          <p className="text-sm text-muted">No briefing available.</p>
        )}
      </Panel>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Expired Inventory"
          value={invSummary?.expired ?? 0}
          sub={formatCurrency(Number(invSummary?.expired_value ?? 0)) + ' at risk'}
          icon={<Package className="h-4 w-4" />}
          variant={invSummary && invSummary.expired > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Expiring ≤30 Days"
          value={invSummary?.expiring_30 ?? 0}
          sub={`${invSummary?.expiring_60 ?? 0} within 60 days`}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={invSummary && invSummary.expiring_30 > 0 ? 'warn' : 'default'}
        />
        <StatCard
          label="Rejected Claims"
          value={claimSummary?.rejected ?? 0}
          sub={`${claimSummary?.pending ?? 0} pending`}
          icon={<FileX className="h-4 w-4" />}
          variant={claimSummary && claimSummary.rejected > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Open MTM"
          value={mtmSummary?.open ?? 0}
          sub={`$${mtmSummary?.total_billed ?? 0} billed total`}
          icon={<Pill className="h-4 w-4" />}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent alerts */}
        <Panel title="Active Alerts" action={<Tag variant="danger">{unackedAlerts.length} unread</Tag>}>
          {unackedAlerts.length === 0 ? (
            <p className="text-sm text-muted">No active alerts.</p>
          ) : (
            <div className="space-y-3">
              {unackedAlerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-danger' :
                    alert.severity === 'high' ? 'bg-warn' : 'bg-accent'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm text-text truncate">{alert.title}</p>
                    {alert.body && <p className="text-xs text-muted truncate">{alert.body}</p>}
                  </div>
                  <Tag variant={
                    alert.severity === 'critical' ? 'danger' :
                    alert.severity === 'high' ? 'warn' : 'default'
                  }>
                    {alert.severity}
                  </Tag>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Non-adherent patients */}
        <Panel
          title="Non-Adherent Patients"
          action={<Tag variant="warn">{nonAdherent.length} flagged</Tag>}
        >
          {nonAdherent.length === 0 ? (
            <p className="text-sm text-muted">All patients on track.</p>
          ) : (
            <div className="space-y-3">
              {nonAdherent.slice(0, 5).map(pt => (
                <div key={pt.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-text">{pt.first_name} {pt.last_name}</p>
                    <p className="text-xs text-muted">{pt.phone}</p>
                  </div>
                  <Tag variant="warn">{pt.overdue_count} overdue</Tag>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* MTM Revenue */}
      {mtmSummary && (
        <Panel title="MTM Pipeline">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Open', value: mtmSummary.open },
              { label: 'Scheduled', value: mtmSummary.scheduled },
              { label: 'Completed', value: mtmSummary.completed },
              { label: 'Billed', value: mtmSummary.billed, sub: formatCurrency(Number(mtmSummary.total_billed)) },
            ].map(({ label, value, sub }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-text">{value}</p>
                <p className="text-xs text-muted mt-1">{label}</p>
                {sub && <p className="text-xs text-success mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
