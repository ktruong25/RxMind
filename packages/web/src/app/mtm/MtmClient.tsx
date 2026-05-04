'use client';

import { useEffect, useState, useCallback } from 'react';
import { Scan, DollarSign } from 'lucide-react';
import { Panel, Tag, Spinner, Button, Empty, StatCard } from '@/components/ui';
import { mtm } from '@/lib/api';
import type { MtmOpportunity, MtmSummary, MtmScanResult, UpdateMtmInput } from '@/lib/api';
import { formatDate, formatCurrency, cn } from '@/lib/utils';

const STATUS_TABS = ['all', 'open', 'scheduled', 'completed', 'billed'] as const;

const MTM_LABELS: Record<string, string> = {
  cmt:           'Comprehensive Medication Review',
  imt:           'Targeted Medication Review',
  tmo:           'Medication-Related Action Plan',
  annual_review: 'Annual Wellness Review',
  adherence:     'Adherence Consultation',
};

export function MtmClient() {
  const [list, setList] = useState<MtmOpportunity[]>([]);
  const [summary, setSummary] = useState<MtmSummary | null>(null);
  const [filter, setFilter] = useState<string>('open');
  const [loading, setLoading] = useState(true);
  const [scanResults, setScanResults] = useState<MtmScanResult[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        mtm.list(filter === 'all' ? undefined : filter),
        mtm.summary(),
      ]);
      setList(data);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const runScan = async () => {
    setScanning(true);
    try {
      const results = await mtm.scan();
      setScanResults(results);
    } finally {
      setScanning(false);
    }
  };

  const updateStatus = async (id: string, status: UpdateMtmInput['status']) => {
    setUpdating(id);
    try {
      const updated = await mtm.update(id, { status });
      setList(prev => prev.map(m => m.id === updated.id ? updated : m));
      if (status === 'completed' || status === 'billed') {
        const s = await mtm.summary();
        setSummary(s);
      }
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Open Opportunities" value={summary.open} />
          <StatCard label="Scheduled" value={summary.scheduled} variant="warn" />
          <StatCard label="Completed" value={summary.completed} variant="success" />
          <StatCard label="Total Billed" value={formatCurrency(Number(summary.total_billed))} variant="success" icon={<DollarSign className="h-4 w-4" />} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Panel
            title="MTM Opportunities"
            action={
              <Button size="sm" onClick={runScan} loading={scanning}>
                <Scan className="h-3.5 w-3.5" />
                Scan Eligible Patients
              </Button>
            }
          >
            <div className="space-y-3">
              <div className="flex gap-1">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors',
                      filter === tab ? 'bg-accent text-white' : 'text-muted hover:text-text'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : list.length === 0 ? (
                <Empty message="No MTM opportunities" />
              ) : (
                <div className="space-y-2 mt-1">
                  {list.map(opp => (
                    <div
                      key={opp.id}
                      className="p-4 rounded-lg border border-border bg-bg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text">
                            {opp.patient_first} {opp.patient_last}
                          </p>
                          <p className="text-xs text-muted mt-0.5">
                            {MTM_LABELS[opp.type] ?? opp.type}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            {opp.billable_amount && (
                              <span className="text-xs text-success font-medium">
                                {formatCurrency(opp.billable_amount)} · {opp.billable_code}
                              </span>
                            )}
                            {opp.scheduled_at && (
                              <span className="text-xs text-muted">
                                Scheduled {formatDate(opp.scheduled_at)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Tag variant={
                            opp.status === 'billed' ? 'success' :
                            opp.status === 'completed' ? 'info' :
                            opp.status === 'scheduled' ? 'warn' :
                            opp.status === 'declined' ? 'danger' : 'default'
                          }>
                            {opp.status}
                          </Tag>
                          {opp.status === 'open' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={updating === opp.id}
                              onClick={() => updateStatus(opp.id, 'scheduled' as const)}
                            >
                              Schedule
                            </Button>
                          )}
                          {opp.status === 'scheduled' && (
                            <Button
                              size="sm"
                              loading={updating === opp.id}
                              onClick={() => updateStatus(opp.id, 'completed' as const)}
                            >
                              Complete
                            </Button>
                          )}
                          {opp.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="success"
                              loading={updating === opp.id}
                              onClick={() => updateStatus(opp.id, 'billed' as const)}
                            >
                              Bill
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Scan results */}
        <div>
          <Panel title="Eligible Patients">
            {!scanResults ? (
              <div className="text-center py-8">
                <Scan className="h-8 w-8 text-muted mx-auto mb-3" />
                <p className="text-sm text-muted">Run a scan to find patients<br />eligible for MTM services.</p>
                <Button size="sm" className="mt-4" onClick={runScan} loading={scanning}>
                  Run Scan
                </Button>
              </div>
            ) : scanResults.length === 0 ? (
              <Empty message="No eligible patients found" />
            ) : (
              <div className="space-y-2">
                {scanResults.map(pt => (
                  <div key={pt.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm text-text">{pt.first_name} {pt.last_name}</p>
                      <p className="text-xs text-muted">{pt.chronic_med_count} chronic meds</p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        await mtm.create({ patientId: pt.id, type: 'cmt' });
                        await load();
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
