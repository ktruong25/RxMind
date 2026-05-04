import type { PMSPatient, PMSPrescription, PMSClaim } from '../../types';

export interface SyncResult {
  patients: number;
  prescriptions: number;
  claims: number;
  errors: string[];
}

export interface PMSAdapter {
  readonly name: string;
  fetchPatients(): Promise<PMSPatient[]>;
  fetchPrescriptions(patientExternalId?: string): Promise<PMSPrescription[]>;
  fetchClaims(since?: Date): Promise<PMSClaim[]>;
  sync(): Promise<SyncResult>;
}
