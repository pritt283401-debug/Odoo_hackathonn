import { Router } from 'express';
import { body, query as qParam } from 'express-validator';
import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '../db/connection';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/products?search=&category=&lowStock=true&page=1&limit=20
router.get('/', async (req: any, res: any) => {
  const { search = '', category = '', lowStock, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const userId = req.user!.id;

  let whereClause = 'WHERE p.is_active = 1 AND p.user_id = ?';
  const params: any[] = [userId];

  if (search) {
    whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    whereClause += ' AND p.category_id = ?';
    params.push(category);
  }

  const sql = `
    SELECT
      p.id, p.name, p.sku, p.uom, p.min_stock, p.description, p.created_at,
      c.id AS category_id, c.name AS category_name,
      COALESCE(SUM(s.quantity), 0) AS total_stock
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN stock s ON p.id = s.product_id
    ${whereClause}
    GROUP BY p.id, c.id
    ${lowStock === 'true' ? 'HAVING total_stock <= p.min_stock' : ''}
    ORDER BY p.name
    LIMIT ? OFFSET ?
  `;
  params.push(String(limit), String(offset));

  const countSql = `
    SELECT COUNT(*) AS total FROM products p ${whereClause}
    ${lowStock === 'true' ? 'HAVING COALESCE((SELECT SUM(quantity) FROM stock WHERE product_id=p.id),0) <= p.min_stock' : ''}
  `;

  const products = await query(sql, params);
  const [countRow] = await query<any>(countSql, params.slice(0, -2));

  res.json({ success: true, data: products, total: countRow?.total ?? 0, page: Number(page), limit: Number(limit) });
});

// GET /api/products/:id
router.get('/:id', async (req: any, res: any) => {
  const userId = req.user!.id;
  const product = await queryOne<any>(
    `SELECT p.*, c.name AS category_name
     FROM products p LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.id = ? AND p.is_active = 1 AND p.user_id = ?`,
    [req.params.id, userId]
  );
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const stocks = await query(
    `SELECT s.*, l.name AS location_name, w.name AS warehouse_name
     FROM stock s
     JOIN locations l ON s.location_id = l.id
     LEFT JOIN warehouses w ON l.warehouse_id = w.id
     WHERE s.product_id = ?`,
    [req.params.id]
  );

  res.json({ success: true, data: { ...product, stocks } });
});

// POST /api/products
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('sku').trim().notEmpty().withMessage('SKU is required'),
    body('category_id').notEmpty().withMessage('Category is required'),
    body('uom').optional().trim(),
    body('min_stock').optional().isFloat({ min: 0 }),
    body('initial_quantity').optional().isFloat({ min: 0 }),
    body('initial_location_id').optional(),
  ],
  validate,
  async (req: any, res: any) => {
    const userId = req.user!.id;
    const { name, sku, category_id, uom = 'Units', min_stock = 0, description = '', initial_quantity, initial_location_id } = req.body;

    const existing = await queryOne('SELECT id FROM products WHERE sku = ? AND user_id = ?', [sku, userId]);
    if (existing) return res.status(409).json({ success: false, message: 'SKU already exists' });

    const id = uuid();
    await execute(
      'INSERT INTO products (id, user_id, name, sku, uom, min_stock, category_id, description) VALUES (?,?,?,?,?,?,?,?)',
      [id, userId, name, sku, uom, min_stock, category_id, description]
    );

    // Optional initial stock
    if (initial_quantity && initial_quantity > 0 && initial_location_id) {
      const sid = uuid();
      await execute(
        'INSERT INTO stock (id, product_id, location_id, quantity) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
        [sid, id, initial_location_id, initial_quantity, initial_quantity]
      );
    }

    const product = await queryOne('SELECT * FROM products WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: product });
  }
);

// PUT /api/products/:id
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('sku').optional().trim().notEmpty(),
    body('min_stock').optional().isFloat({ min: 0 }),
  ],
  validate,
  async (req: any, res: any) => {
    const userId = req.user!.id;
    const { name, sku, uom, min_stock, description, category_id } = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    if (name      !== undefined) { fields.push('name = ?');        values.push(name); }
    if (sku       !== undefined) { fields.push('sku = ?');         values.push(sku); }
    if (uom       !== undefined) { fields.push('uom = ?');         values.push(uom); }
    if (min_stock !== undefined) { fields.push('min_stock = ?');   values.push(min_stock); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (category_id !== undefined) { fields.push('category_id = ?'); values.push(category_id); }

    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    // Verify product belongs to user
    const product = await queryOne('SELECT id FROM products WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    values.push(req.params.id);
    await execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, [...values, userId]);

    const updated = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  }
);

// DELETE /api/products/:id  (soft delete)
router.delete('/:id', async (req: any, res: any) => {
  const userId = req.user!.id;
  const result = await execute('UPDATE products SET is_active = 0 WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, message: 'Product deactivated' });
});

// GET /api/products/:id/stock  - per-location stock
router.get('/:id/stock', async (req: any, res: any) => {
  const stocks = await query(
    `SELECT s.quantity, l.id AS location_id, l.name AS location_name, w.name AS warehouse_name
     FROM stock s
     JOIN locations l ON s.location_id = l.id
     LEFT JOIN warehouses w ON l.warehouse_id = w.id
     WHERE s.product_id = ? ORDER BY l.name`,
    [req.params.id]
  );
  res.json({ success: true, data: stocks });
});

export default router;
