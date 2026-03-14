#!/usr/bin/env node
/**
 * CoreInventory - Database Setup Script
 * Run: node scripts/setup-db.js
 *
 * This script:
 * 1. Creates the database if it doesn't exist
 * 2. Runs the schema.sql
 * 3. Runs the seed.sql
 */

const mysql  = require('mysql2/promise');
const fs     = require('fs');
const path   = require('path');
require('dotenv').config();

const host     = process.env.DB_HOST     || 'localhost';
const port     = parseInt(process.env.DB_PORT     || '3306', 10);
const user     = process.env.DB_USER     || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME     || 'core_inventory';

async function runFile(conn, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await conn.query(sql);
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
      console.warn('⚠️  Warning:', err.message.slice(0, 500));
    }
  }
}

async function main() {
  console.log('\n🔧 CoreInventory Database Setup');
  console.log('================================');

  // Connect without specifying database first
  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });

  try {
    console.log('✅ Connected to MySQL');

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${database}' ready`);

    await conn.query(`USE \`${database}\``);

    const schemaPath = path.join(__dirname, '../src/db/schema.sql');
    console.log('📋 Running schema.sql…');
    await runFile(conn, schemaPath);
    console.log('✅ Schema applied');

    const seedPath = path.join(__dirname, '../src/db/seed.sql');
    console.log('🌱 Running seed.sql…');
    await runFile(conn, seedPath);
    console.log('✅ Seed data loaded');

    console.log('\n🎉 Setup complete!');
    console.log('─────────────────────────────');
    console.log('Demo credentials:');
    console.log('  Email: admin@coreinventory.com');
    console.log('  Password: password');
    console.log('─────────────────────────────\n');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  console.error('\nMake sure MySQL is running and your .env is configured correctly.');
  console.error('Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in backend/.env\n');
  process.exit(1);
});
