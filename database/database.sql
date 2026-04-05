-- ================================================================
-- SMART QR RESTAURANT MANAGEMENT SYSTEM
-- 3NF NORMALIZED DATABASE SCHEMA WITH ROLE-SPECIFIC TABLES
-- ================================================================
-- Design: All staff register into `staff_users` first.
-- Then based on their role, a corresponding row is inserted into
-- the role-specific table (managers, cashiers, stewards, kitchen_staff,
-- bar_staff, delivery_riders).
-- ================================================================

CREATE DATABASE IF NOT EXISTS smart_qr_restaurant;
USE smart_qr_restaurant;

-- Disable FK checks for clean setup
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS staff_otp_verifications;
DROP TABLE IF EXISTS customer_otp_verifications;
DROP TABLE IF EXISTS staff_notifications;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS table_assignments;
DROP TABLE IF EXISTS menu_item_suppliers;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS delivery_riders;
DROP TABLE IF EXISTS bar_staff;
DROP TABLE IF EXISTS kitchen_staff;
DROP TABLE IF EXISTS stewards;
DROP TABLE IF EXISTS cashiers;
DROP TABLE IF EXISTS managers;
DROP TABLE IF EXISTS staff_permissions;
DROP TABLE IF EXISTS customer_permissions;
DROP TABLE IF EXISTS customer_sessions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS staff_users;
DROP TABLE IF EXISTS staff_roles;
DROP TABLE IF EXISTS order_types;
DROP TABLE IF EXISTS order_statuses;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS payment_statuses;
DROP TABLE IF EXISTS restaurant_tables;

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
-- SECTION 1: LOOKUP / REFERENCE TABLES
-- ================================================================

-- 1.1 Staff Roles (Lookup - referenced by staff_users)
CREATE TABLE staff_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 Order Types
CREATE TABLE order_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 Order Statuses
CREATE TABLE order_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 Payment Methods
CREATE TABLE payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 Payment Statuses
CREATE TABLE payment_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 Categories (Menu)
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.7 Restaurant Tables
CREATE TABLE restaurant_tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_number INT NOT NULL UNIQUE,
    capacity INT DEFAULT 4,
    location VARCHAR(50) DEFAULT 'Indoor',
    status ENUM('available', 'occupied', 'reserved') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 2: CORE USER TABLES
-- ================================================================

-- 2.1 Staff Users (Master Staff Table - all staff register here first)
CREATE TABLE staff_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_active TINYINT(1) DEFAULT 0,         -- 0=inactive, 1=active (admin activates)
    permissions TEXT DEFAULT NULL,           -- JSON array of permission strings
    reset_otp VARCHAR(10) DEFAULT NULL,
    reset_otp_expiry TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES staff_roles(id) ON DELETE RESTRICT
);

-- 2.2 Customers
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    profile_image VARCHAR(255) DEFAULT NULL,
    loyalty_points INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    reset_otp VARCHAR(10) DEFAULT NULL,
    reset_otp_expiry TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 3: ROLE-SPECIFIC TABLES (3NF Decomposition)
-- Each role stores role-specific attributes.
-- Staff data goes to staff_users first, then here.
-- ================================================================

-- 3.1 Managers
CREATE TABLE managers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL UNIQUE,
    department VARCHAR(100) DEFAULT 'General',
    hire_date DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

-- 3.2 Cashiers
CREATE TABLE cashiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL UNIQUE,
    register_number VARCHAR(50) DEFAULT NULL,
    shift_type ENUM('morning', 'afternoon', 'night') DEFAULT 'morning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

-- 3.3 Stewards (Waiters/Servers)
CREATE TABLE stewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL UNIQUE,
    is_available TINYINT(1) DEFAULT 1,
    image VARCHAR(255) DEFAULT NULL,
    assigned_section VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

-- 3.4 Kitchen Staff
CREATE TABLE kitchen_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL UNIQUE,
    station VARCHAR(100) DEFAULT 'Main Kitchen',
    specialization VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

-- 3.5 Bar Staff
CREATE TABLE bar_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL UNIQUE,
    bar_section VARCHAR(100) DEFAULT 'Main Bar',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

-- 3.6 Delivery Riders
CREATE TABLE delivery_riders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL UNIQUE,
    vehicle_type VARCHAR(50) DEFAULT 'motorcycle',
    license_number VARCHAR(50) DEFAULT NULL,
    is_available TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

-- 3.7 Inventory Managers
CREATE TABLE inventory_managers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL UNIQUE,
    warehouse_section VARCHAR(100) DEFAULT 'Main',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

-- 3.8 Supplier Staff
CREATE TABLE supplier_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL UNIQUE,
    company_name VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

-- ================================================================
-- SECTION 4: PERMISSIONS TABLES
-- ================================================================

-- 4.1 Staff Permissions
CREATE TABLE staff_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    permission_key VARCHAR(50) NOT NULL,
    allowed BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_perm (staff_id, permission_key)
);

-- 4.2 Customer Permissions
CREATE TABLE customer_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    permission_key VARCHAR(50) NOT NULL,
    allowed BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cust_perm (customer_id, permission_key)
);

-- ================================================================
-- SECTION 5: SESSION & AUTH TABLES
-- ================================================================

CREATE TABLE customer_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE staff_otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

CREATE TABLE customer_otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- ================================================================
-- SECTION 6: MENU & INVENTORY
-- ================================================================

CREATE TABLE menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    min_level INT DEFAULT 5,
    unit VARCHAR(20) DEFAULT 'units',
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE TABLE menu_item_suppliers (
    menu_item_id INT,
    supplier_id INT,
    PRIMARY KEY (menu_item_id, supplier_id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- ================================================================
-- SECTION 7: ORDERS & TRANSACTIONS
-- ================================================================

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    steward_id INT DEFAULT NULL,
    order_type_id INT NOT NULL,
    status_id INT NOT NULL,
    payment_method_id INT DEFAULT NULL,
    payment_status_id INT DEFAULT NULL,
    table_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (steward_id) REFERENCES stewards(id) ON DELETE SET NULL,
    FOREIGN KEY (order_type_id) REFERENCES order_types(id),
    FOREIGN KEY (status_id) REFERENCES order_statuses(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (payment_status_id) REFERENCES payment_statuses(id),
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- ================================================================
-- SECTION 8: RESERVATIONS & TABLE ASSIGNMENTS
-- ================================================================

CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    table_id INT NOT NULL,
    reservation_time DATETIME NOT NULL,
    guest_count INT NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') DEFAULT 'PENDING',
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id)
);

CREATE TABLE table_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    steward_id INT NOT NULL,
    table_id INT NOT NULL,
    status ENUM('active', 'completed') DEFAULT 'active',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (steward_id) REFERENCES stewards(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE
);

-- ================================================================
-- SECTION 9: FEEDBACK & RATINGS
-- ================================================================

CREATE TABLE ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    steward_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (steward_id) REFERENCES stewards(id) ON DELETE CASCADE
);

CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ================================================================
-- SECTION 10: NOTIFICATIONS
-- ================================================================

CREATE TABLE staff_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT DEFAULT NULL,
    role_id INT DEFAULT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff_users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES staff_roles(id) ON DELETE CASCADE
);

-- ================================================================
-- SECTION 11: AUDIT LOGS
-- ================================================================

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    target_user_id INT,
    performed_by INT,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 12: SEED DATA
-- ================================================================

-- Staff Roles
INSERT INTO staff_roles (role_name, description) VALUES
('admin', 'Super Administrator - System wide access'),
('manager', 'Restaurant Manager - Full access'),
('cashier', 'Cashier - Handles payments'),
('steward', 'Steward/Waiter - Serves customers'),
('kitchen_staff', 'Kitchen Staff - Prepares food'),
('bar_staff', 'Bar Staff - Handles beverages'),
('delivery_rider', 'Delivery Rider - Delivers orders'),
('inventory_manager', 'Inventory Manager - Manages supplies'),
('supplier', 'Supplier - External supply contact');

-- Order Types
INSERT INTO order_types (name) VALUES
('DINE_IN'), ('TAKEAWAY'), ('DELIVERY');

-- Order Statuses
INSERT INTO order_statuses (name) VALUES
('PENDING'), ('CONFIRMED'), ('PREPARING'), ('READY'), ('SERVED'), ('COMPLETED'), ('CANCELLED');

-- Payment Methods
INSERT INTO payment_methods (name) VALUES
('CASH'), ('CARD'), ('ONLINE');

-- Payment Statuses
INSERT INTO payment_statuses (name) VALUES
('PENDING'), ('PAID'), ('FAILED'), ('REFUNDED'), ('PAY_AT_COUNTER');

-- Categories
INSERT INTO categories (name, description, image) VALUES
('SRI_LANKAN', 'Authentic Sri Lankan Cuisine', 'rice_curry.png'),
('ITALIAN', 'Classic Italian Dishes', 'pizza.png'),
('INDIAN', 'Spicy Indian Favorites', 'biriyani.png'),
('APPETIZERS', 'Starters and Snacks', 'cutlets.png'),
('DESSERTS', 'Sweet Treats', 'watalappam.png'),
('BEVERAGES', 'Refreshing Drinks', 'mojito.png');

-- Restaurant Tables
INSERT INTO restaurant_tables (table_number, capacity, location) VALUES
(1, 4, 'Indoor'), (2, 4, 'Indoor'), (3, 2, 'Indoor'),
(4, 6, 'Indoor'), (5, 4, 'Outdoor'), (6, 4, 'Outdoor'),
(7, 2, 'Outdoor'), (8, 8, 'Indoor'), (9, 4, 'Indoor'), (10, 4, 'Indoor');

-- Sample Menu Items
INSERT INTO menu_items (category_id, name, description, price, image, is_active) VALUES
(1, 'Rice & Curry', 'Traditional Sri Lankan rice and curry with 5 dishes', 450.00, 'rice_curry.jpg', TRUE),
(1, 'Kottu Roti', 'Chopped roti with vegetables and chicken', 550.00, 'kottu.jpg', TRUE),
(1, 'String Hoppers', 'Steamed rice noodle nests with curry', 350.00, 'string_hoppers.jpg', TRUE),
(2, 'Margherita Pizza', 'Classic pizza with tomato sauce and mozzarella', 1200.00, 'margherita.jpg', TRUE),
(2, 'Pasta Carbonara', 'Creamy pasta with bacon and parmesan', 950.00, 'carbonara.jpg', TRUE),
(3, 'Chicken Biriyani', 'Fragrant rice with spiced chicken', 750.00, 'biriyani.jpg', TRUE),
(3, 'Butter Chicken', 'Tender chicken in rich butter sauce', 850.00, 'butter_chicken.jpg', TRUE),
(4, 'Fish Cutlets', 'Crispy Sri Lankan fish cutlets', 180.00, 'cutlets.jpg', TRUE),
(4, 'Vegetable Spring Rolls', 'Crispy spring rolls with vegetables', 250.00, 'spring_rolls.jpg', TRUE),
(5, 'Watalappam', 'Traditional Malay-Sri Lankan coconut custard', 300.00, 'watalappam.jpg', TRUE),
(5, 'Chocolate Lava Cake', 'Warm chocolate cake with molten center', 450.00, 'lava_cake.jpg', TRUE),
(6, 'Fresh Lime Juice', 'Freshly squeezed lime juice', 150.00, 'lime_juice.jpg', TRUE),
(6, 'Mango Lassi', 'Creamy mango yogurt drink', 250.00, 'mango_lassi.jpg', TRUE);

-- Verify
SELECT 'Database setup complete!' AS status;
SHOW TABLES;

USE smart_qr_restaurant;

SELECT * FROM staff_users;
SELECT * FROM customers;
SELECT * FROM reservations;
SELECT * FROM online_customers;
SELECT * FROM inventory;
SELECT * FROM cancel_reservations;
SELECT * FROM staff_roles;

delete from orders where id=10;