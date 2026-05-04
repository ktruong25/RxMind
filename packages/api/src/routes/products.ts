import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { ndcLookup } from '../services/ndc';

const router = Router();

// GET /products?search=metformin
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const search = req.query.search as string | undefined;
    if (search) {
      const { rows } = await query(
        `SELECT * FROM products
         WHERE generic_name ILIKE $1 OR brand_name ILIKE $1 OR ndc ILIKE $1
         ORDER BY generic_name LIMIT 50`,
        [`%${search}%`]
      );
      return res.json(rows);
    }
    const { rows } = await query(
      'SELECT * FROM products WHERE active=true ORDER BY generic_name LIMIT 100'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /products/ndc/:ndc — lookup from FDA then upsert
router.get('/ndc/:ndc', requireAuth, async (req, res, next) => {
  try {
    const ndc = req.params.ndc.replace(/-/g, '');

    // Check local cache first
    const { rows: cached } = await query('SELECT * FROM products WHERE ndc=$1', [ndc]);
    if (cached[0]) return res.json(cached[0]);

    // Hit FDA API
    const fdaProduct = await ndcLookup(ndc);
    if (!fdaProduct) return res.status(404).json({ error: 'NDC not found' });

    // Upsert
    const { rows } = await query(
      `INSERT INTO products
        (ndc, brand_name, generic_name, labeler, dosage_form, route, strength, package_size, fda_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (ndc) DO UPDATE SET
         brand_name=EXCLUDED.brand_name,
         generic_name=EXCLUDED.generic_name,
         updated_at=NOW()
       RETURNING *`,
      [
        ndc,
        fdaProduct.brand_name,
        fdaProduct.generic_name,
        fdaProduct.labeler,
        fdaProduct.dosage_form,
        fdaProduct.route,
        fdaProduct.strength,
        fdaProduct.package_size,
        JSON.stringify(fdaProduct.raw),
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /products — manual upsert
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = z.object({
      ndc: z.string(),
      genericName: z.string(),
      brandName: z.string().optional(),
      labeler: z.string().optional(),
      dosageForm: z.string().optional(),
      route: z.string().optional(),
      strength: z.string().optional(),
    }).parse(req.body);

    const { rows } = await query(
      `INSERT INTO products (ndc, generic_name, brand_name, labeler, dosage_form, route, strength)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (ndc) DO UPDATE SET
         generic_name=EXCLUDED.generic_name,
         updated_at=NOW()
       RETURNING *`,
      [body.ndc, body.genericName, body.brandName, body.labeler, body.dosageForm, body.route, body.strength]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
