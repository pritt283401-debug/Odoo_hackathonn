import { Router } from 'express';
import { body } from 'express-validator';
import { v4 as uuid } from 'uuid';
import { PoolConnection } from 'mysql2/promise';
import { query, queryOne, execute, withTransaction } from '../db/connection';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

type OpType = 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';

// Generate reference number:  REC-20260314-0001, etc.
async function generateRef(type: OpType, userId: string): Promise<string> {
  const prefix: Record<OpType, string> = {
    RECEIPT: 'REC', DELIVERY: 'DEL', TRANSFER: 'TRF', ADJUSTMENT: 'ADJ',
  };
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [row]  = await query<any>(
    `SELECT COUNT(*) AS cnt FROM operations WHERE type = ? AND user_id = ? AND DATE(created_at) = CURDATE()`,
    [type, userId]
  );
  const seq = String((row?.cnt ?? 0) + 1).padStart(4, '0');
  return `${prefix[type]}-${date}-${seq}`;
}

// ─── LIST ────────────────────────────────────────────────────────────────────
router.get('/', async (req: any, res: any) => {
  const userId = req.user!.id;
  const { type, status, warehouse_id, from_date, to_date, page = 1, limit = 30 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const params: any[] = [userId];
  let where = 'WHERE o.user_id = ?';

  if (type)       { where += ' AND o.type = ?';         params.push(type); }
  if (status)     { where += ' AND o.status = ?';       params.push(status); }
  if (from_date)  { where += ' AND o.created_at >= ?';  params.push(from_date); }
  if (to_date)    { where += ' AND o.created_at <= ?';  params.push(to_date + ' 23:59:59'); }
  if (warehouse_id) {
    where += ' AND (fl.warehouse_id = ? OR tl.warehouse_id = ?)';
    params.push(warehouse_id, warehouse_id);
  }

  const sql = `
    SELECT o.id, o.reference, o.type, o.status, o.notes,
           o.scheduled_date, o.effective_date, o.created_at,
           fl.name AS from_location_name, tl.name AS to_location_name,
           u.name  AS responsible_name,
           COUNT(oi.id) AS item_count,
           SUM(oi.quantity_done) AS total_qty
    FROM operations o
    LEFT JOIN locations fl ON o.from_location_id = fl.id
    LEFT JOIN locations tl ON o.to_location_id   = tl.id
    LEFT JOIN users     u  ON o.responsible_id   = u.id
    LEFT JOIN operation_items oi ON o.id = oi.operation_id
    ${where}
    GROUP BY o.id, fl.name, tl.name, u.name
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(String(limit), String(offset));
  const ops = await query(sql, params);
  res.json({ success: true, data: ops, page: Number(page), limit: Number(limit) });
});

// ─── SINGLE ──────────────────────────────────────────────────────────────────
router.get('/:id', async (req: any, res: any) => {
  const op = await queryOne<any>(
    `SELECT o.*, fl.name AS from_location_name, tl.name AS to_location_name, u.name AS responsible_name
     FROM operations o
     LEFT JOIN locations fl ON o.from_location_id = fl.id
     LEFT JOIN locations tl ON o.to_location_id = tl.id
     LEFT JOIN users u ON o.responsible_id = u.id
     WHERE o.id = ?`,
    [req.params.id]
  );
  if (!op) return res.status(404).json({ success: false, message: 'Operation not found' });

  const items = await query(
    `SELECT oi.*, p.name AS product_name, p.sku, p.uom
     FROM operation_items oi JOIN products p ON oi.product_id = p.id
     WHERE oi.operation_id = ?`,
    [req.params.id]
  );
  res.json({ success: true, data: { ...op, items } });
});

// ─── CREATE ──────────────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('type').isIn(['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT']).withMessage('Invalid type'),
    body('items').isArray({ min: 1 }).withMessage('At least one item required'),
    body('items.*.product_id').notEmpty(),
    body('items.*.quantity_demand').isFloat({ min: 0.0001 }),
    body('from_location_id').optional(),
    body('to_location_id').optional(),
  ],
  validate,
  async (req: any, res: any) => {
    const userId = req.user!.id;
    const { type, from_location_id, to_location_id, notes, scheduled_date, items } = req.body;
    const reference = await generateRef(type as OpType, userId);
    const id = uuid();

    await execute(
      `INSERT INTO operations (id, user_id, reference, type, status, from_location_id, to_location_id,
        responsible_id, notes, scheduled_date) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, userId, reference, type, 'DRAFT', from_location_id || null, to_location_id || null,
       req.user.id, notes || null, scheduled_date || null]
    );

    for (const item of items) {
      await execute(
        'INSERT INTO operation_items (id, operation_id, product_id, quantity_demand, quantity_done) VALUES (?,?,?,?,0)',
        [uuid(), id, item.product_id, item.quantity_demand]
      );
    }

    const created = await queryOne<any>('SELECT * FROM operations WHERE id = ?', [id]);
    const opItems = await query('SELECT * FROM operation_items WHERE operation_id = ?', [id]);
    res.status(201).json({ success: true, data: { ...created, items: opItems } });
  }
);

// ─── UPDATE ──────────────────────────────────────────────────────────────────
router.put('/:id', async (req: any, res: any) => {
  const userId = req.user!.id;
  const op = await queryOne<any>('SELECT * FROM operations WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (!op) return res.status(404).json({ success: false, message: 'Not found' });
  if (['DONE', 'CANCELED'].includes(op.status)) {
    return res.status(400).json({ success: false, message: 'Cannot edit a completed operation' });
  }

  const { from_location_id, to_location_id, notes, scheduled_date, status, items } = req.body;
  const fields: string[] = []; const vals: any[] = [];
  if (from_location_id !== undefined) { fields.push('from_location_id = ?'); vals.push(from_location_id || null); }
  if (to_location_id   !== undefined) { fields.push('to_location_id = ?');   vals.push(to_location_id || null); }
  if (notes            !== undefined) { fields.push('notes = ?');             vals.push(notes); }
  if (scheduled_date   !== undefined) { fields.push('scheduled_date = ?');    vals.push(scheduled_date); }
  if (status           !== undefined) { fields.push('status = ?');            vals.push(status); }

  if (fields.length) {
    vals.push(req.params.id);
    await execute(`UPDATE operations SET ${fields.join(',')} WHERE id = ? AND user_id = ?`, [...vals, userId]);
  }

  if (items && Array.isArray(items)) {
    await execute('DELETE FROM operation_items WHERE operation_id = ?', [req.params.id]);
    for (const item of items) {
      await execute(
        'INSERT INTO operation_items (id, operation_id, product_id, quantity_demand, quantity_done) VALUES (?,?,?,?,?)',
        [uuid(), req.params.id, item.product_id, item.quantity_demand, item.quantity_done || 0]
      );
    }
  }

  const updated = await queryOne<any>('SELECT * FROM operations WHERE id = ?', [req.params.id]);
  const opItems = await query('SELECT * FROM operation_items WHERE operation_id = ?', [req.params.id]);
  res.json({ success: true, data: { ...updated, items: opItems } });
});

// ─── VALIDATE (atomic stock mutation) ────────────────────────────────────────
router.post('/:id/validate', async (req: any, res: any) => {
  const { quantities } = req.body; // optional: { itemId: qty_done }

  await withTransaction(async (conn: PoolConnection) => {
    const [opRows] = await conn.execute<any[]>('SELECT * FROM operations WHERE id = ? FOR UPDATE', [req.params.id]);
    const op = opRows[0];
    if (!op) throw Object.assign(new Error('Operation not found'), { status: 404 });
    if (op.status === 'DONE') throw Object.assign(new Error('Already validated'), { status: 400 });
    if (op.status === 'CANCELED') throw Object.assign(new Error('Cannot validate canceled operation'), { status: 400 });

    const [itemRows] = await conn.execute<any[]>(
      'SELECT * FROM operation_items WHERE operation_id = ?', [op.id]
    );
    if (!itemRows.length) throw Object.assign(new Error('No items in operation'), { status: 400 });

    // Update done quantities if provided
    for (const item of itemRows) {
      const qty = quantities?.[item.id] ?? item.quantity_demand;
      await conn.execute('UPDATE operation_items SET quantity_done = ? WHERE id = ?', [qty, item.id]);
      item.quantity_done = qty;
    }

    // Apply stock changes + create ledger entries
    for (const item of itemRows) {
      const qty: number = Number(item.quantity_done);
      if (qty === 0) continue;

      const upsertStock = async (locId: string, delta: number) => {
        // Upsert stock
        await conn.execute(
          `INSERT INTO stock (id, product_id, location_id, quantity)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
          [uuid(), item.product_id, locId, delta, delta]
        );
        // Get new quantity for ledger
        const [sRows] = await conn.execute<any[]>(
          'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
          [item.product_id, locId]
        );
        const qtyAfter = sRows[0]?.quantity ?? 0;

        // Insert ledger entry
        await conn.execute(
          `INSERT INTO stock_ledger
           (id, product_id, location_id, quantity_change, quantity_after, type, reference, operation_id, performed_by)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [uuid(), item.product_id, locId, delta, qtyAfter,
           op.type, op.reference, op.id, req.user.id]
        );
      };

      switch (op.type as OpType) {
        case 'RECEIPT':
          if (!op.to_location_id) throw new Error('Receipt needs a destination location');
          await upsertStock(op.to_location_id, +qty);
          break;

        case 'DELIVERY':
          if (!op.from_location_id) throw new Error('Delivery needs a source location');
          await upsertStock(op.from_location_id, -qty);
          break;

        case 'TRANSFER':
          if (!op.from_location_id || !op.to_location_id) throw new Error('Transfer needs both source and destination');
          await upsertStock(op.from_location_id, -qty);
          await upsertStock(op.to_location_id, +qty);
          break;

        case 'ADJUSTMENT':
          // Adjustment uses to_location_id as the target location
          // quantity_done can be negative (decrease) or positive (increase)
          if (!op.to_location_id) throw new Error('Adjustment needs a location');
          // For adjustment: quantity_done is the NEW target quantity
          const [curRows] = await conn.execute<any[]>(
            'SELECT quantity FROM stock WHERE product_id = ? AND location_id = ?',
            [item.product_id, op.to_location_id]
          );
          const currentQty = Number(curRows[0]?.quantity ?? 0);
          const targetQty  = Number(item.quantity_done);
          const delta      = targetQty - currentQty;

          await conn.execute(
            `INSERT INTO stock (id, product_id, location_id, quantity)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = ?`,
            [uuid(), item.product_id, op.to_location_id, targetQty, targetQty]
          );
          await conn.execute(
            `INSERT INTO stock_ledger
             (id, product_id, location_id, quantity_change, quantity_after, type, reference, operation_id, performed_by)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [uuid(), item.product_id, op.to_location_id, delta, targetQty,
             'ADJUSTMENT', op.reference, op.id, req.user.id]
          );
          break;
      }
    }

    // Mark operation DONE
    await conn.execute(
      'UPDATE operations SET status = ?, effective_date = NOW() WHERE id = ?',
      ['DONE', op.id]
    );

    const [finalOp]    = await conn.execute<any[]>('SELECT * FROM operations WHERE id = ?', [op.id]);
    const [finalItems] = await conn.execute<any[]>('SELECT * FROM operation_items WHERE operation_id = ?', [op.id]);
    res.json({ success: true, message: 'Operation validated', data: { ...finalOp[0], items: finalItems } });
  });
});

// ─── CANCEL ──────────────────────────────────────────────────────────────────
router.post('/:id/cancel', async (req: any, res: any) => {
  const userId = req.user!.id;
  const op = await queryOne<any>('SELECT * FROM operations WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (!op) return res.status(404).json({ success: false, message: 'Not found' });
  if (op.status === 'DONE') return res.status(400).json({ success: false, message: 'Cannot cancel a completed operation' });

  await execute('UPDATE operations SET status = ? WHERE id = ? AND user_id = ?', ['CANCELED', req.params.id, userId]);
  res.json({ success: true, message: 'Operation canceled' });
});

export default router;
