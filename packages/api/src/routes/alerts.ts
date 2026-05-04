import { Router } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { runAlertEngine } from '../services/alertEngine';

const router = Router();

// GET /alerts?acknowledged=false&type=expiry_30
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const acknowledged = req.query.acknowledged;
    const type = req.query.type as string | undefined;
    const params: unknown[] = [];
    const conditions: string[] = [];
    let i = 1;

    if (acknowledged !== undefined) {
      conditions.push(`a.acknowledged=$${i++}`);
      params.push(acknowledged === 'true');
    }
    if (type) {
      conditions.push(`a.type=$${i++}`);
      params.push(type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT a.*,
         p.generic_name, p.brand_name, p.ndc,
         pat.first_name AS patient_first, pat.last_name AS patient_last
       FROM alerts a
       LEFT JOIN inventory i ON i.id = a.inventory_id
       LEFT JOIN products p ON p.id = i.product_id
       LEFT JOIN patients pat ON pat.id = a.patient_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /alerts/counts — unacknowledged counts by type
router.get('/counts', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT type, COUNT(*)::int AS count
      FROM alerts
      WHERE acknowledged = false
      GROUP BY type
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /alerts/:id/acknowledge
router.post('/:id/acknowledge', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE alerts
       SET acknowledged=true, acknowledged_by=$1, acknowledged_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [req.user!.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Alert not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /alerts/run-engine — manually trigger alert scan (admin)
router.post('/run-engine', requireAuth, async (_req, res, next) => {
  try {
    const result = await runAlertEngine();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
