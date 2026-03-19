-- Supplier Module Enhance Schema

-- 1. Ensure supplier_staff is linked to a supplier brand
ALTER TABLE supplier_staff ADD COLUMN IF NOT EXISTS supplier_id INT;
ALTER TABLE supplier_staff ADD FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;

-- 2. Link samples in inventory to suppliers
UPDATE inventory SET supplier_id = 1 WHERE item_name IN ('Potatoes (Local)', 'Red Onions', 'Garlic (Peeled)', 'Ginger Whole'); -- Fresh Mart
UPDATE inventory SET supplier_id = 3 WHERE item_name IN ('Milk', 'Butter', 'Fresh Eggs (Large)'); -- Dairy Best
UPDATE inventory SET supplier_id = 2 WHERE item_name IN ('Tiger Prawns Jumbo', 'Sea Bass Fillet'); -- Ocean Catch
UPDATE inventory SET supplier_id = 5 WHERE item_name IN ('Coca Cola 500ml', 'Sprite 500ml', 'Mineral Water 1L'); -- Beverages (Ocean Catch for test)

-- 3. Supplier Requests table (When supplier wants to offer restocking)
CREATE TABLE IF NOT EXISTS supplier_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    inventory_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    message TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
);

-- 4. Admin Orders to Supplier (Urgent or Normal)
-- The existing supplier_orders table uses id, supplier_id, order_date, total_amount, status, notes.
-- Let's add priority and items if needed, but for now we'll stick to basic.
ALTER TABLE supplier_orders ADD COLUMN IF NOT EXISTS priority ENUM('Normal', 'Urgent') DEFAULT 'Normal';

-- 5. Supplier History Table (Tracking deliveries)
CREATE TABLE IF NOT EXISTS supplier_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    inventory_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    order_id INT, -- Link to supplier_orders if applicable
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE
);
