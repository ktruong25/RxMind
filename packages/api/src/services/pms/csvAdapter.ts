import fs from 'fs';
import path from 'path';
import readline from 'readline';
import type { PMSPatient, PMSPrescription, PMSClaim } from '../../types';
import type { PMSAdapter, SyncResult } from './adapter';
import { upsertPatient, upsertPrescription, upsertClaim, writeSyncLog } from './sync';
import { query } from '../../db';

const WATCH_DIR = process.env.CSV_WATCH_DIR ?? '/data/pms-exports';

export class CsvAdapter implements PMSAdapter {
  readonly name = 'csv';

  private async readCsv(filePath: string): Promise<Record<string, string>[]> {
    const rows: Record<string, string>[] = [];
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
    let headers: string[] = [];

    for await (const line of rl) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (headers.length === 0) {
        headers = values;
      } else {
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
        rows.push(row);
      }
    }

    return rows;
  }

  async fetchPatients(): Promise<PMSPatient[]> {
    const file = path.join(WATCH_DIR, 'patients.csv');
    if (!fs.existsSync(file)) return [];
    const rows = await this.readCsv(file);

    return rows.map(r => ({
      externalId: r['patient_id'] ?? r['id'],
      firstName: r['first_name'],
      lastName: r['last_name'],
      dob: r['dob'] || undefined,
      phone: r['phone'] || undefined,
      email: r['email'] || undefined,
      allergies: r['allergies'] ? r['allergies'].split('|') : [],
    }));
  }

  async fetchPrescriptions(): Promise<PMSPrescription[]> {
    const file = path.join(WATCH_DIR, 'prescriptions.csv');
    if (!fs.existsSync(file)) return [];
    const rows = await this.readCsv(file);

    return rows.map(r => ({
      externalId: r['rx_id'] ?? r['id'],
      patientExternalId: r['patient_id'],
      rxNumber: r['rx_number'],
      ndc: r['ndc'],
      daysSupply: r['days_supply'] ? parseInt(r['days_supply']) : undefined,
      quantity: r['quantity'] ? parseFloat(r['quantity']) : undefined,
      refillsRemaining: r['refills_remaining'] ? parseInt(r['refills_remaining']) : undefined,
      sig: r['sig'] || undefined,
      prescriberName: r['prescriber_name'] || undefined,
      lastFillDate: r['last_fill_date'] || undefined,
      nextFillDue: r['next_fill_due'] || undefined,
      status: r['status'] || 'active',
    }));
  }

  async fetchClaims(): Promise<PMSClaim[]> {
    const file = path.join(WATCH_DIR, 'rejected_claims.csv');
    if (!fs.existsSync(file)) return [];
    const rows = await this.readCsv(file);

    return rows.map(r => ({
      externalId: r['claim_id'] ?? r['id'],
      patientExternalId: r['patient_id'],
      rxNumber: r['rx_number'],
      ndc: r['ndc'] || undefined,
      bin: r['bin'] || undefined,
      pcn: r['pcn'] || undefined,
      rejectCode: r['reject_code'] || undefined,
      rejectMessage: r['reject_message'] || undefined,
      submittedAt: r['submitted_at'] || undefined,
    }));
  }

  async sync(): Promise<SyncResult> {
    const startedAt = new Date();
    const result: SyncResult = { patients: 0, prescriptions: 0, claims: 0, errors: [] };

    try {
      const patients = await this.fetchPatients();
      for (const p of patients) {
        try {
          await upsertPatient(p);
          result.patients++;
        } catch (err) {
          result.errors.push(`patient ${p.externalId}: ${(err as Error).message}`);
        }
      }

      const prescriptions = await this.fetchPrescriptions();
      for (const rx of prescriptions) {
        try {
          const { rows } = await query('SELECT id FROM patients WHERE external_id=$1', [rx.patientExternalId]);
          if (rows[0]) {
            await upsertPrescription(rx, rows[0].id as string);
            result.prescriptions++;
          }
        } catch (err) {
          result.errors.push(`rx ${rx.rxNumber}: ${(err as Error).message}`);
        }
      }

      const claims = await this.fetchClaims();
      for (const c of claims) {
        try {
          const { rows } = await query('SELECT id FROM patients WHERE external_id=$1', [c.patientExternalId]);
          if (rows[0]) {
            await upsertClaim(c, rows[0].id as string);
            result.claims++;
          }
        } catch (err) {
          result.errors.push(`claim ${c.externalId}: ${(err as Error).message}`);
        }
      }

      // Archive processed files
      for (const file of ['patients.csv', 'prescriptions.csv', 'rejected_claims.csv']) {
        const src = path.join(WATCH_DIR, file);
        if (fs.existsSync(src)) {
          const ts = Date.now();
          fs.renameSync(src, path.join(WATCH_DIR, `processed_${ts}_${file}`));
        }
      }
    } catch (err) {
      result.errors.push(`csv sync failed: ${(err as Error).message}`);
    }

    await writeSyncLog(this.name, result, startedAt);
    return result;
  }

  startPolling(): void {
    const interval = parseInt(process.env.CSV_POLL_INTERVAL_MS ?? '60000');
    console.log(`[csv] polling ${WATCH_DIR} every ${interval}ms`);

    setInterval(async () => {
      const hasFiles = ['patients.csv', 'prescriptions.csv', 'rejected_claims.csv']
        .some(f => fs.existsSync(path.join(WATCH_DIR, f)));
      if (hasFiles) {
        console.log('[csv] new files detected, syncing');
        await this.sync();
      }
    }, interval);
  }
}
