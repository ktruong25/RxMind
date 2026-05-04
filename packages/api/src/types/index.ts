export type UserRole = 'admin' | 'tech';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  clerkId?: string;
}

export interface Patient {
  id: string;
  external_id?: string;
  first_name: string;
  last_name: string;
  dob?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: Record<string, unknown>;
  insurance_info?: Record<string, unknown>;
  allergy_list?: string[];
  notes?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  ndc: string;
  brand_name?: string;
  generic_name: string;
  labeler?: string;
  dosage_form?: string;
  route?: string;
  strength?: string;
  package_size?: string;
  dea_schedule?: string;
  active: boolean;
  fda_data?: Record<string, unknown>;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  lot_number?: string;
  expiry_date: string;
  quantity: number;
  cost_per_unit?: number;
  location?: string;
  status: 'active' | 'pulled' | 'returned' | 'disposed';
  scanned_by?: string;
  created_at: string;
  updated_at: string;
  // joined fields
  generic_name?: string;
  brand_name?: string;
  ndc?: string;
}

export interface Alert {
  id: string;
  inventory_id?: string;
  patient_id?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  body?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

export interface Claim {
  id: string;
  patient_id: string;
  prescription_id?: string;
  rx_number?: string;
  ndc?: string;
  reject_code?: string;
  reject_message?: string;
  status: 'rejected' | 'pending' | 'resolved' | 'ignored';
  resolution_note?: string;
  ai_fix_suggestion?: string;
  created_at: string;
  updated_at: string;
  // joined
  patient_first?: string;
  patient_last?: string;
}

export interface MtmOpportunity {
  id: string;
  patient_id: string;
  type: 'cmt' | 'imt' | 'tmo' | 'annual_review' | 'adherence';
  status: 'open' | 'scheduled' | 'completed' | 'declined' | 'billed';
  billable_code?: string;
  billable_amount?: number;
  notes?: string;
  completed_by?: string;
  completed_at?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  // joined
  patient_first?: string;
  patient_last?: string;
}

// PMS adapter contract
export interface PMSPatient {
  externalId: string;
  firstName: string;
  lastName: string;
  dob?: string;
  phone?: string;
  email?: string;
  allergies?: string[];
  insuranceInfo?: Record<string, unknown>;
}

export interface PMSPrescription {
  externalId: string;
  patientExternalId: string;
  rxNumber: string;
  ndc: string;
  daysSupply?: number;
  quantity?: number;
  refillsRemaining?: number;
  sig?: string;
  prescriberName?: string;
  prescriberNpi?: string;
  lastFillDate?: string;
  nextFillDue?: string;
  status: string;
}

export interface PMSClaim {
  externalId: string;
  patientExternalId: string;
  rxNumber: string;
  ndc?: string;
  bin?: string;
  pcn?: string;
  rejectCode?: string;
  rejectMessage?: string;
  submittedAt?: string;
}
