import axios from 'axios';
import type { PMSPatient, PMSPrescription, PMSClaim } from '../../types';
import type { PMSAdapter, SyncResult } from './adapter';
import { upsertPatient, upsertPrescription, upsertClaim, writeSyncLog } from './sync';

export class PioneerRxAdapter implements PMSAdapter {
  readonly name = 'pioneerrx';

  private http = axios.create({
    baseURL: process.env.PIONEERRX_BASE_URL,
    headers: {
      Authorization: `Bearer ${process.env.PIONEERRX_API_KEY}`,
      'X-Pharmacy-Id': process.env.PIONEERRX_PHARMACY_ID ?? '',
    },
    timeout: 30_000,
  });

  async fetchPatients(): Promise<PMSPatient[]> {
    const { data } = await this.http.get<{ patients: PioneerPatient[] }>('/patients');
    return data.patients.map(mapPatient);
  }

  async fetchPrescriptions(patientExternalId?: string): Promise<PMSPrescription[]> {
    const params = patientExternalId ? { patientId: patientExternalId } : {};
    const { data } = await this.http.get<{ prescriptions: PioneerRx[] }>('/prescriptions', { params });
    return data.prescriptions.map(mapPrescription);
  }

  async fetchClaims(since?: Date): Promise<PMSClaim[]> {
    const params = since ? { since: since.toISOString() } : {};
    const { data } = await this.http.get<{ claims: PioneerClaim[] }>('/claims/rejected', { params });
    return data.claims.map(mapClaim);
  }

  async sync(): Promise<SyncResult> {
    const startedAt = new Date();
    const result: SyncResult = { patients: 0, prescriptions: 0, claims: 0, errors: [] };

    try {
      const patients = await this.fetchPatients();
      for (const p of patients) {
        try {
          const patientId = await upsertPatient(p);
          const rxList = await this.fetchPrescriptions(p.externalId);
          for (const rx of rxList) {
            try {
              await upsertPrescription(rx, patientId);
              result.prescriptions++;
            } catch (err) {
              result.errors.push(`rx ${rx.rxNumber}: ${(err as Error).message}`);
            }
          }
          result.patients++;
        } catch (err) {
          result.errors.push(`patient ${p.externalId}: ${(err as Error).message}`);
        }
      }

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const claims = await this.fetchClaims(since);
      for (const c of claims) {
        try {
          const { rows } = await import('../../db').then(m =>
            m.query('SELECT id FROM patients WHERE external_id=$1', [c.patientExternalId])
          );
          if (rows[0]) {
            await upsertClaim(c, rows[0].id as string);
            result.claims++;
          }
        } catch (err) {
          result.errors.push(`claim ${c.externalId}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      result.errors.push(`sync failed: ${(err as Error).message}`);
    }

    await writeSyncLog(this.name, result, startedAt);
    return result;
  }
}

// ── PioneerRx API shape (adjust to real API docs) ──────────────────────────

interface PioneerPatient {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  allergies?: string[];
  primaryInsurance?: Record<string, unknown>;
}

interface PioneerRx {
  rxId: string;
  patientId: string;
  rxNumber: string;
  ndc: string;
  daysSupply?: number;
  quantity?: number;
  refillsRemaining?: number;
  directions?: string;
  prescriberName?: string;
  prescriberNpi?: string;
  lastDispensedDate?: string;
  nextRefillDate?: string;
  rxStatus: string;
}

interface PioneerClaim {
  claimId: string;
  patientId: string;
  rxNumber: string;
  ndc?: string;
  bin?: string;
  pcn?: string;
  rejectCode?: string;
  rejectDescription?: string;
  claimDate?: string;
}

function mapPatient(p: PioneerPatient): PMSPatient {
  return {
    externalId: p.patientId,
    firstName: p.firstName,
    lastName: p.lastName,
    dob: p.dateOfBirth,
    phone: p.phone,
    email: p.email,
    allergies: p.allergies,
    insuranceInfo: p.primaryInsurance,
  };
}

function mapPrescription(rx: PioneerRx): PMSPrescription {
  return {
    externalId: rx.rxId,
    patientExternalId: rx.patientId,
    rxNumber: rx.rxNumber,
    ndc: rx.ndc,
    daysSupply: rx.daysSupply,
    quantity: rx.quantity,
    refillsRemaining: rx.refillsRemaining,
    sig: rx.directions,
    prescriberName: rx.prescriberName,
    prescriberNpi: rx.prescriberNpi,
    lastFillDate: rx.lastDispensedDate,
    nextFillDue: rx.nextRefillDate,
    status: rx.rxStatus,
  };
}

function mapClaim(c: PioneerClaim): PMSClaim {
  return {
    externalId: c.claimId,
    patientExternalId: c.patientId,
    rxNumber: c.rxNumber,
    ndc: c.ndc,
    bin: c.bin,
    pcn: c.pcn,
    rejectCode: c.rejectCode,
    rejectMessage: c.rejectDescription,
    submittedAt: c.claimDate,
  };
}
