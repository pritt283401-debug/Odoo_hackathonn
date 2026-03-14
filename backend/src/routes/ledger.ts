import { Router } from 'express';
import { query } from '../db/connection';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/ledger?product_id=&location_id=&type=&from_date=&to_date=&page=1&limit=50
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const { product_id, location_id, type, from_date, to_date, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any[] = [userId];
    let where = 'WHERE p.user_id = ?';

    // Only add filter parameters if they exist and are not empty strings
    if (product_id && product_id !== '' && product_id !== 'undefined') { 
      where += ' AND sl.product_id = ?'; 
      params.push(Number(product_id)); 
    }
    if (location_id && location_id !== '' && location_id !== 'undefined') { 
      where += ' AND sl.location_id = ?'; 
      params.push(Number(location_id)); 
    }
    if (type && type !== '' && type !== 'undefined') { 
      where += ' AND sl.type = ?'; 
      params.push(type); 
    }
    if (from_date && from_date !== '' && from_date !== 'undefined') { 
      where += ' AND sl.created_at >= ?'; 
      params.push(from_date); 
    }
    if (to_date && to_date !== '' && to_date !== 'undefined') { 
      where += ' AND sl.created_at <= ?'; 
      params.push(to_date + ' 23:59:59'); 
    }

    // Always add limit and offset as separate parameters
    const allParams = [...params];

    // Build SQL with inline LIMIT/OFFSET to avoid parameter issues
    const sql = `SELECT sl.*, p.name AS product_name, p.sku, p.uom,
                       l.name AS location_name, w.name AS warehouse_name,
                       u.name AS performed_by_name
                FROM stock_ledger sl
                JOIN products p ON sl.product_id = p.id
                JOIN locations l ON sl.location_id = l.id
                LEFT JOIN warehouses w ON l.warehouse_id = w.id
                LEFT JOIN users u ON sl.performed_by = u.id
                ${where}
                ORDER BY sl.created_at DESC
                LIMIT ${Number(limit)} OFFSET ${offset}`;

    const rows = await query(sql, allParams);

    res.json({ success: true, data: rows, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    console.error('Ledger route error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
