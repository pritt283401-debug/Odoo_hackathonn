import { Router } from 'express';
import { body } from 'express-validator';
import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '../db/connection';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/warehouses
router.get('/', async (req: any, res: any) => {
  const userId = req.user!.id;
  const warehouses = await query(`
    SELECT w.*, COUNT(l.id) AS location_count
    FROM warehouses w
    LEFT JOIN locations l ON w.id = l.warehouse_id AND l.is_active = 1
    WHERE w.is_active = 1 AND w.user_id = ?
    GROUP BY w.id ORDER BY w.name
  `, [userId]);
  res.json({ success: true, data: warehouses });
});

// GET /api/warehouses/:id  with locations
router.get('/:id', async (req: any, res: any) => {
  const userId = req.user!.id;
  const wh = await queryOne<any>('SELECT * FROM warehouses WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (!wh) return res.status(404).json({ success: false, message: 'Warehouse not found' });

  const locations = await query(
    'SELECT * FROM locations WHERE warehouse_id = ? AND is_active = 1 ORDER BY name',
    [req.params.id]
  );
  res.json({ success: true, data: { ...wh, locations } });
});

// POST /api/warehouses
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('code').trim().notEmpty().toUpperCase(),
  ],
  validate,
  async (req: any, res: any) => {
    const userId = req.user!.id;
    const { name, code, address = '' } = req.body;
    const existing = await queryOne('SELECT id FROM warehouses WHERE code = ? AND user_id = ?', [code, userId]);
    if (existing) return res.status(409).json({ success: false, message: 'Warehouse code already exists' });

    const id = uuid();
    await execute('INSERT INTO warehouses (id, user_id, name, code, address) VALUES (?,?,?,?,?)', [id, userId, name, code, address]);
    res.status(201).json({ success: true, data: await queryOne('SELECT * FROM warehouses WHERE id = ?', [id]) });
  }
);

// PUT /api/warehouses/:id
router.put('/:id', async (req: any, res: any) => {
  const userId = req.user!.id;
  const { name, code, address } = req.body;
  const fields: string[] = []; const vals: any[] = [];
  if (name    ) { fields.push('name = ?');    vals.push(name); }
  if (code    ) { fields.push('code = ?');    vals.push(code.toUpperCase()); }
  if (address !== undefined) { fields.push('address = ?'); vals.push(address); }
  if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
  
  // Verify ownership
  const wh = await queryOne('SELECT id FROM warehouses WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (!wh) return res.status(404).json({ success: false, message: 'Warehouse not found' });
  
  vals.push(req.params.id);
  await execute(`UPDATE warehouses SET ${fields.join(',')} WHERE id = ? AND user_id = ?`, [...vals, userId]);
  res.json({ success: true, data: await queryOne('SELECT * FROM warehouses WHERE id = ?', [req.params.id]) });
});

// DELETE /api/warehouses/:id (soft)
router.delete('/:id', async (req: any, res: any) => {
  const userId = req.user!.id;
  const result = await execute('UPDATE warehouses SET is_active = 0 WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Warehouse not found' });
  res.json({ success: true, message: 'Warehouse deactivated' });
});

// ─── Locations (nested under warehouse) ──────────────────────────────────────

// GET /api/warehouses/locations/all  → all active locations (for dropdowns)
router.get('/locations/all', async (req: any, res: any) => {
  const userId = req.user!.id;
  const locations = await query(`
    SELECT l.*, w.name AS warehouse_name, w.code AS warehouse_code
    FROM locations l
    LEFT JOIN warehouses w ON l.warehouse_id = w.id
    WHERE l.is_active = 1 AND w.user_id = ?
    ORDER BY l.type, l.name
  `, [userId]);
  res.json({ success: true, data: locations });
});

// POST /api/warehouses/:id/locations
router.post(
  '/:id/locations',
  [body('name').trim().notEmpty(), body('type').isIn(['STOCK', 'VENDOR', 'CUSTOMER'])],
  validate,
  async (req: any, res: any) => {
    const { name, type = 'STOCK' } = req.body;
    const lid = uuid();
    await execute(
      'INSERT INTO locations (id, name, type, warehouse_id) VALUES (?,?,?,?)',
      [lid, name, type, req.params.id]
    );
    res.status(201).json({ success: true, data: await queryOne('SELECT * FROM locations WHERE id = ?', [lid]) });
  }
);

// DELETE /api/warehouses/locations/:lid (soft)
router.delete('/locations/:lid', async (req: any, res: any) => {
  await execute('UPDATE locations SET is_active = 0 WHERE id = ?', [req.params.lid]);
  res.json({ success: true, message: 'Location deactivated' });
});

export default router;
