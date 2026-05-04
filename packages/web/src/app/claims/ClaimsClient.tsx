'use client';

import { useEffect, useState, useCallback } from 'react';
import { Brain, CheckCircle, Loader2 } from 'lucide-react';
import { Panel, Tag, Spinner, Button, Empty, StatCard } from '@/components/ui';
import { claims } from '@/lib/api';
import type { Claim, ClaimSummary } from '@/lib/api';
import { formatDate, REJECT_CODE_MAP, cn } from '@/lib/utils';

const STATUS_TABS = ['all', 'rejected', 'pending', 'resolved'] as const;

export function ClaimsClient() {
  const [list, setList] = useState<Claim[]>([]);
  const [summary, setSummary] = useState<ClaimSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('rejected');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Claim | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        claims.list({ status: statusFilter === 'all' ? undefined : statusFilter }),
        claims.summary(),
      ]);
      setList(data);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const generateFix = async (claim: Claim) => {
    setSelected(claim);
    if (claim.ai_fix_suggestion) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/claim-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim }),
      });
      const data = await res.json();
      const updated = await claims.update(claim.id, { aiFixSuggestion: data.suggestion });
      setSelected(updated);
      setList(prev => prev.map(c => c.id === updated.id ? updated : c));
    } finally {
      setAiLoading(false);
    }
  };

  const resolve = async () => {
    if (!selected) return;
    setResolving(true);
    try {
      const updated = await claims.update(selected.id, {
        status: 'resolved',
        resolutionNote: selected.ai_fix_suggestion ?? 'Resolved',
      });
      setSelected(updated);
      setList(prev => prev.map(c => c.id === updated.id ? updated : c));
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Rejected" value={summary.rejected} variant={summary.rejected > 0 ? 'danger' : 'default'} />
          <StatCard label="Pending" value={summary.pending} variant="warn" />
          <StatCard label="Resolved" value={summary.resolved} variant="success" />
          <StatCard label="Ignored" value={summary.ignored} />
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Claims list */}
        <div className="col-span-2">
          <Panel title="Claims">
            <div className="space-y-3">
              <div className="flex gap-1">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors',
                      statusFilter === tab ? 'bg-accent text-white' : 'text-muted hover:text-text'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : list.length === 0 ? (
                <Empty message="No claims" />
              ) : (
                <div className="space-y-2 mt-1">
                  {list.map(claim => (
                    <button
                      key={claim.id}
                      onClick={() => generateFix(claim)}
                      className={cn(
                        'w-full text-left px-3 py-3 rounded-lg border transition-colors',
                        selected?.id === claim.id
                          ? 'border-accent/60 bg-accent/10'
                          : 'border-border bg-bg hover:bg-border/30'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text truncate">
                            {claim.patient_first} {claim.patient_last}
                          </p>
                          <p className="text-xs text-muted">Rx {claim.rx_number ?? '—'}</p>
                          <p className="text-xs text-muted mt-0.5">
                            {REJECT_CODE_MAP[claim.reject_code ?? ''] ?? claim.reject_message ?? 'Rejected'}
                          </p>
                        </div>
                        <Tag variant={
                          claim.status === 'rejected' ? 'danger' :
                          claim.status === 'resolved' ? 'success' :
                          claim.status === 'pending' ? 'warn' : 'default'
                        }>
                          {claim.status}
                        </Tag>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Detail pane */}
        <div className="col-span-3">
          {!selected ? (
            <div className="flex items-center justify-center h-64 text-muted text-sm border border-border rounded-xl">
              Select a claim to view details and AI fix suggestion
            </div>
          ) : (
            <div className="space-y-4">
              <Panel
                title="Claim Details"
                action={
                  selected.status !== 'resolved' && (
                    <Button variant="success" size="sm" onClick={resolve} loading={resolving}>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Mark Resolved
                    </Button>
                  )
                }
              >
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Patient', `${selected.patient_first} ${selected.patient_last}`],
                    ['Status', selected.status],
                    ['Rx Number', selected.rx_number ?? '—'],
                    ['NDC', selected.ndc ?? '—'],
                    ['BIN / PCN', `${selected.bin ?? '—'} / ${selected.pcn ?? '—'}`],
                    ['Reject Code', selected.reject_code ?? '—'],
                    ['Submitted', selected.created_at ? formatDate(selected.created_at) : '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-muted text-xs">{label}</p>
                      <p className="text-text">{value}</p>
                    </div>
                  ))}
                  <div className="col-span-2">
                    <p className="text-muted text-xs">Reject Message</p>
                    <p className="text-text">{selected.reject_message ?? '—'}</p>
                  </div>
                </div>
              </Panel>

              <Panel
                title="AI Fix Suggestion"
                action={
                  !selected.ai_fix_suggestion && (
                    <Button size="sm" onClick={() => generateFix(selected)} loading={aiLoading}>
                      <Brain className="h-3.5 w-3.5" />
                      Generate Fix
                    </Button>
                  )
                }
              >
                {aiLoading ? (
                  <div className="flex items-center gap-2 text-muted text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing claim…
                  </div>
                ) : selected.ai_fix_suggestion ? (
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-xs text-accent font-medium mb-2 flex items-center gap-1.5">
                      <Brain className="h-3 w-3" /> Resolution Steps
                    </p>
                    <p className="text-sm text-text whitespace-pre-line leading-relaxed">
                      {selected.ai_fix_suggestion}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Click &quot;Generate Fix&quot; to get AI-powered resolution steps.</p>
                )}
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
