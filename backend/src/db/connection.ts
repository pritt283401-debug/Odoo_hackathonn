import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'core_inventory',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           '+00:00',
  dateStrings:        false,
});

export async function query<T = unknown>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const safeParams = params?.map(p => (p === undefined ? null : p));
  console.log(`\n[DB QUERY] ${sql}\n[PARAMS]`, safeParams);
  try {
    const [rows] = safeParams && safeParams.length > 0
      ? await pool.execute(sql, safeParams)
      : await pool.query(sql);
    return rows as T[];
  } catch (err: any) {
    console.error(`\n❌ [DB ERROR] ${err.message}\nSQL: ${sql}\nPARAMS:`, safeParams);
    throw err;
  }
}

export async function queryOne<T = unknown>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  params?: any[]
): Promise<mysql.ResultSetHeader> {
  const safeParams = params?.map(p => (p === undefined ? null : p));
  console.log(`\n[DB EXECUTE] ${sql}\n[PARAMS]`, safeParams);
  try {
    const [result] = safeParams && safeParams.length > 0
      ? await pool.execute(sql, safeParams)
      : await pool.query(sql);
    return result as mysql.ResultSetHeader;
  } catch (err: any) {
    console.error(`\n❌ [DB ERROR] ${err.message}\nSQL: ${sql}\nPARAMS:`, safeParams);
    throw err;
  }
}

export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  console.log('✅ MySQL connected successfully');
  conn.release();
  
  // Run migrations
  await runMigrations();
}

async function runMigrations(): Promise<void> {
  try {
    // Add mobile column to users table if it doesn't exist
    const [mobileCol]: any = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mobile'
    `);
    if (mobileCol.length === 0) {
      await pool.execute(`ALTER TABLE users ADD COLUMN mobile VARCHAR(20) DEFAULT NULL`);
      console.log('✅ Migration: mobile column added to users table');
    }

    // Add user_id to categories table
    const [catCol]: any = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'user_id'
    `);
    if (catCol.length === 0) {
      await pool.execute(`ALTER TABLE categories ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT 'system'`);
      await pool.execute(`ALTER TABLE categories ADD INDEX idx_categories_user (user_id)`);
      console.log('✅ Migration: user_id column added to categories table');
    }

    // Add user_id to products table
    const [prodCol]: any = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'user_id'
    `);
    if (prodCol.length === 0) {
      await pool.execute(`ALTER TABLE products ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT 'system'`);
      await pool.execute(`ALTER TABLE products ADD INDEX idx_products_user (user_id)`);
      await pool.execute(`ALTER TABLE products DROP INDEX uk_products_sku`);
      await pool.execute(`ALTER TABLE products ADD UNIQUE KEY uk_products_sku_user (user_id, sku)`);
      console.log('✅ Migration: user_id column added to products table');
    }

    // Add user_id to warehouses table
    const [whCol]: any = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'warehouses' AND COLUMN_NAME = 'user_id'
    `);
    if (whCol.length === 0) {
      await pool.execute(`ALTER TABLE warehouses ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT 'system'`);
      await pool.execute(`ALTER TABLE warehouses ADD INDEX idx_warehouses_user (user_id)`);
      await pool.execute(`ALTER TABLE warehouses DROP INDEX uk_warehouses_code`);
      await pool.execute(`ALTER TABLE warehouses ADD UNIQUE KEY uk_warehouses_code_user (user_id, code)`);
      console.log('✅ Migration: user_id column added to warehouses table');
    }

    // Add user_id to operations table
    const [opCol]: any = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operations' AND COLUMN_NAME = 'user_id'
    `);
    if (opCol.length === 0) {
      await pool.execute(`ALTER TABLE operations ADD COLUMN user_id VARCHAR(36) NOT NULL DEFAULT 'system'`);
      await pool.execute(`ALTER TABLE operations ADD INDEX idx_operations_user (user_id)`);
      await pool.execute(`ALTER TABLE operations DROP INDEX uk_operations_reference`);
      await pool.execute(`ALTER TABLE operations ADD UNIQUE KEY uk_operations_reference_user (user_id, reference)`);
      console.log('✅ Migration: user_id column added to operations table');
    }

    // Fix categories unique constraint to be per-user instead of global
    try {
      await pool.execute(`ALTER TABLE categories DROP INDEX uk_categories_name`);
      await pool.execute(`ALTER TABLE categories ADD UNIQUE KEY uk_categories_user_name (user_id, name)`);
      console.log('✅ Migration: Fixed categories unique constraint to be per-user');
    } catch (err: any) {
      // Ignore errors - constraint might already be fixed or have data conflicts
    }

    // Seed default categories for users who don't have any (ignore duplicates)
    const { v4: uuidv4 } = await import('uuid');
    const [allUsers]: any = await pool.query(`SELECT id FROM users`);
    const defaultCategories = ['Electronics', 'Hardware', 'Raw Materials', 'Finished Goods', 'Office Supplies'];
    let seededCount = 0;
    for (const user of allUsers) {
      for (const catName of defaultCategories) {
        try {
          await pool.execute(
            'INSERT IGNORE INTO categories (id, user_id, name, description) VALUES (?, ?, ?, ?)',
            [uuidv4(), user.id, catName, 'Default category']
          );
          seededCount++;
        } catch (e) { /* ignore duplicates */ }
      }
    }
    if (seededCount > 0) {
      console.log(`✅ Seeded ${seededCount} default categories`);
    }

    console.log('✅ All migrations completed');
  } catch (err: any) {
    console.log('⚠️ Migration error:', err.message);
  }
}

export default pool;
