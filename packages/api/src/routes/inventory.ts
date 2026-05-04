import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /inventory?filter=all|expired|30|60|90&search=
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const filter = (req.query.filter as string) || 'all';
    const search = req.query.search as string | undefined;

    let expiryClause = '';
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filter === 'expired') {
      expiryClause = `AND i.expiry_date < NOW()`;
    } else if (filter === '30') {
      expiryClause = `AND i.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`;
    } else if (filter === '60') {
      expiryClause = `AND i.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '60 days'`;
    } else if (filter === '90') {
      expiryClause = `AND i.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'`;
    }

    let searchClause = '';
    if (search) {
      params.push(`%${search}%`);
      searchClause = `AND (p.generic_name ILIKE $${paramIdx} OR p.brand_name ILIKE $${paramIdx} OR p.ndc ILIKE $${paramIdx})`;
      paramIdx++;
    }

    const { rows } = await query(
      `SELECT i.*, p.generic_name, p.brand_name, p.ndc, p.strength, p.dosage_form
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       WHERE i.status = 'active'
       ${expiryClause}
       ${searchClause}
       ORDER BY i.expiry_date ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /inventory/summary
router.get('/summary', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status='active')::int AS total_active,
        COUNT(*) FILTER (WHERE status='active' AND expiry_date < NOW())::int AS expired,
        COUNT(*) FILTER (WHERE status='active' AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS expiring_30,
        COUNT(*) FILTER (WHERE status='active' AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '60 days')::int AS expiring_60,
        COUNT(*) FILTER (WHERE status='active' AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '90 days')::int AS expiring_90,
        COALESCE(SUM(quantity * cost_per_unit) FILTER (WHERE status='active' AND expiry_date < NOW()),0) AS expired_value
      FROM inventory
    `);
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /inventory/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT i.*, p.generic_name, p.brand_name, p.ndc, p.strength
       FROM inventory i JOIN products p ON p.id=i.product_id
       WHERE i.id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /inventory — scan intake
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      ndc: z.string(),
      lotNumber: z.string().optional(),
      expiryDate: z.string(),
      quantity: z.number().int().positive(),
      costPerUnit: z.number().optional(),
      location: z.string().optional(),
    }).parse(req.body);

    // Look up or create product
    let { rows: products } = await query('SELECT id FROM products WHERE ndc=$1', [body.ndc]);
    if (!products[0]) {
      // Auto-fetch from FDA
      const ndcLookup = await import('../services/ndc').then(m => m.ndcLookup);
      const fdaProduct = await ndcLookup(body.ndc);
      if (fdaProduct) {
        const result = await query(
          `INSERT INTO products (ndc, brand_name, generic_name, labeler, dosage_form, route, strength, fda_data)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [body.ndc, fdaProduct.brand_name, fdaProduct.generic_name, fdaProduct.labeler,
           fdaProduct.dosage_form, fdaProduct.route, fdaProduct.strength, JSON.stringify(fdaProduct.raw)]
        );
        products = result.rows;
      } else {
        return res.status(400).json({ error: `Unknown NDC: ${body.ndc}. Add product manually first.` });
      }
    }

    const { rows } = await query(
      `INSERT INTO inventory (product_id, lot_number, expiry_date, quantity, cost_per_unit, location, scanned_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [products[0].id, body.lotNumber, body.expiryDate, body.quantity, body.costPerUnit, body.location, req.user!.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /inventory/:id
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      quantity: z.number().int().optional(),
      location: z.string().optional(),
      status: z.enum(['active', 'pulled', 'returned', 'disposed']).optional(),
    }).parse(req.body);

    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (body.quantity !== undefined) { sets.push(`quantity=$${i++}`); params.push(body.quantity); }
    if (body.location !== undefined) { sets.push(`location=$${i++}`); params.push(body.location); }
    if (body.status !== undefined) { sets.push(`status=$${i++}`); params.push(body.status); }

    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    sets.push(`updated_at=NOW()`);
    params.push(req.params.id);

    const { rows } = await query(
      `UPDATE inventory SET ${sets.join(',')} WHERE id=$${i} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /inventory/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    await query("UPDATE inventory SET status='disposed', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
