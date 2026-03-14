import { Router } from 'express';
import { body } from 'express-validator';
import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '../db/connection';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: any, res: any) => {
  const userId = req.user!.id;
  const cats = await query('SELECT * FROM categories WHERE user_id = ? ORDER BY name', [userId]);
  res.json({ success: true, data: cats });
});

router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Name is required')],
  validate,
  async (req: any, res: any) => {
    const userId = req.user!.id;
    const { name, description = '' } = req.body;
    const existing = await queryOne('SELECT id FROM categories WHERE name = ? AND user_id = ?', [name, userId]);
    if (existing) return res.status(409).json({ success: false, message: 'Category already exists' });

    const id = uuid();
    await execute('INSERT INTO categories (id, user_id, name, description) VALUES (?,?,?,?)', [id, userId, name, description]);
    const cat = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: cat });
  }
);

router.put(
  '/:id',
  [body('name').optional().trim().notEmpty()],
  validate,
  async (req: any, res: any) => {
    const userId = req.user!.id;
    const { name, description } = req.body;
    const fields: string[] = [];
    const vals: any[] = [];
    if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
    if (description !== undefined) { fields.push('description = ?'); vals.push(description); }
    if (!fields.length) return res.status(400).json({ success: false, message: 'Nothing to update' });
    
    // Verify ownership
    const cat = await queryOne('SELECT id FROM categories WHERE id = ? AND user_id = ?', [req.params.id, userId]);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    
    vals.push(req.params.id);
    await execute(`UPDATE categories SET ${fields.join(',')} WHERE id = ? AND user_id = ?`, [...vals, userId]);
    const updated = await queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated });
  }
);

router.delete('/:id', async (req: any, res: any) => {
  const userId = req.user!.id;
  const result = await execute('DELETE FROM categories WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category deleted' });
});

export default router;
