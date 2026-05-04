'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronRight, Loader2, Brain } from 'lucide-react';
import { Panel, Tag, Spinner, Button, Input, Empty } from '@/components/ui';
import { patients } from '@/lib/api';
import type { Patient, PatientDetail } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export function PatientsClient() {
  const [list, setList] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PatientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await patients.list(search || undefined);
      setList(data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const selectPatient = async (id: string) => {
    setDetailLoading(true);
    setAiSummary(null);
    try {
      const detail = await patients.get(id);
      const adherence = await patients.adherence(id);
      setSelected({ ...detail, prescriptions: adherence });
    } finally {
      setDetailLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/patient-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient: selected, prescriptions: selected.prescriptions }),
      });
      const data = await res.json();
      setAiSummary(data.summary);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-5 gap-6 h-full">
      {/* Patient list */}
      <div className="col-span-2 space-y-4">
        <Input
          placeholder="Search patients…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
        ) : list.length === 0 ? (
          <Empty message="No patients found" />
        ) : (
          <div className="space-y-1">
            {list.map(pt => (
              <button
                key={pt.id}
                onClick={() => selectPatient(pt.id)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  selected?.id === pt.id
                    ? 'border-accent/60 bg-accent/10'
                    : 'border-border bg-surface hover:bg-border/40'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {pt.last_name}, {pt.first_name}
                  </p>
                  <p className="text-xs text-muted">{pt.phone ?? pt.email ?? 'No contact'}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail pane */}
      <div className="col-span-3">
        {detailLoading ? (
          <div className="flex justify-center py-24"><Spinner className="h-8 w-8" /></div>
        ) : !selected ? (
          <div className="flex items-center justify-center h-64 text-muted text-sm">
            Select a patient to view details
          </div>
        ) : (
          <div className="space-y-4">
            <Panel
              title={`${selected.first_name} ${selected.last_name}`}
              action={
                <Button size="sm" onClick={generateSummary} loading={aiLoading}>
                  <Brain className="h-3.5 w-3.5" />
                  AI Summary
                </Button>
              }
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted text-xs">Date of Birth</p>
                  <p className="text-text">{selected.dob ? formatDate(selected.dob) : '—'}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Phone</p>
                  <p className="text-text">{selected.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Email</p>
                  <p className="text-text">{selected.email ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Gender</p>
                  <p className="text-text">{selected.gender ?? '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted text-xs mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.allergy_list && selected.allergy_list.length > 0
                      ? selected.allergy_list.map(a => <Tag key={a} variant="danger">{a}</Tag>)
                      : <Tag variant="success">NKDA</Tag>
                    }
                  </div>
                </div>
              </div>

              {aiSummary && (
                <div className="mt-4 p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-xs text-accent font-medium mb-2 flex items-center gap-1.5">
                    <Brain className="h-3 w-3" /> AI Clinical Summary
                  </p>
                  <p className="text-sm text-text leading-relaxed">{aiSummary}</p>
                </div>
              )}
              {aiLoading && (
                <div className="mt-4 flex items-center gap-2 text-muted text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating clinical summary…
                </div>
              )}
            </Panel>

            {/* Active prescriptions */}
            <Panel title="Active Prescriptions">
              {selected.prescriptions.length === 0 ? (
                <Empty message="No active prescriptions" />
              ) : (
                <div className="space-y-3">
                  {selected.prescriptions.map(rx => {
                    const status = (rx as {adherence_status?: string}).adherence_status;
                    return (
                      <div key={rx.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text">
                            {rx.generic_name ?? rx.brand_name ?? rx.ndc}
                          </p>
                          <p className="text-xs text-muted">{rx.sig ?? 'No directions'}</p>
                          <p className="text-xs text-muted mt-0.5">
                            Next fill: {rx.next_fill_due ? formatDate(rx.next_fill_due) : '—'}
                            {' · '}{rx.refills_remaining ?? 0} refills left
                          </p>
                        </div>
                        {status && (
                          <Tag variant={
                            status === 'non_adherent' ? 'danger' :
                            status === 'overdue' ? 'warn' :
                            status === 'on_track' ? 'success' : 'default'
                          }>
                            {status.replace('_', ' ')}
                          </Tag>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
