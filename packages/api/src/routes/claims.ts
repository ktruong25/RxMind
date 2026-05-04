import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

// GET /claims?status=rejected&patientId=...
router.get('/', requireAuth, auditLog('read', 'claims'), async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const patientId = req.query.patientId as string | undefined;
    const params: unknown[] = [];
    const conditions: string[] = [];
    let i = 1;

    if (status) { conditions.push(`c.status=$${i++}`); params.push(status); }
    if (patientId) { conditions.push(`c.patient_id=$${i++}`); params.push(patientId); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT c.*,
         pt.first_name AS patient_first, pt.last_name AS patient_last, pt.phone AS patient_phone
       FROM claims c
       JOIN patients pt ON pt.id = c.patient_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT 100`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /claims/summary
router.get('/summary', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status='pending')::int AS pending,
        COUNT(*) FILTER (WHERE status='resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE status='ignored')::int AS ignored
      FROM claims
    `);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /claims/:id
router.get('/:id', requireAuth, auditLog('read', 'claims'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*, pt.first_name AS patient_first, pt.last_name AS patient_last
       FROM claims c JOIN patients pt ON pt.id=c.patient_id
       WHERE c.id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /claims
router.post('/', requireAuth, auditLog('create', 'claims'), async (req, res, next) => {
  try {
    const body = z.object({
      patientId: z.string().uuid(),
      prescriptionId: z.string().uuid().optional(),
      rxNumber: z.string().optional(),
      ndc: z.string().optional(),
      bin: z.string().optional(),
      pcn: z.string().optional(),
      groupId: z.string().optional(),
      memberId: z.string().optional(),
      rejectCode: z.string().optional(),
      rejectMessage: z.string().optional(),
      submittedAt: z.string().optional(),
    }).parse(req.body);

    const { rows } = await query(
      `INSERT INTO claims
        (patient_id, prescription_id, rx_number, ndc, bin, pcn, group_id, member_id,
         reject_code, reject_message, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        body.patientId, body.prescriptionId, body.rxNumber, body.ndc,
        body.bin, body.pcn, body.groupId, body.memberId,
        body.rejectCode, body.rejectMessage, body.submittedAt,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /claims/:id — resolve or update status
router.patch('/:id', requireAuth, auditLog('update', 'claims'), async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(['rejected', 'pending', 'resolved', 'ignored']).optional(),
      resolutionNote: z.string().optional(),
      aiFixSuggestion: z.string().optional(),
    }).parse(req.body);

    const sets: string[] = ['updated_at=NOW()'];
    const params: unknown[] = [];
    let i = 1;

    if (body.status) { sets.push(`status=$${i++}`); params.push(body.status); }
    if (body.resolutionNote) { sets.push(`resolution_note=$${i++}`); params.push(body.resolutionNote); }
    if (body.aiFixSuggestion) { sets.push(`ai_fix_suggestion=$${i++}`); params.push(body.aiFixSuggestion); }

    if (body.status === 'resolved') {
      sets.push(`resolved_by=$${i++}`); params.push(req.user!.id);
      sets.push(`resolved_at=NOW()`);
    }

    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE claims SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
