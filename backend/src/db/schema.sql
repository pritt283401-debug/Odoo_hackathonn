-- ============================================================
-- CoreInventory IMS - MySQL Schema
-- Run: mysql -u root -p core_inventory < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS core_inventory
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE core_inventory;

-- ─────────────────────────────────────────────────
-- Users & Auth
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  mobile      VARCHAR(20)  DEFAULT NULL,
  role        ENUM('MANAGER','STAFF') NOT NULL DEFAULT 'STAFF',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS otp_tokens (
  id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  email       VARCHAR(255) NOT NULL,
  otp         VARCHAR(6)   NOT NULL,
  expires_at  DATETIME     NOT NULL,
  used        TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_otp_email (email)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────
-- Warehouses & Locations
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouses (
  id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  user_id     VARCHAR(36)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50)  NOT NULL,
  address     TEXT,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_warehouses_code_user (user_id, code),
  INDEX idx_warehouses_user (user_id),
  CONSTRAINT fk_warehouses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS locations (
  id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  name          VARCHAR(255) NOT NULL,
  type          ENUM('STOCK','VENDOR','CUSTOMER','VIEW') NOT NULL DEFAULT 'STOCK',
  warehouse_id  VARCHAR(36),
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_locations_warehouse (warehouse_id),
  CONSTRAINT fk_locations_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────
-- Products
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  user_id     VARCHAR(36)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_name (name),
  INDEX idx_categories_user (user_id),
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  user_id      VARCHAR(36)  NOT NULL,
  name         VARCHAR(255) NOT NULL,
  sku          VARCHAR(100) NOT NULL,
  uom          VARCHAR(50)  NOT NULL DEFAULT 'Units',
  min_stock    DECIMAL(12,4) NOT NULL DEFAULT 0,
  category_id  VARCHAR(36)  NOT NULL,
  description  TEXT,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_products_sku_user (user_id, sku),
  INDEX idx_products_user (user_id),
  INDEX idx_products_category (category_id),
  CONSTRAINT fk_products_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────
-- Stock (current qty per product × location)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock (
  id           VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  product_id   VARCHAR(36)   NOT NULL,
  location_id  VARCHAR(36)   NOT NULL,
  quantity     DECIMAL(12,4) NOT NULL DEFAULT 0,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stock_product_location (product_id, location_id),
  INDEX idx_stock_product (product_id),
  INDEX idx_stock_location (location_id),
  CONSTRAINT fk_stock_product  FOREIGN KEY (product_id)  REFERENCES products(id),
  CONSTRAINT fk_stock_location FOREIGN KEY (location_id) REFERENCES locations(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────
-- Operations (Receipt / Delivery / Transfer / Adjustment)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operations (
  id               VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  user_id          VARCHAR(36)   NOT NULL,
  reference        VARCHAR(100)  NOT NULL,
  type             ENUM('RECEIPT','DELIVERY','TRANSFER','ADJUSTMENT') NOT NULL,
  status           ENUM('DRAFT','WAITING','READY','DONE','CANCELED') NOT NULL DEFAULT 'DRAFT',
  from_location_id VARCHAR(36),
  to_location_id   VARCHAR(36),
  responsible_id   VARCHAR(36)   NOT NULL,
  notes            TEXT,
  scheduled_date   DATETIME,
  effective_date   DATETIME,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_operations_reference_user (user_id, reference),
  INDEX idx_operations_user   (user_id),
  INDEX idx_operations_type   (type),
  INDEX idx_operations_status (status),
  INDEX idx_operations_from   (from_location_id),
  INDEX idx_operations_to     (to_location_id),
  INDEX idx_operations_resp   (responsible_id),
  CONSTRAINT fk_ops_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ops_from FOREIGN KEY (from_location_id) REFERENCES locations(id),
  CONSTRAINT fk_ops_to   FOREIGN KEY (to_location_id)   REFERENCES locations(id),
  CONSTRAINT fk_ops_user FOREIGN KEY (responsible_id)   REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS operation_items (
  id              VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  operation_id    VARCHAR(36)   NOT NULL,
  product_id      VARCHAR(36)   NOT NULL,
  quantity_demand DECIMAL(12,4) NOT NULL DEFAULT 0,
  quantity_done   DECIMAL(12,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  INDEX idx_op_items_op      (operation_id),
  INDEX idx_op_items_product (product_id),
  CONSTRAINT fk_op_items_op      FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE,
  CONSTRAINT fk_op_items_product FOREIGN KEY (product_id)   REFERENCES products(id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────
-- Stock Ledger (immutable audit trail)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_ledger (
  id               VARCHAR(36)   NOT NULL DEFAULT (UUID()),
  product_id       VARCHAR(36)   NOT NULL,
  location_id      VARCHAR(36)   NOT NULL,
  quantity_change  DECIMAL(12,4) NOT NULL,
  quantity_after   DECIMAL(12,4) NOT NULL,
  type             ENUM('RECEIPT','DELIVERY','TRANSFER','ADJUSTMENT') NOT NULL,
  reference        VARCHAR(100)  NOT NULL,
  operation_id     VARCHAR(36),
  performed_by     VARCHAR(36)   NOT NULL,
  notes            TEXT,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_ledger_product   (product_id),
  INDEX idx_ledger_location  (location_id),
  INDEX idx_ledger_operation (operation_id),
  INDEX idx_ledger_type      (type),
  INDEX idx_ledger_date      (created_at),
  CONSTRAINT fk_ledger_product   FOREIGN KEY (product_id)   REFERENCES products(id),
  CONSTRAINT fk_ledger_location  FOREIGN KEY (location_id)  REFERENCES locations(id),
  CONSTRAINT fk_ledger_op        FOREIGN KEY (operation_id) REFERENCES operations(id),
  CONSTRAINT fk_ledger_user      FOREIGN KEY (performed_by) REFERENCES users(id)
) ENGINE=InnoDB;
