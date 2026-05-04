import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

const MTM_BILLABLE: Record<string, { code: string; amount: number }> = {
  cmt:           { code: '99605', amount: 85 },
  imt:           { code: '99606', amount: 65 },
  tmo:           { code: '99607', amount: 35 },
  annual_review: { code: '99605', amount: 85 },
  adherence:     { code: '99607', amount: 35 },
};

// GET /mtm?status=open
router.get('/', requireAuth, auditLog('read', 'mtm_opportunities'), async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const params: unknown[] = [];
    const where = status ? `WHERE m.status=$1` : '';
    if (status) params.push(status);

    const { rows } = await query(
      `SELECT m.*,
         pt.first_name AS patient_first, pt.last_name AS patient_last,
         pt.phone AS patient_phone
       FROM mtm_opportunities m
       JOIN patients pt ON pt.id = m.patient_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT 100`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /mtm/summary
router.get('/summary', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='open')::int AS open,
        COUNT(*) FILTER (WHERE status='scheduled')::int AS scheduled,
        COUNT(*) FILTER (WHERE status='completed')::int AS completed,
        COUNT(*) FILTER (WHERE status='billed')::int AS billed,
        COALESCE(SUM(billable_amount) FILTER (WHERE status='billed'),0) AS total_billed
      FROM mtm_opportunities
    `);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /mtm/:id
router.get('/:id', requireAuth, auditLog('read', 'mtm_opportunities'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT m.*, pt.first_name, pt.last_name
       FROM mtm_opportunities m JOIN patients pt ON pt.id=m.patient_id
       WHERE m.id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /mtm
router.post('/', requireAuth, auditLog('create', 'mtm_opportunities'), async (req, res, next) => {
  try {
    const body = z.object({
      patientId: z.string().uuid(),
      type: z.enum(['cmt', 'imt', 'tmo', 'annual_review', 'adherence']),
      notes: z.string().optional(),
      scheduledAt: z.string().optional(),
    }).parse(req.body);

    const billable = MTM_BILLABLE[body.type];

    const { rows } = await query(
      `INSERT INTO mtm_opportunities
        (patient_id, type, notes, scheduled_at, billable_code, billable_amount)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [body.patientId, body.type, body.notes, body.scheduledAt, billable.code, billable.amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /mtm/:id
router.patch('/:id', requireAuth, auditLog('update', 'mtm_opportunities'), async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(['open', 'scheduled', 'completed', 'declined', 'billed']).optional(),
      notes: z.string().optional(),
      scheduledAt: z.string().optional(),
      billableAmount: z.number().optional(),
    }).parse(req.body);

    const sets: string[] = ['updated_at=NOW()'];
    const params: unknown[] = [];
    let i = 1;

    if (body.status) { sets.push(`status=$${i++}`); params.push(body.status); }
    if (body.notes !== undefined) { sets.push(`notes=$${i++}`); params.push(body.notes); }
    if (body.scheduledAt !== undefined) { sets.push(`scheduled_at=$${i++}`); params.push(body.scheduledAt); }
    if (body.billableAmount !== undefined) { sets.push(`billable_amount=$${i++}`); params.push(body.billableAmount); }

    if (body.status === 'completed' || body.status === 'billed') {
      sets.push(`completed_by=$${i++}`); params.push(req.user!.id);
      sets.push(`completed_at=NOW()`);
    }

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE mtm_opportunities SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /mtm/scan — auto-identify MTM-eligible patients from prescriptions
router.post('/scan', requireAuth, async (_req, res, next) => {
  try {
    // Patients with 2+ chronic meds and no MTM in last 12 months
    const { rows } = await query(`
      SELECT
        pt.id, pt.first_name, pt.last_name,
        COUNT(rx.id)::int AS chronic_med_count
      FROM patients pt
      JOIN prescriptions rx ON rx.patient_id = pt.id
      WHERE pt.active = true
        AND rx.status = 'active'
        AND rx.days_supply >= 30
        AND NOT EXISTS (
          SELECT 1 FROM mtm_opportunities m
          WHERE m.patient_id = pt.id
            AND m.status NOT IN ('declined')
            AND m.created_at > NOW() - INTERVAL '12 months'
        )
      GROUP BY pt.id, pt.first_name, pt.last_name
      HAVING COUNT(rx.id) >= 2
      ORDER BY chronic_med_count DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
