-- Consolidated missing tables for Order Analytics and specialized order types
USE smart_qr_restaurant;

-- 1. Order Analytics Table (Crucial for Business Reports)
CREATE TABLE IF NOT EXISTS order_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    order_source ENUM('DINE-IN', 'TAKEAWAY', 'DELIVERY') NOT NULL,
    order_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'CASH',
    item_id INT,
    item_name VARCHAR(255) NOT NULL,
    category_name VARCHAR(100) DEFAULT 'General',
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Delivery Orders Table
CREATE TABLE IF NOT EXISTS delivery_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT NOT NULL,
    items JSON NOT NULL, -- Store items snapshot as JSON
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    order_status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Takeaway Orders Table
CREATE TABLE IF NOT EXISTS takeaway_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    items JSON NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    pickup_time TIME,
    order_status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Cancellations Logs (for reports)
CREATE TABLE IF NOT EXISTS cancel_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cancel_takeaways (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Business Reports History Table
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    summary_data JSON, -- Stores summary stats
    data_json LONGTEXT, -- Stores full report data as JSON
    generated_by INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES staff_users(id) ON DELETE SET NULL
);

-- 6. Report Generation Logs
CREATE TABLE IF NOT EXISTS report_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_type VARCHAR(100),
    filters_used JSON,
    generated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Audit Logs improvements (ensure columns match)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_user_id INT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS performed_by INT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
