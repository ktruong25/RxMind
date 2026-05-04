import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

const PatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.record(z.unknown()).optional(),
  insuranceInfo: z.record(z.unknown()).optional(),
  allergyList: z.array(z.string()).optional(),
  notes: z.string().optional(),
  externalId: z.string().optional(),
});

// GET /patients
router.get('/', requireAuth, auditLog('read', 'patients'), async (req, res, next) => {
  try {
    const search = req.query.search as string | undefined;
    const params: unknown[] = [];

    let where = "WHERE active=true";
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (first_name ILIKE $1 OR last_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)`;
    }

    const { rows } = await query(
      `SELECT id, first_name, last_name, dob, gender, phone, email, allergy_list, active, created_at
       FROM patients ${where}
       ORDER BY last_name, first_name
       LIMIT 100`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /patients/:id
router.get('/:id', requireAuth, auditLog('read', 'patients'), async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM patients WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Patient not found' });

    // Include active prescriptions
    const { rows: rxRows } = await query(
      `SELECT rx.*, p.generic_name, p.brand_name, p.ndc
       FROM prescriptions rx
       LEFT JOIN products p ON p.id = rx.product_id
       WHERE rx.patient_id=$1 AND rx.status='active'
       ORDER BY rx.last_fill_date DESC NULLS LAST`,
      [req.params.id]
    );

    res.json({ ...rows[0], prescriptions: rxRows });
  } catch (err) {
    next(err);
  }
});

// GET /patients/:id/adherence
router.get('/:id/adherence', requireAuth, auditLog('read', 'patients'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT rx.*,
         p.generic_name, p.brand_name,
         CASE
           WHEN rx.next_fill_due IS NULL THEN 'unknown'
           WHEN rx.next_fill_due < NOW() - INTERVAL '7 days' THEN 'non_adherent'
           WHEN rx.next_fill_due < NOW() THEN 'overdue'
           ELSE 'on_track'
         END AS adherence_status
       FROM prescriptions rx
       LEFT JOIN products p ON p.id = rx.product_id
       WHERE rx.patient_id=$1 AND rx.status='active'`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /patients/non-adherent — patients overdue on refills
router.get('/list/non-adherent', requireAuth, auditLog('read', 'patients'), async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT DISTINCT
        pt.id, pt.first_name, pt.last_name, pt.phone,
        COUNT(rx.id) FILTER (WHERE rx.next_fill_due < NOW() - INTERVAL '7 days')::int AS overdue_count
      FROM patients pt
      JOIN prescriptions rx ON rx.patient_id = pt.id
      WHERE pt.active = true
        AND rx.status = 'active'
        AND rx.next_fill_due < NOW() - INTERVAL '7 days'
      GROUP BY pt.id, pt.first_name, pt.last_name, pt.phone
      ORDER BY overdue_count DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /patients
router.post('/', requireAuth, auditLog('create', 'patients'), async (req, res, next) => {
  try {
    const body = PatientSchema.parse(req.body);
    const { rows } = await query(
      `INSERT INTO patients
        (first_name, last_name, dob, gender, phone, email, address, insurance_info, allergy_list, notes, external_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        body.firstName, body.lastName, body.dob, body.gender, body.phone, body.email,
        body.address ? JSON.stringify(body.address) : null,
        body.insuranceInfo ? JSON.stringify(body.insuranceInfo) : null,
        body.allergyList ?? [],
        body.notes,
        body.externalId,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /patients/:id
router.patch('/:id', requireAuth, auditLog('update', 'patients'), async (req, res, next) => {
  try {
    const body = PatientSchema.partial().parse(req.body);
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    const fieldMap: Record<string, string> = {
      firstName: 'first_name', lastName: 'last_name', dob: 'dob', gender: 'gender',
      phone: 'phone', email: 'email', notes: 'notes', externalId: 'external_id',
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      const val = (body as Record<string, unknown>)[key];
      if (val !== undefined) { sets.push(`${col}=$${i++}`); params.push(val); }
    }
    if (body.address !== undefined) { sets.push(`address=$${i++}`); params.push(JSON.stringify(body.address)); }
    if (body.insuranceInfo !== undefined) { sets.push(`insurance_info=$${i++}`); params.push(JSON.stringify(body.insuranceInfo)); }
    if (body.allergyList !== undefined) { sets.push(`allergy_list=$${i++}`); params.push(body.allergyList); }

    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    sets.push(`updated_at=NOW()`);
    params.push(req.params.id);

    const { rows } = await query(
      `UPDATE patients SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /patients/:id — soft delete, admin only
router.delete('/:id', requireAuth, requireRole('admin'), auditLog('delete', 'patients'), async (req, res, next) => {
  try {
    await query('UPDATE patients SET active=false, updated_at=NOW() WHERE id=$1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
