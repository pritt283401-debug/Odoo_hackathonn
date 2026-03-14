-- Migration: Add mobile column to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile VARCHAR(20) DEFAULT NULL;
