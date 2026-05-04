import {
  MOCK_INVENTORY_SUMMARY, MOCK_ALERTS, MOCK_NON_ADHERENT,
  MOCK_PATIENTS, MOCK_CLAIM_SUMMARY, MOCK_MTM_SUMMARY, MOCK_MTM_SCAN,
  filterMockInventory, filterMockClaims, filterMockMtm,
  getMockPatientDetail, MOCK_MTM, MOCK_CLAIMS,
} from './mock-data';

const DEMO = process.env.NEXT_PUBLIC_MOCK_DATA === 'true';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: (token: string) =>
    request<ApiUser>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
};

// ── Inventory ─────────────────────────────────────────────────────────────────

export const inventory = {
  list: (filter?: string, search?: string) => {
    if (DEMO) return Promise.resolve(filterMockInventory(filter, search));
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    if (search) params.set('search', search);
    return request<InventoryItem[]>(`/inventory?${params}`);
  },
  summary: () => DEMO ? Promise.resolve(MOCK_INVENTORY_SUMMARY) : request<InventorySummary>('/inventory/summary'),
  get: (id: string) => request<InventoryItem>(`/inventory/${id}`),
  create: (data: CreateInventoryInput) =>
    request<InventoryItem>('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<InventoryItem>) =>
    request<InventoryItem>(`/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Products ──────────────────────────────────────────────────────────────────

export const products = {
  search: (search: string) => request<Product[]>(`/products?search=${encodeURIComponent(search)}`),
  lookupNdc: (ndc: string) => request<Product>(`/products/ndc/${ndc}`),
};

// ── Pulls ─────────────────────────────────────────────────────────────────────

export const pulls = {
  list: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return request<Pull[]>(`/pulls${q}`);
  },
  create: (data: CreatePullInput) =>
    request<Pull>('/pulls', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pull>) =>
    request<Pull>(`/pulls/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Alerts ────────────────────────────────────────────────────────────────────

export const alerts = {
  list: (params?: { acknowledged?: boolean; type?: string }) => {
    if (DEMO) {
      const filtered = params?.acknowledged === false
        ? MOCK_ALERTS.filter(a => !a.acknowledged)
        : MOCK_ALERTS;
      return Promise.resolve(filtered);
    }
    const q = new URLSearchParams();
    if (params?.acknowledged !== undefined) q.set('acknowledged', String(params.acknowledged));
    if (params?.type) q.set('type', params.type);
    return request<Alert[]>(`/alerts?${q}`);
  },
  counts: () => request<AlertCount[]>('/alerts/counts'),
  acknowledge: (id: string) => DEMO
    ? Promise.resolve(MOCK_ALERTS.find(a => a.id === id)!)
    : request<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
};

// ── Patients ──────────────────────────────────────────────────────────────────

export const patients = {
  list: (search?: string) => {
    if (DEMO) {
      const q = search?.toLowerCase();
      const filtered = q
        ? MOCK_PATIENTS.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) || p.phone?.includes(q))
        : MOCK_PATIENTS;
      return Promise.resolve(filtered);
    }
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<Patient[]>(`/patients${q}`);
  },
  get: (id: string) => DEMO
    ? Promise.resolve(getMockPatientDetail(id))
    : request<PatientDetail>(`/patients/${id}`),
  adherence: (id: string) => DEMO
    ? Promise.resolve(getMockPatientDetail(id).prescriptions as PrescriptionAdherence[])
    : request<PrescriptionAdherence[]>(`/patients/${id}/adherence`),
  nonAdherent: () => DEMO ? Promise.resolve(MOCK_NON_ADHERENT) : request<NonAdherentPatient[]>('/patients/list/non-adherent'),
  create: (data: CreatePatientInput) =>
    request<Patient>('/patients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreatePatientInput>) =>
    request<Patient>(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Claims ────────────────────────────────────────────────────────────────────

export const claims = {
  list: (params?: { status?: string; patientId?: string }) => {
    if (DEMO) return Promise.resolve(filterMockClaims(params?.status));
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.patientId) q.set('patientId', params.patientId);
    return request<Claim[]>(`/claims?${q}`);
  },
  summary: () => DEMO ? Promise.resolve(MOCK_CLAIM_SUMMARY) : request<ClaimSummary>('/claims/summary'),
  get: (id: string) => DEMO
    ? Promise.resolve(MOCK_CLAIMS.find(c => c.id === id)!)
    : request<Claim>(`/claims/${id}`),
  update: (id: string, data: UpdateClaimInput) => {
    if (DEMO) {
      const claim = MOCK_CLAIMS.find(c => c.id === id)!;
      const updated = { ...claim, ...data, updated_at: new Date().toISOString() };
      const idx = MOCK_CLAIMS.findIndex(c => c.id === id);
      MOCK_CLAIMS[idx] = updated as Claim;
      return Promise.resolve(updated as Claim);
    }
    return request<Claim>(`/claims/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
};

// ── MTM ───────────────────────────────────────────────────────────────────────

export const mtm = {
  list: (status?: string) => {
    if (DEMO) return Promise.resolve(filterMockMtm(status));
    const q = status ? `?status=${status}` : '';
    return request<MtmOpportunity[]>(`/mtm${q}`);
  },
  summary: () => DEMO ? Promise.resolve(MOCK_MTM_SUMMARY) : request<MtmSummary>('/mtm/summary'),
  get: (id: string) => DEMO
    ? Promise.resolve(MOCK_MTM.find(m => m.id === id)!)
    : request<MtmOpportunity>(`/mtm/${id}`),
  create: (data: CreateMtmInput) => {
    if (DEMO) {
      const patient = MOCK_PATIENTS.find(p => p.id === data.patientId);
      const opp: MtmOpportunity = {
        id: `m${Date.now()}`, patient_id: data.patientId, type: data.type,
        status: 'open', billable_code: '99605', billable_amount: 60,
        notes: data.notes, scheduled_at: data.scheduledAt,
        created_at: new Date().toISOString(),
        patient_first: patient?.first_name, patient_last: patient?.last_name,
        patient_phone: patient?.phone,
      };
      MOCK_MTM.push(opp);
      return Promise.resolve(opp);
    }
    return request<MtmOpportunity>('/mtm', { method: 'POST', body: JSON.stringify(data) });
  },
  update: (id: string, data: UpdateMtmInput) => {
    if (DEMO) {
      const idx = MOCK_MTM.findIndex(m => m.id === id);
      const updated = { ...MOCK_MTM[idx], ...data };
      MOCK_MTM[idx] = updated;
      return Promise.resolve(updated);
    }
    return request<MtmOpportunity>(`/mtm/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  scan: () => DEMO ? Promise.resolve(MOCK_MTM_SCAN) : request<MtmScanResult[]>('/mtm/scan', { method: 'POST' }),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string; email: string; role: 'admin' | 'tech';
  firstName?: string; lastName?: string;
}

export interface Product {
  id: string; ndc: string; brand_name?: string; generic_name: string;
  dosage_form?: string; route?: string; strength?: string;
}

export interface InventoryItem {
  id: string; product_id: string; lot_number?: string; expiry_date: string;
  quantity: number; cost_per_unit?: number; location?: string;
  status: string; created_at: string;
  generic_name?: string; brand_name?: string; ndc?: string; strength?: string;
}

export interface InventorySummary {
  total_active: number; expired: number; expiring_30: number;
  expiring_60: number; expiring_90: number; expired_value: number;
}

export interface CreateInventoryInput {
  ndc: string; lotNumber?: string; expiryDate: string;
  quantity: number; costPerUnit?: number; location?: string;
}

export interface Pull {
  id: string; inventory_id: string; reason: string; quantity: number;
  wholesaler?: string; return_tracking?: string; credit_amount?: number;
  status: string; pulled_at: string;
  generic_name?: string; brand_name?: string; ndc?: string; lot_number?: string; expiry_date?: string;
}

export interface CreatePullInput {
  inventoryId: string; reason: 'expiry' | 'damage' | 'recall' | 'return';
  quantity: number; wholesaler?: string; notes?: string;
}

export interface Alert {
  id: string; type: string; severity: string; title: string; body?: string;
  acknowledged: boolean; created_at: string;
  generic_name?: string; brand_name?: string;
  patient_first?: string; patient_last?: string;
}

export interface AlertCount { type: string; count: number; }

export interface Patient {
  id: string; first_name: string; last_name: string; dob?: string;
  gender?: string; phone?: string; email?: string;
  allergy_list?: string[]; active: boolean; created_at: string;
}

export interface PatientDetail extends Patient {
  address?: Record<string, unknown>; insurance_info?: Record<string, unknown>;
  notes?: string; external_id?: string;
  prescriptions: Prescription[];
}

export interface Prescription {
  id: string; rx_number?: string; ndc?: string; days_supply?: number;
  refills_remaining?: number; last_fill_date?: string; next_fill_due?: string;
  status: string; sig?: string;
  generic_name?: string; brand_name?: string;
}

export interface PrescriptionAdherence extends Prescription {
  adherence_status: 'on_track' | 'overdue' | 'non_adherent' | 'unknown';
}

export interface NonAdherentPatient {
  id: string; first_name: string; last_name: string; phone?: string;
  overdue_count: number;
}

export interface CreatePatientInput {
  firstName: string; lastName: string; dob?: string; gender?: string;
  phone?: string; email?: string; allergyList?: string[]; notes?: string;
}

export interface Claim {
  id: string; patient_id: string; rx_number?: string; ndc?: string;
  bin?: string; pcn?: string; group_id?: string; member_id?: string;
  reject_code?: string; reject_message?: string; status: string;
  resolution_note?: string; ai_fix_suggestion?: string;
  created_at: string; updated_at: string;
  patient_first?: string; patient_last?: string; patient_phone?: string;
}

export interface ClaimSummary {
  rejected: number; pending: number; resolved: number; ignored: number;
}

export interface UpdateClaimInput {
  status?: 'rejected' | 'pending' | 'resolved' | 'ignored';
  resolutionNote?: string; aiFixSuggestion?: string;
}

export interface MtmOpportunity {
  id: string; patient_id: string; type: string; status: string;
  billable_code?: string; billable_amount?: number; notes?: string;
  scheduled_at?: string; created_at: string;
  patient_first?: string; patient_last?: string; patient_phone?: string;
}

export interface MtmSummary {
  open: number; scheduled: number; completed: number; billed: number;
  total_billed: number;
}

export interface CreateMtmInput {
  patientId: string; type: 'cmt' | 'imt' | 'tmo' | 'annual_review' | 'adherence';
  notes?: string; scheduledAt?: string;
}

export interface UpdateMtmInput {
  status?: 'open' | 'scheduled' | 'completed' | 'declined' | 'billed';
  notes?: string; scheduledAt?: string; billableAmount?: number;
}

export interface MtmScanResult {
  id: string; first_name: string; last_name: string; chronic_med_count: number;
}
