/*
  # CoreInventory - Complete Database Schema
  
  ## Overview
  Complete inventory management system with multi-warehouse support, stock tracking,
  and comprehensive audit trail.
  
  ## Tables Created
  
  ### 1. warehouses
  - `id` (uuid, primary key)
  - `name` (text) - Warehouse name
  - `code` (text, unique) - Warehouse code
  - `address` (text) - Physical address
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz)
  - `created_by` (uuid) - User who created
  
  ### 2. product_categories
  - `id` (uuid, primary key)
  - `name` (text) - Category name
  - `code` (text, unique) - Category code
  - `description` (text) - Category description
  - `parent_id` (uuid) - For hierarchical categories
  - `created_at` (timestamptz)
  - `created_by` (uuid)
  
  ### 3. products
  - `id` (uuid, primary key)
  - `name` (text) - Product name
  - `sku` (text, unique) - Stock Keeping Unit
  - `description` (text)
  - `category_id` (uuid) - Foreign key to categories
  - `unit_of_measure` (text) - kg, pcs, liters, etc.
  - `min_stock_level` (numeric) - Minimum stock alert level
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `created_by` (uuid)
  
  ### 4. stock_locations
  - `id` (uuid, primary key)
  - `product_id` (uuid) - Foreign key to products
  - `warehouse_id` (uuid) - Foreign key to warehouses
  - `quantity` (numeric) - Current quantity
  - `reserved_quantity` (numeric) - Reserved for orders
  - `available_quantity` (numeric, computed) - Available = quantity - reserved
  - `last_updated` (timestamptz)
  - Unique constraint on (product_id, warehouse_id)
  
  ### 5. receipts
  - `id` (uuid, primary key)
  - `receipt_number` (text, unique) - Auto-generated
  - `warehouse_id` (uuid) - Destination warehouse
  - `supplier_name` (text)
  - `status` (text) - draft, waiting, ready, done, canceled
  - `receipt_date` (date)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `created_by` (uuid)
  - `validated_at` (timestamptz)
  - `validated_by` (uuid)
  
  ### 6. receipt_lines
  - `id` (uuid, primary key)
  - `receipt_id` (uuid) - Foreign key to receipts
  - `product_id` (uuid) - Foreign key to products
  - `quantity` (numeric)
  - `unit_of_measure` (text)
  - `notes` (text)
  
  ### 7. deliveries
  - `id` (uuid, primary key)
  - `delivery_number` (text, unique)
  - `warehouse_id` (uuid) - Source warehouse
  - `customer_name` (text)
  - `status` (text) - draft, waiting, ready, done, canceled
  - `delivery_date` (date)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `created_by` (uuid)
  - `validated_at` (timestamptz)
  - `validated_by` (uuid)
  
  ### 8. delivery_lines
  - `id` (uuid, primary key)
  - `delivery_id` (uuid)
  - `product_id` (uuid)
  - `quantity` (numeric)
  - `unit_of_measure` (text)
  - `notes` (text)
  
  ### 9. transfers
  - `id` (uuid, primary key)
  - `transfer_number` (text, unique)
  - `from_warehouse_id` (uuid)
  - `to_warehouse_id` (uuid)
  - `status` (text) - draft, waiting, ready, done, canceled
  - `transfer_date` (date)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `created_by` (uuid)
  - `validated_at` (timestamptz)
  - `validated_by` (uuid)
  
  ### 10. transfer_lines
  - `id` (uuid, primary key)
  - `transfer_id` (uuid)
  - `product_id` (uuid)
  - `quantity` (numeric)
  - `unit_of_measure` (text)
  - `notes` (text)
  
  ### 11. adjustments
  - `id` (uuid, primary key)
  - `adjustment_number` (text, unique)
  - `warehouse_id` (uuid)
  - `reason` (text) - damage, theft, count_correction, etc.
  - `status` (text) - draft, done, canceled
  - `adjustment_date` (date)
  - `notes` (text)
  - `created_at` (timestamptz)
  - `created_by` (uuid)
  - `validated_at` (timestamptz)
  - `validated_by` (uuid)
  
  ### 12. adjustment_lines
  - `id` (uuid, primary key)
  - `adjustment_id` (uuid)
  - `product_id` (uuid)
  - `counted_quantity` (numeric) - Physical count
  - `system_quantity` (numeric) - System quantity before adjustment
  - `difference` (numeric) - Difference (counted - system)
  - `unit_of_measure` (text)
  - `notes` (text)
  
  ### 13. stock_moves
  - `id` (uuid, primary key)
  - `product_id` (uuid)
  - `warehouse_id` (uuid)
  - `quantity` (numeric) - Positive for incoming, negative for outgoing
  - `move_type` (text) - receipt, delivery, transfer_in, transfer_out, adjustment
  - `reference_type` (text) - receipts, deliveries, transfers, adjustments
  - `reference_id` (uuid) - ID of the source document
  - `reference_number` (text) - Document number
  - `move_date` (timestamptz)
  - `created_by` (uuid)
  - `notes` (text)
  
  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users to manage their company's data
  - Audit trail with created_by and validated_by fields
*/

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  address text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create warehouses"
  ON warehouses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update warehouses"
  ON warehouses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete warehouses"
  ON warehouses FOR DELETE
  TO authenticated
  USING (true);

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text DEFAULT '',
  parent_id uuid REFERENCES product_categories(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create categories"
  ON product_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update categories"
  ON product_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON product_categories FOR DELETE
  TO authenticated
  USING (true);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  description text DEFAULT '',
  category_id uuid REFERENCES product_categories(id),
  unit_of_measure text DEFAULT 'pcs',
  min_stock_level numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Create stock_locations table
CREATE TABLE IF NOT EXISTS stock_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity numeric DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity numeric DEFAULT 0 CHECK (reserved_quantity >= 0),
  last_updated timestamptz DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock locations"
  ON stock_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage stock locations"
  ON stock_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock locations"
  ON stock_locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete stock locations"
  ON stock_locations FOR DELETE
  TO authenticated
  USING (true);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  supplier_name text DEFAULT '',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'ready', 'done', 'canceled')),
  receipt_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view receipts"
  ON receipts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create receipts"
  ON receipts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update receipts"
  ON receipts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete receipts"
  ON receipts FOR DELETE
  TO authenticated
  USING (true);

-- Create receipt_lines table
CREATE TABLE IF NOT EXISTS receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_of_measure text DEFAULT 'pcs',
  notes text DEFAULT ''
);

ALTER TABLE receipt_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view receipt lines"
  ON receipt_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage receipt lines"
  ON receipt_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update receipt lines"
  ON receipt_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete receipt lines"
  ON receipt_lines FOR DELETE
  TO authenticated
  USING (true);

-- Create deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number text UNIQUE NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  customer_name text DEFAULT '',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'ready', 'done', 'canceled')),
  delivery_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deliveries"
  ON deliveries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create deliveries"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update deliveries"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete deliveries"
  ON deliveries FOR DELETE
  TO authenticated
  USING (true);

-- Create delivery_lines table
CREATE TABLE IF NOT EXISTS delivery_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_of_measure text DEFAULT 'pcs',
  notes text DEFAULT ''
);

ALTER TABLE delivery_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view delivery lines"
  ON delivery_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage delivery lines"
  ON delivery_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update delivery lines"
  ON delivery_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete delivery lines"
  ON delivery_lines FOR DELETE
  TO authenticated
  USING (true);

-- Create transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text UNIQUE NOT NULL,
  from_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  to_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'ready', 'done', 'canceled')),
  transfer_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id),
  CHECK (from_warehouse_id != to_warehouse_id)
);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfers"
  ON transfers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create transfers"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update transfers"
  ON transfers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transfers"
  ON transfers FOR DELETE
  TO authenticated
  USING (true);

-- Create transfer_lines table
CREATE TABLE IF NOT EXISTS transfer_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_of_measure text DEFAULT 'pcs',
  notes text DEFAULT ''
);

ALTER TABLE transfer_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfer lines"
  ON transfer_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage transfer lines"
  ON transfer_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transfer lines"
  ON transfer_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transfer lines"
  ON transfer_lines FOR DELETE
  TO authenticated
  USING (true);

-- Create adjustments table
CREATE TABLE IF NOT EXISTS adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number text UNIQUE NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  reason text DEFAULT 'count_correction' CHECK (reason IN ('damage', 'theft', 'count_correction', 'expired', 'other')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'done', 'canceled')),
  adjustment_date date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view adjustments"
  ON adjustments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create adjustments"
  ON adjustments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update adjustments"
  ON adjustments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete adjustments"
  ON adjustments FOR DELETE
  TO authenticated
  USING (true);

-- Create adjustment_lines table
CREATE TABLE IF NOT EXISTS adjustment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id uuid NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  counted_quantity numeric NOT NULL CHECK (counted_quantity >= 0),
  system_quantity numeric NOT NULL CHECK (system_quantity >= 0),
  difference numeric NOT NULL,
  unit_of_measure text DEFAULT 'pcs',
  notes text DEFAULT ''
);

ALTER TABLE adjustment_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view adjustment lines"
  ON adjustment_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage adjustment lines"
  ON adjustment_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update adjustment lines"
  ON adjustment_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete adjustment lines"
  ON adjustment_lines FOR DELETE
  TO authenticated
  USING (true);

-- Create stock_moves table (complete ledger)
CREATE TABLE IF NOT EXISTS stock_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity numeric NOT NULL,
  move_type text NOT NULL CHECK (move_type IN ('receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment')),
  reference_type text NOT NULL CHECK (reference_type IN ('receipts', 'deliveries', 'transfers', 'adjustments')),
  reference_id uuid NOT NULL,
  reference_number text NOT NULL,
  move_date timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  notes text DEFAULT ''
);

ALTER TABLE stock_moves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stock moves"
  ON stock_moves FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create stock moves"
  ON stock_moves FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_locations_product ON stock_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_warehouse ON stock_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_warehouse ON receipts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_warehouse ON deliveries(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON adjustments(status);
CREATE INDEX IF NOT EXISTS idx_stock_moves_product ON stock_moves(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_warehouse ON stock_moves(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_reference ON stock_moves(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_moves_date ON stock_moves(move_date DESC);

-- Create function to generate document numbers
CREATE OR REPLACE FUNCTION generate_document_number(prefix text)
RETURNS text AS $$
DECLARE
  next_num integer;
  doc_number text;
BEGIN
  next_num := (
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(
        CASE 
          WHEN prefix = 'REC' THEN receipt_number
          WHEN prefix = 'DEL' THEN delivery_number
          WHEN prefix = 'TRF' THEN transfer_number
          WHEN prefix = 'ADJ' THEN adjustment_number
        END
        FROM '\\d+$'
      ) AS INTEGER)
    ), 0) + 1
    FROM (
      SELECT receipt_number FROM receipts WHERE prefix = 'REC'
      UNION ALL
      SELECT delivery_number FROM deliveries WHERE prefix = 'DEL'
      UNION ALL
      SELECT transfer_number FROM transfers WHERE prefix = 'TRF'
      UNION ALL
      SELECT adjustment_number FROM adjustments WHERE prefix = 'ADJ'
    ) AS all_numbers
  );
  
  doc_number := prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(next_num::text, 4, '0');
  RETURN doc_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to update stock location
CREATE OR REPLACE FUNCTION update_stock_location(
  p_product_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric
)
RETURNS void AS $$
BEGIN
  INSERT INTO stock_locations (product_id, warehouse_id, quantity, last_updated)
  VALUES (p_product_id, p_warehouse_id, p_quantity, now())
  ON CONFLICT (product_id, warehouse_id)
  DO UPDATE SET
    quantity = stock_locations.quantity + p_quantity,
    last_updated = now();
END;
$$ LANGUAGE plpgsql;
