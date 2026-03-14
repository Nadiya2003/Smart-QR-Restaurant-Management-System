-- Migration script for Visual Table Selection System

USE smart_qr_restaurant;

-- 1. Create Dining Areas Table
CREATE TABLE IF NOT EXISTS dining_areas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    area_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed Dining Areas
INSERT IGNORE INTO dining_areas (area_name, description) VALUES
('Italian Area', 'Elegant dining with authentic Italian atmosphere'),
('VIP Area (Upstairs)', 'Private and luxurious dining space'),
('Mexican Area', 'Vibrant and spicy themed dining'),
('Ground Area', 'Convenient and open main dining space'),
('AC Area', 'Comfortable climate-controlled dining');

-- 3. Update restaurant_tables to link with areas
ALTER TABLE restaurant_tables ADD COLUMN area_id INT AFTER id;
ALTER TABLE restaurant_tables ADD CONSTRAINT fk_table_area FOREIGN KEY (area_id) REFERENCES dining_areas(id) ON DELETE CASCADE;

-- Update existing tables to Ground Area (assumed default)
SET @ground_id = (SELECT id FROM dining_areas WHERE area_name = 'Ground Area' LIMIT 1);
UPDATE restaurant_tables SET area_id = @ground_id WHERE area_id IS NULL;

-- 4. Seed Tables for each area as per requirement
-- Italian Area: 6 tables
SET @italian_id = (SELECT id FROM dining_areas WHERE area_name = 'Italian Area' LIMIT 1);
INSERT INTO restaurant_tables (area_id, table_number, capacity, status) VALUES
(@italian_id, 101, 4, 'available'),
(@italian_id, 102, 4, 'available'),
(@italian_id, 103, 2, 'available'),
(@italian_id, 104, 2, 'available'),
(@italian_id, 105, 6, 'available'),
(@italian_id, 106, 4, 'available');

-- VIP Area: 2 large tables
SET @vip_id = (SELECT id FROM dining_areas WHERE area_name = 'VIP Area (Upstairs)' LIMIT 1);
INSERT INTO restaurant_tables (area_id, table_number, capacity, status) VALUES
(@vip_id, 901, 8, 'available'),
(@vip_id, 902, 8, 'available');

-- Mexican Area: 10 tables
SET @mexican_id = (SELECT id FROM dining_areas WHERE area_name = 'Mexican Area' LIMIT 1);
INSERT INTO restaurant_tables (area_id, table_number, capacity, status) VALUES
(@mexican_id, 201, 4, 'available'), (@mexican_id, 202, 4, 'available'), (@mexican_id, 203, 4, 'available'),
(@mexican_id, 204, 2, 'available'), (@mexican_id, 205, 2, 'available'), (@mexican_id, 206, 6, 'available'),
(@mexican_id, 207, 4, 'available'), (@mexican_id, 208, 4, 'available'), (@mexican_id, 209, 2, 'available'),
(@mexican_id, 210, 4, 'available');

-- Ground Area: (Updating existing or adding more to reach 8)
-- Existing tables 1-10 are already in Ground Area (id 1-10)
-- We'll just ensure they have the right area_id.

-- AC Area: 15 tables
SET @ac_id = (SELECT id FROM dining_areas WHERE area_name = 'AC Area' LIMIT 1);
INSERT INTO restaurant_tables (area_id, table_number, capacity, status) VALUES
(@ac_id, 301, 2, 'available'), (@ac_id, 302, 2, 'available'), (@ac_id, 303, 2, 'available'),
(@ac_id, 304, 4, 'available'), (@ac_id, 305, 4, 'available'), (@ac_id, 306, 4, 'available'),
(@ac_id, 307, 4, 'available'), (@ac_id, 308, 4, 'available'), (@ac_id, 309, 4, 'available'),
(@ac_id, 310, 6, 'available'), (@ac_id, 311, 6, 'available'), (@ac_id, 312, 2, 'available'),
(@ac_id, 313, 2, 'available'), (@ac_id, 314, 4, 'available'), (@ac_id, 315, 4, 'available');

-- 5. Update Reservations Table
ALTER TABLE reservations ADD COLUMN area_id INT AFTER customer_id;
ALTER TABLE reservations ADD COLUMN reservation_date DATE AFTER area_id;
-- Note: reservation_time already exists but might be DATETIME. We'll change it to TIME if needed, or keep it.
-- Based on the requirement, we want separate fields.
ALTER TABLE reservations MODIFY COLUMN reservation_time TIME;
-- Add other requested fields
ALTER TABLE reservations ADD COLUMN customer_name VARCHAR(100) AFTER guest_count;
ALTER TABLE reservations ADD COLUMN mobile_number VARCHAR(20) AFTER customer_name;
-- special_requests and status (as reservation_status) mapping:
-- special_request already exists as 'comments' or 'special_request'? 
-- In database.sql it was 'comments', but in controller it was 'special_request'.
-- Let's check database.sql again.
-- reservations: comments
-- controller: special_request
-- I'll standardized it.

ALTER TABLE reservations CHANGE COLUMN comments special_requests TEXT;
ALTER TABLE reservations CHANGE COLUMN status reservation_status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') DEFAULT 'PENDING';

ALTER TABLE reservations ADD CONSTRAINT fk_res_area FOREIGN KEY (area_id) REFERENCES dining_areas(id) ON DELETE SET NULL;
