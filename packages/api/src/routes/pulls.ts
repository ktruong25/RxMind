import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /pulls
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const status = req.query.status as string | undefined;
    const params: unknown[] = [];
    const where = status ? `WHERE pl.status=$1` : '';
    if (status) params.push(status);

    const { rows } = await query(
      `SELECT pl.*, p.generic_name, p.brand_name, p.ndc, i.lot_number, i.expiry_date
       FROM pulls pl
       JOIN inventory i ON i.id = pl.inventory_id
       JOIN products p ON p.id = i.product_id
       ${where}
       ORDER BY pl.pulled_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /pulls
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      inventoryId: z.string().uuid(),
      reason: z.enum(['expiry', 'damage', 'recall', 'return']),
      quantity: z.number().int().positive(),
      wholesaler: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const { rows } = await query(
      `INSERT INTO pulls (inventory_id, pulled_by, reason, quantity, wholesaler, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [body.inventoryId, req.user!.id, body.reason, body.quantity, body.wholesaler, body.notes]
    );

    // Update inventory quantity
    await query(
      'UPDATE inventory SET quantity = quantity - $1, updated_at=NOW() WHERE id=$2',
      [body.quantity, body.inventoryId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /pulls/:id — update tracking / status
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      status: z.enum(['pending', 'shipped', 'credited', 'disposed']).optional(),
      returnTracking: z.string().optional(),
      creditAmount: z.number().optional(),
    }).parse(req.body);

    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (body.status) { sets.push(`status=$${i++}`); params.push(body.status); }
    if (body.returnTracking) { sets.push(`return_tracking=$${i++}`); params.push(body.returnTracking); }
    if (body.creditAmount !== undefined) { sets.push(`credit_amount=$${i++}`); params.push(body.creditAmount); }
    sets.push(`updated_at=NOW()`);
    params.push(req.params.id);

    const { rows } = await query(
      `UPDATE pulls SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
