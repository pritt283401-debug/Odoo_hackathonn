import { Router } from 'express';
import { query, queryOne } from '../db/connection';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: any, res: any) => {
  const userId = req.user!.id;
  const [
    totalProducts,
    totalStock,
    lowStock,
    outOfStock,
    pendingReceipts,
    pendingDeliveries,
    pendingTransfers,
    recentOps,
  ] = await Promise.all([
    queryOne<any>('SELECT COUNT(*) AS cnt FROM products WHERE is_active = 1 AND user_id = ?', [userId]),
    queryOne<any>('SELECT COALESCE(SUM(s.quantity),0) AS total FROM stock s JOIN products p ON s.product_id = p.id WHERE p.is_active=1 AND p.user_id = ?', [userId]),
    queryOne<any>(`
      SELECT COUNT(DISTINCT p.id) AS cnt
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.is_active = 1 AND p.user_id = ?
      GROUP BY 1
      HAVING COALESCE(SUM(s.quantity),0) > 0 AND COALESCE(SUM(s.quantity),0) <= p.min_stock
    `, [userId]).catch(() => ({ cnt: 0 })),
    queryOne<any>(`
      SELECT COUNT(DISTINCT p.id) AS cnt
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.is_active = 1 AND p.user_id = ?
      HAVING COALESCE(SUM(s.quantity),0) = 0
    `, [userId]).catch(() => ({ cnt: 0 })),
    queryOne<any>(`SELECT COUNT(*) AS cnt FROM operations WHERE type='RECEIPT' AND status NOT IN ('DONE','CANCELED') AND user_id = ?`, [userId]),
    queryOne<any>(`SELECT COUNT(*) AS cnt FROM operations WHERE type='DELIVERY' AND status NOT IN ('DONE','CANCELED') AND user_id = ?`, [userId]),
    queryOne<any>(`SELECT COUNT(*) AS cnt FROM operations WHERE type='TRANSFER' AND status NOT IN ('DONE','CANCELED') AND user_id = ?`, [userId]),
    query<any>(`
      SELECT o.id, o.reference, o.type, o.status, o.created_at,
             fl.name AS from_location, tl.name AS to_location,
             u.name  AS responsible,
             COUNT(oi.id) AS item_count
      FROM operations o
      LEFT JOIN locations fl ON o.from_location_id = fl.id
      LEFT JOIN locations tl ON o.to_location_id = tl.id
      LEFT JOIN users u ON o.responsible_id = u.id
      LEFT JOIN operation_items oi ON o.id = oi.operation_id
      WHERE o.user_id = ?
      GROUP BY o.id, fl.name, tl.name, u.name
      ORDER BY o.created_at DESC LIMIT 8
    `, [userId]),
  ]);

  // Low stock list
  const lowStockProducts = await query<any>(`
    SELECT p.id, p.name, p.sku, p.uom, p.min_stock,
           COALESCE(SUM(s.quantity),0) AS total_stock,
           c.name AS category_name
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 AND p.user_id = ?
    GROUP BY p.id, c.name
    HAVING total_stock <= p.min_stock
    ORDER BY total_stock ASC
    LIMIT 10
  `, [userId]);

  res.json({
    success: true,
    data: {
      kpis: {
        total_products:      totalProducts?.cnt       ?? 0,
        total_stock:         Number(totalStock?.total ?? 0),
        low_stock_count:     lowStock?.cnt            ?? 0,
        out_of_stock_count:  outOfStock?.cnt          ?? 0,
        pending_receipts:    pendingReceipts?.cnt     ?? 0,
        pending_deliveries:  pendingDeliveries?.cnt   ?? 0,
        pending_transfers:   pendingTransfers?.cnt    ?? 0,
      },
      recent_operations: recentOps,
      low_stock_items:   lowStockProducts,
    },
  });
});

export default router;
