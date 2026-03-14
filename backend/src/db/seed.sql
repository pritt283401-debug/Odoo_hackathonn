-- ============================================================
-- CoreInventory IMS - Seed Data
-- ============================================================
USE core_inventory;

-- Default Admin user (password: Admin@123)
-- bcrypt hash of 'Admin@123'
INSERT IGNORE INTO users (id, email, password, name, role) VALUES
('usr-admin-001', 'admin@coreinventory.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'System Admin', 'MANAGER'),
('usr-staff-001', 'staff@coreinventory.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'Warehouse Staff', 'STAFF');

-- Note: The above hash is for 'password' - change before production!
-- To generate a proper hash for 'Admin@123':
-- node -e "const b=require('bcryptjs'); b.hash('Admin@123',10).then(console.log)"

-- Warehouses
INSERT IGNORE INTO warehouses (id, name, code, address) VALUES
('wh-main-001', 'Main Warehouse', 'WH-MAIN', '123 Industrial Zone, City'),
('wh-prod-001', 'Production Floor', 'WH-PROD', '124 Industrial Zone, City');

-- Locations
INSERT IGNORE INTO locations (id, name, type, warehouse_id) VALUES
-- Virtual locations (no warehouse)
('loc-vendor-001',   'Vendors',   'VENDOR',   NULL),
('loc-customer-001', 'Customers', 'CUSTOMER', NULL),
-- Main Warehouse stock locations
('loc-wh-main-001',  'Main Store',      'STOCK', 'wh-main-001'),
('loc-wh-main-002',  'Rack A',          'STOCK', 'wh-main-001'),
('loc-wh-main-003',  'Rack B',          'STOCK', 'wh-main-001'),
('loc-wh-main-004',  'Cold Storage',    'STOCK', 'wh-main-001'),
-- Production Floor locations
('loc-wh-prod-001',  'Production Rack', 'STOCK', 'wh-prod-001'),
('loc-wh-prod-002',  'Assembly Line',   'STOCK', 'wh-prod-001');

-- Categories
INSERT IGNORE INTO categories (id, name, description) VALUES
('cat-001', 'Raw Materials',  'Base materials used in production'),
('cat-002', 'Finished Goods', 'Products ready for shipment'),
('cat-003', 'Office Supplies','Stationery and office items'),
('cat-004', 'Electronics',    'Electronic components and devices'),
('cat-005', 'Packaging',      'Boxes, wraps, and packing material');

-- Products
INSERT IGNORE INTO products (id, name, sku, uom, min_stock, category_id, description) VALUES
('prd-001', 'Steel Rods 10mm',  'SKU-STL-001', 'kg',    50.0, 'cat-001', '10mm diameter steel rods'),
('prd-002', 'Steel Sheets',     'SKU-STL-002', 'sheet', 20.0, 'cat-001', '4x8 ft steel sheets'),
('prd-003', 'Office Chair',     'SKU-OFC-001', 'pcs',    5.0, 'cat-002', 'Ergonomic office chair'),
('prd-004', 'Laptop HP 250',    'SKU-ELC-001', 'pcs',    3.0, 'cat-004', 'HP 250 G9 Laptop'),
('prd-005', 'Cardboard Box L',  'SKU-PKG-001', 'pcs',  100.0, 'cat-005', 'Large cardboard boxes');

-- Initial Stock (Main Store)
INSERT IGNORE INTO stock (id, product_id, location_id, quantity) VALUES
(UUID(), 'prd-001', 'loc-wh-main-001', 200),
(UUID(), 'prd-002', 'loc-wh-main-001', 50),
(UUID(), 'prd-003', 'loc-wh-main-001', 12),
(UUID(), 'prd-004', 'loc-wh-main-001', 8),
(UUID(), 'prd-005', 'loc-wh-main-001', 500);

SELECT 'Seed data loaded successfully!' AS message;
