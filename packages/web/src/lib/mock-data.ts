import type {
  InventoryItem, InventorySummary, Alert, NonAdherentPatient,
  Patient, PatientDetail, PrescriptionAdherence, Claim, ClaimSummary,
  MtmOpportunity, MtmSummary, MtmScanResult,
} from './api';

export const MOCK_INVENTORY_SUMMARY: InventorySummary = {
  total_active: 847,
  expired: 12,
  expiring_30: 28,
  expiring_60: 47,
  expiring_90: 93,
  expired_value: 4832.50,
};

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1',  product_id: 'p1',  generic_name: 'Metformin HCl',       brand_name: 'Glucophage',  ndc: '00093-1048-01', lot_number: 'LOT-A2241', expiry_date: '2026-04-01', quantity: 240, cost_per_unit: 0.18, location: 'Shelf A1', status: 'active', created_at: '2025-10-01', strength: '500mg' },
  { id: '2',  product_id: 'p2',  generic_name: 'Lisinopril',           brand_name: 'Zestril',     ndc: '00093-1039-01', lot_number: 'LOT-B1190', expiry_date: '2026-04-15', quantity: 180, cost_per_unit: 0.12, location: 'Shelf A2', status: 'active', created_at: '2025-10-01', strength: '10mg' },
  { id: '3',  product_id: 'p3',  generic_name: 'Atorvastatin Calcium', brand_name: 'Lipitor',     ndc: '00069-0155-66', lot_number: 'LOT-C0034', expiry_date: '2026-03-20', quantity: 90,  cost_per_unit: 0.45, location: 'Shelf B1', status: 'active', created_at: '2025-09-15', strength: '40mg' },
  { id: '4',  product_id: 'p4',  generic_name: 'Amlodipine Besylate',  brand_name: 'Norvasc',     ndc: '00069-1530-66', lot_number: 'LOT-D5512', expiry_date: '2026-05-10', quantity: 120, cost_per_unit: 0.22, location: 'Shelf A3', status: 'active', created_at: '2025-11-01', strength: '5mg' },
  { id: '5',  product_id: 'p5',  generic_name: 'Omeprazole',           brand_name: 'Prilosec',    ndc: '00603-2871-32', lot_number: 'LOT-E8871', expiry_date: '2026-05-25', quantity: 60,  cost_per_unit: 0.30, location: 'Shelf C1', status: 'active', created_at: '2025-11-15', strength: '20mg' },
  { id: '6',  product_id: 'p6',  generic_name: 'Sertraline HCl',       brand_name: 'Zoloft',      ndc: '00049-4960-66', lot_number: 'LOT-F2230', expiry_date: '2026-06-01', quantity: 90,  cost_per_unit: 0.28, location: 'Shelf B2', status: 'active', created_at: '2025-12-01', strength: '50mg' },
  { id: '7',  product_id: 'p7',  generic_name: 'Levothyroxine Sodium', brand_name: 'Synthroid',   ndc: '00074-4550-13', lot_number: 'LOT-G9910', expiry_date: '2026-06-10', quantity: 200, cost_per_unit: 0.35, location: 'Shelf A4', status: 'active', created_at: '2025-12-15', strength: '100mcg' },
  { id: '8',  product_id: 'p8',  generic_name: 'Albuterol Sulfate',    brand_name: 'ProAir HFA',  ndc: '59310-0579-20', lot_number: 'LOT-H4421', expiry_date: '2026-06-25', quantity: 48,  cost_per_unit: 8.50, location: 'Shelf D1', status: 'active', created_at: '2025-12-20', strength: '90mcg/inh' },
  { id: '9',  product_id: 'p9',  generic_name: 'Gabapentin',           brand_name: 'Neurontin',   ndc: '00093-0318-05', lot_number: 'LOT-I7732', expiry_date: '2026-07-01', quantity: 270, cost_per_unit: 0.20, location: 'Shelf B3', status: 'active', created_at: '2026-01-05', strength: '300mg' },
  { id: '10', product_id: 'p10', generic_name: 'Metoprolol Tartrate',  brand_name: 'Lopressor',   ndc: '00781-1584-13', lot_number: 'LOT-J0015', expiry_date: '2026-07-10', quantity: 150, cost_per_unit: 0.16, location: 'Shelf A5', status: 'active', created_at: '2026-01-10', strength: '50mg' },
  { id: '11', product_id: 'p11', generic_name: 'Pantoprazole Sodium',  brand_name: 'Protonix',    ndc: '00008-0841-81', lot_number: 'LOT-K3341', expiry_date: '2026-07-25', quantity: 90,  cost_per_unit: 0.55, location: 'Shelf C2', status: 'active', created_at: '2026-01-15', strength: '40mg' },
  { id: '12', product_id: 'p12', generic_name: 'Losartan Potassium',   brand_name: 'Cozaar',      ndc: '00006-0952-54', lot_number: 'LOT-L8812', expiry_date: '2026-08-01', quantity: 120, cost_per_unit: 0.38, location: 'Shelf A6', status: 'active', created_at: '2026-01-20', strength: '50mg' },
  { id: '13', product_id: 'p13', generic_name: 'Hydrochlorothiazide',  brand_name: 'Microzide',   ndc: '59762-1060-1',  lot_number: 'LOT-M2290', expiry_date: '2026-12-01', quantity: 300, cost_per_unit: 0.08, location: 'Shelf A7', status: 'active', created_at: '2026-02-01', strength: '25mg' },
  { id: '14', product_id: 'p14', generic_name: 'Clopidogrel',          brand_name: 'Plavix',      ndc: '00078-0521-34', lot_number: 'LOT-N6620', expiry_date: '2027-01-15', quantity: 90,  cost_per_unit: 1.20, location: 'Shelf B4', status: 'active', created_at: '2026-02-10', strength: '75mg' },
  { id: '15', product_id: 'p15', generic_name: 'Duloxetine HCl',       brand_name: 'Cymbalta',    ndc: '00002-3235-60', lot_number: 'LOT-O5501', expiry_date: '2027-03-20', quantity: 60,  cost_per_unit: 2.80, location: 'Shelf B5', status: 'active', created_at: '2026-02-15', strength: '60mg' },
];

export const MOCK_ALERTS: Alert[] = [
  { id: 'a1', type: 'expiry', severity: 'critical', title: 'Atorvastatin LOT-C0034 expired', body: '90 units of Atorvastatin 40mg expired on Mar 20 — pull from shelf immediately.', acknowledged: false, created_at: '2026-05-04T07:00:00Z', generic_name: 'Atorvastatin Calcium' },
  { id: 'a2', type: 'expiry', severity: 'critical', title: 'Metformin LOT-A2241 expired Apr 1', body: '240 units — $43.20 at cost. Schedule wholesaler return.', acknowledged: false, created_at: '2026-05-04T07:00:00Z', generic_name: 'Metformin HCl' },
  { id: 'a3', type: 'expiry', severity: 'high',     title: 'Amlodipine expiring in 6 days', body: '120 units expire May 10. Flag for review or return.', acknowledged: false, created_at: '2026-05-04T07:00:00Z', generic_name: 'Amlodipine Besylate' },
  { id: 'a4', type: 'adherence', severity: 'high',  title: 'Johnson, Maria — 3 overdue refills', body: 'Metformin, Lisinopril, Atorvastatin all past due fill dates.', acknowledged: false, created_at: '2026-05-04T07:00:00Z', patient_first: 'Maria', patient_last: 'Johnson' },
  { id: 'a5', type: 'adherence', severity: 'medium', title: 'Chen, David — Lisinopril overdue', body: 'Next fill was due April 28. No refill picked up.', acknowledged: false, created_at: '2026-05-04T07:00:00Z', patient_first: 'David', patient_last: 'Chen' },
];

export const MOCK_NON_ADHERENT: NonAdherentPatient[] = [
  { id: 'pt1', first_name: 'Maria',   last_name: 'Johnson',   phone: '(555) 210-4832', overdue_count: 3 },
  { id: 'pt2', first_name: 'David',   last_name: 'Chen',      phone: '(555) 381-7720', overdue_count: 1 },
  { id: 'pt3', first_name: 'Eleanor', last_name: 'Washington', phone: '(555) 492-6631', overdue_count: 2 },
  { id: 'pt4', first_name: 'Robert',  last_name: 'Garcia',    phone: '(555) 583-9910', overdue_count: 1 },
];

export const MOCK_PATIENTS: Patient[] = [
  { id: 'pt1', first_name: 'Maria',   last_name: 'Johnson',    dob: '1958-03-14', gender: 'F', phone: '(555) 210-4832', email: 'mjohnson@email.com', allergy_list: ['Penicillin', 'Sulfa'], active: true, created_at: '2022-01-15' },
  { id: 'pt2', first_name: 'David',   last_name: 'Chen',       dob: '1965-07-22', gender: 'M', phone: '(555) 381-7720', email: 'dchen@email.com',    allergy_list: ['Codeine'], active: true, created_at: '2021-06-10' },
  { id: 'pt3', first_name: 'Eleanor', last_name: 'Washington', dob: '1949-11-05', gender: 'F', phone: '(555) 492-6631', email: undefined,             allergy_list: [], active: true, created_at: '2020-03-22' },
  { id: 'pt4', first_name: 'Robert',  last_name: 'Garcia',     dob: '1972-09-30', gender: 'M', phone: '(555) 583-9910', email: 'rgarcia@email.com',  allergy_list: ['Aspirin'], active: true, created_at: '2023-02-14' },
  { id: 'pt5', first_name: 'Susan',   last_name: 'Patel',      dob: '1980-01-18', gender: 'F', phone: '(555) 674-3320', email: 'spatel@email.com',   allergy_list: [], active: true, created_at: '2024-08-01' },
  { id: 'pt6', first_name: 'James',   last_name: 'Okafor',     dob: '1955-06-08', gender: 'M', phone: '(555) 765-2210', email: undefined,             allergy_list: ['Latex'], active: true, created_at: '2019-11-30' },
];

const MOCK_PATIENT_DETAILS: Record<string, PatientDetail> = {
  pt1: {
    ...MOCK_PATIENTS[0],
    notes: 'Diabetic patient on insulin adjustment plan. Follow up on A1C every 3 months.',
    prescriptions: [
      { id: 'rx1', rx_number: 'RX-100421', ndc: '00093-1048-01', generic_name: 'Metformin HCl',       brand_name: 'Glucophage', days_supply: 90, refills_remaining: 1, last_fill_date: '2026-01-20', next_fill_due: '2026-04-19', status: 'active', sig: 'Take 1 tablet by mouth twice daily with meals', adherence_status: 'non_adherent' } as PrescriptionAdherence,
      { id: 'rx2', rx_number: 'RX-100422', ndc: '00093-1039-01', generic_name: 'Lisinopril',           brand_name: 'Zestril',    days_supply: 90, refills_remaining: 3, last_fill_date: '2026-01-20', next_fill_due: '2026-04-19', status: 'active', sig: 'Take 1 tablet by mouth daily', adherence_status: 'non_adherent' } as PrescriptionAdherence,
      { id: 'rx3', rx_number: 'RX-100423', ndc: '00069-0155-66', generic_name: 'Atorvastatin Calcium', brand_name: 'Lipitor',    days_supply: 90, refills_remaining: 2, last_fill_date: '2026-01-20', next_fill_due: '2026-04-19', status: 'active', sig: 'Take 1 tablet by mouth at bedtime', adherence_status: 'non_adherent' } as PrescriptionAdherence,
    ],
  },
  pt2: {
    ...MOCK_PATIENTS[1],
    notes: '',
    prescriptions: [
      { id: 'rx4', rx_number: 'RX-200118', ndc: '00093-1039-01', generic_name: 'Lisinopril',          brand_name: 'Zestril',   days_supply: 30, refills_remaining: 5, last_fill_date: '2026-03-29', next_fill_due: '2026-04-28', status: 'active', sig: 'Take 1 tablet by mouth daily', adherence_status: 'overdue' } as PrescriptionAdherence,
      { id: 'rx5', rx_number: 'RX-200119', ndc: '00781-1584-13', generic_name: 'Metoprolol Tartrate', brand_name: 'Lopressor', days_supply: 30, refills_remaining: 5, last_fill_date: '2026-04-01', next_fill_due: '2026-05-01', status: 'active', sig: 'Take 1 tablet by mouth twice daily', adherence_status: 'on_track' } as PrescriptionAdherence,
    ],
  },
  pt3: {
    ...MOCK_PATIENTS[2],
    notes: 'Elderly patient. Caregiver (daughter) picks up medications. Call (555) 492-6632 if no response.',
    prescriptions: [
      { id: 'rx6', rx_number: 'RX-300044', ndc: '00074-4550-13', generic_name: 'Levothyroxine Sodium', brand_name: 'Synthroid', days_supply: 90, refills_remaining: 2, last_fill_date: '2026-02-10', next_fill_due: '2026-05-10', status: 'active', sig: 'Take 1 tablet by mouth daily on empty stomach', adherence_status: 'overdue' } as PrescriptionAdherence,
      { id: 'rx7', rx_number: 'RX-300045', ndc: '00781-1584-13', generic_name: 'Metoprolol Tartrate',  brand_name: 'Lopressor', days_supply: 90, refills_remaining: 1, last_fill_date: '2026-02-10', next_fill_due: '2026-05-10', status: 'active', sig: 'Take 1 tablet by mouth daily', adherence_status: 'on_track' } as PrescriptionAdherence,
    ],
  },
  pt4: {
    ...MOCK_PATIENTS[3],
    notes: '',
    prescriptions: [
      { id: 'rx8', rx_number: 'RX-400221', ndc: '59310-0579-20', generic_name: 'Albuterol Sulfate', brand_name: 'ProAir HFA', days_supply: 30, refills_remaining: 3, last_fill_date: '2026-04-04', next_fill_due: '2026-05-04', status: 'active', sig: 'Inhale 2 puffs by mouth every 4-6 hours as needed', adherence_status: 'on_track' } as PrescriptionAdherence,
    ],
  },
  pt5: {
    ...MOCK_PATIENTS[4],
    notes: '',
    prescriptions: [
      { id: 'rx9', rx_number: 'RX-500088', ndc: '00049-4960-66', generic_name: 'Sertraline HCl', brand_name: 'Zoloft', days_supply: 30, refills_remaining: 5, last_fill_date: '2026-04-15', next_fill_due: '2026-05-15', status: 'active', sig: 'Take 1 tablet by mouth daily with or without food', adherence_status: 'on_track' } as PrescriptionAdherence,
    ],
  },
  pt6: {
    ...MOCK_PATIENTS[5],
    notes: 'MTM candidate — 7 chronic medications. Enrolled in Medicare Part D.',
    prescriptions: [
      { id: 'rx10', rx_number: 'RX-600311', ndc: '00093-1048-01', generic_name: 'Metformin HCl',       brand_name: 'Glucophage',  days_supply: 90, refills_remaining: 3, last_fill_date: '2026-04-01', next_fill_due: '2026-06-29', status: 'active', sig: 'Take 1 tablet by mouth twice daily', adherence_status: 'on_track' } as PrescriptionAdherence,
      { id: 'rx11', rx_number: 'RX-600312', ndc: '00006-0952-54', generic_name: 'Losartan Potassium',  brand_name: 'Cozaar',      days_supply: 90, refills_remaining: 2, last_fill_date: '2026-04-01', next_fill_due: '2026-06-29', status: 'active', sig: 'Take 1 tablet by mouth daily', adherence_status: 'on_track' } as PrescriptionAdherence,
      { id: 'rx12', rx_number: 'RX-600313', ndc: '00069-0155-66', generic_name: 'Atorvastatin Calcium', brand_name: 'Lipitor',    days_supply: 90, refills_remaining: 2, last_fill_date: '2026-04-01', next_fill_due: '2026-06-29', status: 'active', sig: 'Take 1 tablet by mouth at bedtime', adherence_status: 'on_track' } as PrescriptionAdherence,
      { id: 'rx13', rx_number: 'RX-600314', ndc: '59762-1060-1',  generic_name: 'Hydrochlorothiazide', brand_name: 'Microzide',   days_supply: 90, refills_remaining: 4, last_fill_date: '2026-04-01', next_fill_due: '2026-06-29', status: 'active', sig: 'Take 1 tablet by mouth daily in the morning', adherence_status: 'on_track' } as PrescriptionAdherence,
      { id: 'rx14', rx_number: 'RX-600315', ndc: '00078-0521-34', generic_name: 'Clopidogrel',          brand_name: 'Plavix',     days_supply: 90, refills_remaining: 3, last_fill_date: '2026-04-01', next_fill_due: '2026-06-29', status: 'active', sig: 'Take 1 tablet by mouth daily', adherence_status: 'on_track' } as PrescriptionAdherence,
      { id: 'rx15', rx_number: 'RX-600316', ndc: '00603-2871-32', generic_name: 'Omeprazole',           brand_name: 'Prilosec',   days_supply: 90, refills_remaining: 2, last_fill_date: '2026-04-01', next_fill_due: '2026-06-29', status: 'active', sig: 'Take 1 capsule by mouth daily before breakfast', adherence_status: 'on_track' } as PrescriptionAdherence,
      { id: 'rx16', rx_number: 'RX-600317', ndc: '00093-0318-05', generic_name: 'Gabapentin',           brand_name: 'Neurontin',  days_supply: 90, refills_remaining: 1, last_fill_date: '2026-04-01', next_fill_due: '2026-06-29', status: 'active', sig: 'Take 1 capsule by mouth three times daily', adherence_status: 'on_track' } as PrescriptionAdherence,
    ],
  },
};

export const MOCK_CLAIM_SUMMARY: ClaimSummary = {
  rejected: 18,
  pending: 7,
  resolved: 124,
  ignored: 3,
};

export const MOCK_CLAIMS: Claim[] = [
  { id: 'cl1', patient_id: 'pt1', rx_number: 'RX-100421', ndc: '00093-1048-01', bin: '004336', pcn: 'ADV', group_id: 'GRP001', member_id: 'M001234', reject_code: '75',  reject_message: 'Prior authorization required',     status: 'rejected', ai_fix_suggestion: undefined, resolution_note: undefined, created_at: '2026-05-01', updated_at: '2026-05-01', patient_first: 'Maria',   patient_last: 'Johnson',    patient_phone: '(555) 210-4832' },
  { id: 'cl2', patient_id: 'pt2', rx_number: 'RX-200118', ndc: '00093-1039-01', bin: '610415', pcn: 'RXSAVE', group_id: undefined, member_id: 'M009871', reject_code: '76',  reject_message: 'Plan limitations exceeded',         status: 'rejected', ai_fix_suggestion: undefined, resolution_note: undefined, created_at: '2026-05-02', updated_at: '2026-05-02', patient_first: 'David',   patient_last: 'Chen',       patient_phone: '(555) 381-7720' },
  { id: 'cl3', patient_id: 'pt6', rx_number: 'RX-600313', ndc: '00069-0155-66', bin: '004336', pcn: 'ADV',    group_id: 'GRP002', member_id: 'M556210', reject_code: '88',  reject_message: 'DUR reject — drug-drug interaction', status: 'rejected', ai_fix_suggestion: undefined, resolution_note: undefined, created_at: '2026-05-02', updated_at: '2026-05-02', patient_first: 'James',   patient_last: 'Okafor',     patient_phone: '(555) 765-2210' },
  { id: 'cl4', patient_id: 'pt3', rx_number: 'RX-300044', ndc: '00074-4550-13', bin: '020099', pcn: 'WC99', group_id: 'WLMRT01', member_id: 'M771432', reject_code: '70',  reject_message: 'Product not covered',               status: 'rejected', ai_fix_suggestion: undefined, resolution_note: undefined, created_at: '2026-05-03', updated_at: '2026-05-03', patient_first: 'Eleanor', patient_last: 'Washington', patient_phone: '(555) 492-6631' },
  { id: 'cl5', patient_id: 'pt4', rx_number: 'RX-400221', ndc: '59310-0579-20', bin: '610502', pcn: 'MEDCO',  group_id: undefined, member_id: 'M334401', reject_code: '41',  reject_message: 'Too soon refill',                   status: 'pending',  ai_fix_suggestion: undefined, resolution_note: undefined, created_at: '2026-05-03', updated_at: '2026-05-03', patient_first: 'Robert',  patient_last: 'Garcia',     patient_phone: '(555) 583-9910' },
  { id: 'cl6', patient_id: 'pt5', rx_number: 'RX-500088', ndc: '00049-4960-66', bin: '004336', pcn: 'ADV', group_id: 'GRP001', member_id: 'M882211', reject_code: '07',  reject_message: 'Member ID not on file',              status: 'resolved', ai_fix_suggestion: 'Verified member ID with insurance. Correct ID is M882211A. Resubmit with corrected member ID.', resolution_note: 'Corrected member ID and resubmitted', created_at: '2026-04-28', updated_at: '2026-05-01', patient_first: 'Susan',   patient_last: 'Patel',      patient_phone: '(555) 674-3320' },
];

export const MOCK_MTM_SUMMARY: MtmSummary = {
  open: 14,
  scheduled: 5,
  completed: 11,
  billed: 23,
  total_billed: 12450.00,
};

export const MOCK_MTM: MtmOpportunity[] = [
  { id: 'm1', patient_id: 'pt6', type: 'cmt',           status: 'open',      billable_code: '99605', billable_amount: 60.00, notes: 'Patient on 7 chronic meds — Medicare Part D CMR eligible.', scheduled_at: undefined,           created_at: '2026-05-01', patient_first: 'James',   patient_last: 'Okafor',     patient_phone: '(555) 765-2210' },
  { id: 'm2', patient_id: 'pt1', type: 'adherence',     status: 'open',      billable_code: '99607', billable_amount: 30.00, notes: 'Three non-adherent medications. Outreach needed.', scheduled_at: undefined,           created_at: '2026-05-02', patient_first: 'Maria',   patient_last: 'Johnson',    patient_phone: '(555) 210-4832' },
  { id: 'm3', patient_id: 'pt3', type: 'annual_review', status: 'scheduled', billable_code: '99606', billable_amount: 50.00, notes: 'Annual wellness review scheduled.',                scheduled_at: '2026-05-12T10:00:00Z', created_at: '2026-04-20', patient_first: 'Eleanor', patient_last: 'Washington', patient_phone: '(555) 492-6631' },
  { id: 'm4', patient_id: 'pt2', type: 'imt',           status: 'completed', billable_code: '99606', billable_amount: 45.00, notes: 'Targeted medication review completed.',             scheduled_at: '2026-04-28T14:00:00Z', created_at: '2026-04-15', patient_first: 'David',   patient_last: 'Chen',       patient_phone: '(555) 381-7720' },
  { id: 'm5', patient_id: 'pt5', type: 'tmo',           status: 'billed',    billable_code: '99607', billable_amount: 30.00, notes: 'MAP completed and billed.',                        scheduled_at: '2026-04-10T09:00:00Z', created_at: '2026-04-01', patient_first: 'Susan',   patient_last: 'Patel',      patient_phone: '(555) 674-3320' },
];

export const MOCK_MTM_SCAN: MtmScanResult[] = [
  { id: 'pt6', first_name: 'James',   last_name: 'Okafor',    chronic_med_count: 7 },
  { id: 'pt1', first_name: 'Maria',   last_name: 'Johnson',   chronic_med_count: 5 },
  { id: 'pt3', first_name: 'Eleanor', last_name: 'Washington', chronic_med_count: 4 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getMockPatientDetail(id: string): PatientDetail {
  return MOCK_PATIENT_DETAILS[id] ?? { ...MOCK_PATIENTS[0], prescriptions: [] };
}

function expiryWindowKey(dateStr: string): 'expired' | '30' | '60' | '90' | 'ok' {
  const today = new Date();
  const exp = new Date(dateStr);
  const diffDays = Math.floor((exp.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return '30';
  if (diffDays <= 60) return '60';
  if (diffDays <= 90) return '90';
  return 'ok';
}

export function filterMockInventory(filter?: string, search?: string): InventoryItem[] {
  let items = MOCK_INVENTORY;
  if (filter && filter !== 'all') {
    items = items.filter(i => expiryWindowKey(i.expiry_date) === filter);
  }
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i =>
      i.generic_name?.toLowerCase().includes(q) ||
      i.brand_name?.toLowerCase().includes(q) ||
      i.ndc?.toLowerCase().includes(q)
    );
  }
  return items;
}

export function filterMockClaims(status?: string): Claim[] {
  if (!status || status === 'all') return MOCK_CLAIMS;
  return MOCK_CLAIMS.filter(c => c.status === status);
}

export function filterMockMtm(status?: string): MtmOpportunity[] {
  if (!status || status === 'all') return MOCK_MTM;
  return MOCK_MTM.filter(m => m.status === status);
}
