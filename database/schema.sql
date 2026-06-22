-- =====================================================
-- Fragrancy Inventory Manager - MySQL Schema
-- Migrado de PostgreSQL/Supabase para MySQL
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------
-- 1. TENANTS (deve ser criada primeiro - referenciada por todas)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 2. AUTHORIZED_USERS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `authorized_users` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `username` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `is_admin` TINYINT(1) NOT NULL DEFAULT 0,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 3. CATEGORIES
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_categories_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 4. PRODUCTS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `cost_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `sale_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantity` INT NOT NULL DEFAULT 0,
  `category_id` CHAR(36) DEFAULT NULL,
  `image_url` TEXT DEFAULT NULL,
  `is_order_product` TINYINT(1) NOT NULL DEFAULT 0,
  `customer_name` VARCHAR(255) DEFAULT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_products_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 5. CUSTOMERS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `birthday` DATE DEFAULT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_customers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 6. KITS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `kits` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `sale_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `image_url` TEXT DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_kits_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 7. KIT_ITEMS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `kit_items` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `kit_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kit_id` (`kit_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `fk_kit_items_kit` FOREIGN KEY (`kit_id`) REFERENCES `kits` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kit_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 8. SELLERS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sellers` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `commission_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_sellers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 9. SALES
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_id` CHAR(36) DEFAULT NULL,
  `product_id` CHAR(36) DEFAULT NULL,
  `kit_id` CHAR(36) DEFAULT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  `sale_date` DATE DEFAULT NULL,
  `seller` VARCHAR(255) DEFAULT NULL,
  `payment_received` TINYINT(1) NOT NULL DEFAULT 0,
  `partial_payment_amount` DECIMAL(10,2) DEFAULT NULL,
  `payment_type` VARCHAR(50) DEFAULT NULL,
  `sale_group_id` CHAR(36) DEFAULT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_kit_id` (`kit_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_sale_group_id` (`sale_group_id`),
  CONSTRAINT `fk_sales_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_kit` FOREIGN KEY (`kit_id`) REFERENCES `kits` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sales_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 10. SALE_PAYMENTS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `sale_payments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `sale_group_id` CHAR(36) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_date` DATE NOT NULL DEFAULT (CURDATE()),
  `payment_type` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sale_group_id` (`sale_group_id`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 11. ORDERS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_name` VARCHAR(255) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pendente',
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_orders_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 12. ORDER_ITEMS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `order_id` CHAR(36) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `cost_price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 13. PRODUCT_ORDER_REQUESTS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_order_requests` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `product_id` CHAR(36) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `requested_quantity` INT NOT NULL,
  `cost_price` DECIMAL(10,2) DEFAULT NULL,
  `sale_price` DECIMAL(10,2) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pendente',
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_por_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_por_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 14. SUPPLIERS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `whatsapp` VARCHAR(50) DEFAULT NULL,
  `cnpj` VARCHAR(20) DEFAULT NULL,
  `delivery_days` INT DEFAULT NULL,
  `min_order_amount` DECIMAL(10,2) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `default_message` TEXT DEFAULT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_suppliers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 15. SUPPLIER_ORDERS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `supplier_orders` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `supplier_id` CHAR(36) NOT NULL,
  `order_date` DATE NOT NULL DEFAULT (CURDATE()),
  `received_date` DATE DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pendente',
  `notes` TEXT DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_id` (`supplier_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_so_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_so_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 16. SUPPLIER_ORDER_ITEMS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `supplier_order_items` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `order_id` CHAR(36) NOT NULL,
  `product_id` CHAR(36) DEFAULT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `unit_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_id` (`order_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `fk_soi_order` FOREIGN KEY (`order_id`) REFERENCES `supplier_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_soi_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 17. STOCK_ENTRIES
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_entries` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `product_id` CHAR(36) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_cost` DECIMAL(10,2) NOT NULL,
  `entry_date` DATE NOT NULL DEFAULT (CURDATE()),
  `notes` TEXT DEFAULT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_stock_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stock_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 18. EXPENSES
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `description` VARCHAR(500) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `expense_date` DATE NOT NULL DEFAULT (CURDATE()),
  `observacao` TEXT DEFAULT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_expenses_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 19. REINVESTMENTS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `reinvestments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `amount` DECIMAL(10,2) NOT NULL,
  `date` DATE NOT NULL,
  `description` TEXT DEFAULT NULL,
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  CONSTRAINT `fk_reinvestments_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 20. CASH_CLOSINGS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `cash_closings` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `period_start` DATETIME NOT NULL,
  `period_end` DATETIME NOT NULL,
  `opening_balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `closing_balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `closed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT DEFAULT NULL,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- 21. AUDIT_LOG
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `table_name` VARCHAR(100) NOT NULL,
  `operation` VARCHAR(10) NOT NULL,
  `record_id` CHAR(36) NOT NULL,
  `old_values` JSON DEFAULT NULL,
  `new_values` JSON DEFAULT NULL,
  `user_name` VARCHAR(255) NOT NULL DEFAULT 'sistema',
  `tenant_id` CHAR(36) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_table_name` (`table_name`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_audit_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VIEW: v_sales_balance
-- Equivalente MySQL da view PostgreSQL
-- =====================================================
CREATE OR REPLACE VIEW `v_sales_balance` AS
SELECT
  grouped.sale_group_id,
  grouped.tenant_id,
  grouped.customer_id,
  grouped.seller,
  grouped.sale_date,
  grouped.total,
  COALESCE(p.paid, 0) AS paid,
  GREATEST(grouped.total - COALESCE(p.paid, 0), 0) AS remaining,
  CASE
    WHEN COALESCE(p.paid, 0) >= grouped.total THEN 'pago'
    WHEN COALESCE(p.paid, 0) > 0 THEN 'parcial'
    ELSE 'pendente'
  END AS status
FROM (
  SELECT
    COALESCE(s.sale_group_id, s.id) AS sale_group_id,
    MAX(s.tenant_id) AS tenant_id,
    MAX(s.customer_id) AS customer_id,
    MAX(s.seller) AS seller,
    MAX(s.sale_date) AS sale_date,
    SUM(s.total_price) AS total
  FROM `sales` s
  GROUP BY COALESCE(s.sale_group_id, s.id)
) AS grouped
LEFT JOIN (
  SELECT sale_group_id, SUM(amount) AS paid
  FROM `sale_payments`
  GROUP BY sale_group_id
) AS p ON p.sale_group_id = grouped.sale_group_id;

-- =====================================================
-- NOTA SOBRE AUDITORIA:
-- MySQL triggers nao conseguem receber parametros de sessao
-- facilmente como PostgreSQL (current_setting).
-- A auditoria sera implementada na camada PHP da API,
-- inserindo registros no audit_log via codigo.
-- =====================================================

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- DADOS INICIAIS (opcional - usuario admin padrao)
-- A senha deve ser gerada com password_hash() do PHP
-- Exemplo: password_hash('admin123', PASSWORD_BCRYPT)
-- =====================================================
-- INSERT INTO `tenants` (`id`, `name`) VALUES (UUID(), 'Principal');
-- INSERT INTO `authorized_users` (`id`, `username`, `password_hash`, `is_admin`, `tenant_id`)
-- VALUES (UUID(), 'admin', '$2y$10$...hash...', 1, (SELECT id FROM tenants LIMIT 1));
