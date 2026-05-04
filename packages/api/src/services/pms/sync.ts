import { query } from '../../db';
import type { PMSPatient, PMSPrescription, PMSClaim } from '../../types';
import type { SyncResult } from './adapter';

export async function upsertPatient(p: PMSPatient): Promise<string> {
  const { rows } = await query(
    `INSERT INTO patients
      (external_id, first_name, last_name, dob, phone, email, allergy_list, insurance_info)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (external_id) DO UPDATE SET
       first_name=EXCLUDED.first_name,
       last_name=EXCLUDED.last_name,
       dob=EXCLUDED.dob,
       phone=EXCLUDED.phone,
       email=EXCLUDED.email,
       allergy_list=EXCLUDED.allergy_list,
       insurance_info=EXCLUDED.insurance_info,
       updated_at=NOW()
     RETURNING id`,
    [
      p.externalId, p.firstName, p.lastName, p.dob, p.phone, p.email,
      p.allergies ?? [],
      p.insuranceInfo ? JSON.stringify(p.insuranceInfo) : null,
    ]
  );
  return rows[0].id as string;
}

export async function upsertPrescription(rx: PMSPrescription, patientId: string): Promise<void> {
  // Look up product by NDC
  const { rows: products } = await query('SELECT id FROM products WHERE ndc=$1', [rx.ndc]);
  const productId = products[0]?.id ?? null;

  await query(
    `INSERT INTO prescriptions
      (patient_id, product_id, ndc, rx_number, days_supply, quantity, refills_remaining,
       sig, prescriber_name, prescriber_npi, last_fill_date, next_fill_due, status, external_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (rx_number) DO UPDATE SET
       refills_remaining=EXCLUDED.refills_remaining,
       last_fill_date=EXCLUDED.last_fill_date,
       next_fill_due=EXCLUDED.next_fill_due,
       status=EXCLUDED.status,
       updated_at=NOW()`,
    [
      patientId, productId, rx.ndc, rx.rxNumber,
      rx.daysSupply, rx.quantity, rx.refillsRemaining, rx.sig,
      rx.prescriberName, rx.prescriberNpi, rx.lastFillDate, rx.nextFillDue,
      rx.status, rx.externalId,
    ]
  );
}

export async function upsertClaim(claim: PMSClaim, patientId: string): Promise<void> {
  await query(
    `INSERT INTO claims (patient_id, rx_number, ndc, bin, pcn, reject_code, reject_message, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT DO NOTHING`,
    [
      patientId, claim.rxNumber, claim.ndc, claim.bin, claim.pcn,
      claim.rejectCode, claim.rejectMessage, claim.submittedAt,
    ]
  );
}

export async function writeSyncLog(
  adapter: string,
  result: SyncResult,
  startedAt: Date
): Promise<void> {
  const status = result.errors.length === 0
    ? 'success'
    : result.patients + result.prescriptions + result.claims > 0
      ? 'partial'
      : 'error';

  await query(
    `INSERT INTO pms_sync_log (adapter, status, records_synced, records_failed, error_details, started_at, finished_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
    [
      adapter, status,
      result.patients + result.prescriptions + result.claims,
      result.errors.length,
      result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      startedAt,
    ]
  );
}
