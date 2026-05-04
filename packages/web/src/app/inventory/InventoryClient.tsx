'use client';

import { useEffect, useState, useCallback } from 'react';
import { ScanLine, X } from 'lucide-react';
import { Panel, Tag, Spinner, Button, Input, Empty, StatCard } from '@/components/ui';
import { inventory } from '@/lib/api';
import type { InventoryItem, InventorySummary } from '@/lib/api';
import { formatDate, expiryWindow, expiryColor, formatCurrency, cn } from '@/lib/utils';

const TABS = [
  { key: 'all',     label: 'All' },
  { key: 'expired', label: 'Expired' },
  { key: '30',      label: '≤30 days' },
  { key: '60',      label: '≤60 days' },
  { key: '90',      label: '≤90 days' },
] as const;

export function InventoryClient() {
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanOpen, setScanOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        inventory.list(filter === 'all' ? undefined : filter, search || undefined),
        inventory.summary(),
      ]);
      setItems(data);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard label="Total Active" value={summary.total_active} />
          <StatCard label="Expired" value={summary.expired} variant={summary.expired > 0 ? 'danger' : 'default'} sub={formatCurrency(Number(summary.expired_value))} />
          <StatCard label="≤30 Days" value={summary.expiring_30} variant={summary.expiring_30 > 0 ? 'danger' : 'default'} />
          <StatCard label="≤60 Days" value={summary.expiring_60} variant={summary.expiring_60 > 0 ? 'warn' : 'default'} />
          <StatCard label="≤90 Days" value={summary.expiring_90} />
        </div>
      )}

      <Panel
        title="Inventory"
        action={
          <Button size="sm" onClick={() => setScanOpen(true)}>
            <ScanLine className="h-3.5 w-3.5" />
            Scan Intake
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border pb-2">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  filter === t.key ? 'bg-accent text-white' : 'text-muted hover:text-text'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Input placeholder="Search by name or NDC…" value={search} onChange={e => setSearch(e.target.value)} />

          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
          ) : items.length === 0 ? (
            <Empty message="No inventory items" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className="text-left py-2 pr-4 font-medium">Product</th>
                    <th className="text-left py-2 pr-4 font-medium">NDC</th>
                    <th className="text-left py-2 pr-4 font-medium">Lot</th>
                    <th className="text-left py-2 pr-4 font-medium">Expiry</th>
                    <th className="text-left py-2 pr-4 font-medium">Qty</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const window = expiryWindow(item.expiry_date);
                    return (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="text-text font-medium">{item.generic_name ?? item.brand_name}</p>
                          {item.brand_name && item.generic_name && (
                            <p className="text-xs text-muted">{item.brand_name}</p>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted font-mono text-xs">{item.ndc}</td>
                        <td className="py-3 pr-4 text-muted text-xs">{item.lot_number ?? '—'}</td>
                        <td className={`py-3 pr-4 font-medium ${expiryColor(window)}`}>
                          {formatDate(item.expiry_date)}
                        </td>
                        <td className="py-3 pr-4 text-text">{item.quantity}</td>
                        <td className="py-3">
                          <Tag variant={
                            window === 'expired' ? 'danger' :
                            window === '30' ? 'danger' :
                            window === '60' ? 'warn' :
                            window === '90' ? 'warn' : 'success'
                          }>
                            {window === 'ok' ? 'OK' : window === 'expired' ? 'Expired' : `${window}d`}
                          </Tag>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      {/* Scan modal */}
      {scanOpen && <ScanModal onClose={() => { setScanOpen(false); load(); }} />}
    </div>
  );
}

function ScanModal({ onClose }: { onClose: () => void }) {
  const [ndc, setNdc] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lot, setLot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!ndc || !expiryDate || !quantity) { setError('NDC, expiry date and quantity are required'); return; }
    setLoading(true);
    setError('');
    try {
      await inventory.create({ ndc, expiryDate, quantity: parseInt(quantity), lotNumber: lot || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-text">Scan Intake</h2>
          <button onClick={onClose} className="text-muted hover:text-text transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <Input label="NDC *" placeholder="12345-6789-01" value={ndc} onChange={e => setNdc(e.target.value)} />
          <Input label="Expiry Date *" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          <Input label="Quantity *" type="number" placeholder="100" value={quantity} onChange={e => setQuantity(e.target.value)} />
          <Input label="Lot Number" placeholder="LOT123" value={lot} onChange={e => setLot(e.target.value)} />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={submit} loading={loading}>Add to Inventory</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
