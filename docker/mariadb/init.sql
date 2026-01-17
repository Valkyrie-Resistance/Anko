-- MariaDB 11: Inventory Management Database
-- Sample data for a warehouse/inventory system

USE testdb;

-- Warehouses table
CREATE TABLE warehouses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    capacity_sqm DECIMAL(10, 2),
    manager_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    payment_terms INT DEFAULT 30,
    rating DECIMAL(2, 1),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item categories
CREATE TABLE item_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT,
    FOREIGN KEY (parent_id) REFERENCES item_categories(id)
);

-- Inventory items table
CREATE TABLE inventory_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INT,
    supplier_id INT,
    unit_of_measure VARCHAR(20) DEFAULT 'UNIT',
    unit_cost DECIMAL(10, 2),
    reorder_level INT DEFAULT 10,
    reorder_quantity INT DEFAULT 50,
    lead_time_days INT DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES item_categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Stock levels per warehouse
CREATE TABLE stock_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    quantity_on_hand INT DEFAULT 0,
    quantity_reserved INT DEFAULT 0,
    quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    bin_location VARCHAR(20),
    last_counted_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    UNIQUE KEY uk_item_warehouse (item_id, warehouse_id)
);

-- Stock movements (transactions)
CREATE TABLE stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    movement_type ENUM('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT') NOT NULL,
    quantity INT NOT NULL,
    reference_number VARCHAR(50),
    notes TEXT,
    performed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Purchase orders
CREATE TABLE purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INT NOT NULL,
    warehouse_id INT NOT NULL,
    status ENUM('draft', 'submitted', 'approved', 'received', 'cancelled') DEFAULT 'draft',
    total_amount DECIMAL(12, 2),
    expected_date DATE,
    received_date DATE,
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

-- Purchase order items
CREATE TABLE purchase_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (item_id) REFERENCES inventory_items(id)
);

-- Insert warehouses
INSERT INTO warehouses (code, name, address, city, country, capacity_sqm, manager_name, phone) VALUES
('WH-EAST', 'East Coast Distribution Center', '1000 Industrial Parkway', 'Newark', 'USA', 50000.00, 'Mike Johnson', '555-1001'),
('WH-WEST', 'West Coast Fulfillment Center', '2500 Pacific Highway', 'Los Angeles', 'USA', 75000.00, 'Sarah Williams', '555-1002'),
('WH-CENT', 'Central Hub Warehouse', '500 Logistics Drive', 'Chicago', 'USA', 40000.00, 'Tom Davis', '555-1003'),
('WH-EUR', 'European Distribution Hub', '10 Warehouse Lane', 'Rotterdam', 'Netherlands', 35000.00, 'Hans Mueller', '+31-555-1004'),
('WH-ASIA', 'Asia Pacific Center', '88 Industrial Road', 'Singapore', 'Singapore', 45000.00, 'Wei Chen', '+65-555-1005');

-- Insert suppliers
INSERT INTO suppliers (code, company_name, contact_name, email, phone, city, country, payment_terms, rating) VALUES
('SUP-001', 'Global Electronics Co.', 'John Lee', 'jlee@globalelec.com', '555-2001', 'Shenzhen', 'China', 45, 4.5),
('SUP-002', 'Premium Parts Inc.', 'Amy Wilson', 'awilson@premiumparts.com', '555-2002', 'Detroit', 'USA', 30, 4.8),
('SUP-003', 'EuroComponents GmbH', 'Klaus Schmidt', 'kschmidt@eurocomp.de', '+49-555-2003', 'Munich', 'Germany', 30, 4.2),
('SUP-004', 'Pacific Supplies Ltd.', 'Yuki Tanaka', 'ytanaka@pacificsup.jp', '+81-555-2004', 'Tokyo', 'Japan', 60, 4.7),
('SUP-005', 'FastShip Logistics', 'Maria Garcia', 'mgarcia@fastship.com', '555-2005', 'Miami', 'USA', 15, 4.0);

-- Insert item categories
INSERT INTO item_categories (code, name, description, parent_id) VALUES
('ELEC', 'Electronics', 'Electronic components and devices', NULL),
('ELEC-PCB', 'Circuit Boards', 'PCBs and electronic boards', 1),
('ELEC-CHIP', 'Microchips', 'Integrated circuits and processors', 1),
('MECH', 'Mechanical', 'Mechanical parts and components', NULL),
('MECH-FAST', 'Fasteners', 'Screws, bolts, and nuts', 4),
('MECH-BEAR', 'Bearings', 'Ball bearings and roller bearings', 4),
('PACK', 'Packaging', 'Packaging materials', NULL),
('PACK-BOX', 'Boxes', 'Cardboard and shipping boxes', 7),
('RAW', 'Raw Materials', 'Raw materials for manufacturing', NULL),
('RAW-METAL', 'Metals', 'Metal sheets and rods', 9);

-- Insert inventory items
INSERT INTO inventory_items (sku, name, description, category_id, supplier_id, unit_of_measure, unit_cost, reorder_level, reorder_quantity, lead_time_days) VALUES
('PCB-001', 'Main Controller Board v2.1', '8-layer PCB for main controller unit', 2, 1, 'UNIT', 45.00, 100, 500, 14),
('PCB-002', 'Power Supply Board', '4-layer PCB for power management', 2, 1, 'UNIT', 22.50, 150, 600, 14),
('CHIP-001', 'ARM Cortex M4 Processor', 'STM32F4 series microcontroller', 3, 1, 'UNIT', 8.75, 500, 2000, 21),
('CHIP-002', 'WiFi Module ESP32', 'Dual-core WiFi/BT module', 3, 1, 'UNIT', 4.50, 1000, 5000, 21),
('FAST-001', 'M3x8 Stainless Screws', 'Stainless steel Phillips head', 5, 2, 'BOX/100', 12.00, 50, 200, 7),
('FAST-002', 'M4x12 Hex Bolts', 'Grade 8.8 hex head bolts', 5, 2, 'BOX/50', 18.00, 40, 150, 7),
('BEAR-001', '6201 Ball Bearing', 'Deep groove ball bearing 12x32x10mm', 6, 3, 'UNIT', 3.25, 200, 1000, 10),
('BEAR-002', '6205 Ball Bearing', 'Deep groove ball bearing 25x52x15mm', 6, 3, 'UNIT', 5.50, 150, 800, 10),
('BOX-001', 'Small Shipping Box', '200x150x100mm corrugated', 8, 5, 'BUNDLE/25', 8.50, 100, 500, 3),
('BOX-002', 'Medium Shipping Box', '300x250x200mm corrugated', 8, 5, 'BUNDLE/25', 14.00, 80, 400, 3),
('BOX-003', 'Large Shipping Box', '500x400x300mm corrugated', 8, 5, 'BUNDLE/10', 22.00, 50, 200, 3),
('MTL-001', 'Aluminum Sheet 2mm', '1000x500mm aluminum plate', 10, 4, 'SHEET', 35.00, 30, 100, 14),
('MTL-002', 'Steel Rod 10mm', '1m length steel rod', 10, 4, 'UNIT', 8.00, 100, 500, 14);

-- Insert stock levels
INSERT INTO stock_levels (item_id, warehouse_id, quantity_on_hand, quantity_reserved, bin_location, last_counted_at) VALUES
(1, 1, 450, 50, 'A-01-01', '2024-03-01 08:00:00'),
(1, 2, 320, 20, 'A-01-01', '2024-03-01 08:00:00'),
(2, 1, 580, 30, 'A-01-02', '2024-03-01 08:00:00'),
(2, 3, 400, 0, 'A-01-01', '2024-03-01 08:00:00'),
(3, 1, 1800, 200, 'B-02-01', '2024-03-01 08:00:00'),
(3, 2, 2200, 150, 'B-02-01', '2024-03-01 08:00:00'),
(4, 1, 3500, 500, 'B-02-02', '2024-03-01 08:00:00'),
(4, 2, 4200, 300, 'B-02-02', '2024-03-01 08:00:00'),
(5, 1, 180, 10, 'C-03-01', '2024-03-01 08:00:00'),
(5, 3, 150, 0, 'C-01-01', '2024-03-01 08:00:00'),
(6, 1, 120, 5, 'C-03-02', '2024-03-01 08:00:00'),
(7, 2, 850, 50, 'D-01-01', '2024-03-01 08:00:00'),
(8, 2, 620, 30, 'D-01-02', '2024-03-01 08:00:00'),
(9, 1, 420, 20, 'E-01-01', '2024-03-01 08:00:00'),
(9, 2, 380, 15, 'E-01-01', '2024-03-01 08:00:00'),
(10, 1, 280, 10, 'E-01-02', '2024-03-01 08:00:00'),
(11, 1, 150, 5, 'E-01-03', '2024-03-01 08:00:00'),
(12, 4, 85, 10, 'A-01-01', '2024-03-01 08:00:00'),
(13, 4, 420, 20, 'A-02-01', '2024-03-01 08:00:00');

-- Insert stock movements
INSERT INTO stock_movements (item_id, warehouse_id, movement_type, quantity, reference_number, notes, performed_by) VALUES
(1, 1, 'IN', 500, 'PO-2024-001', 'Initial stock receipt', 'John Doe'),
(1, 1, 'OUT', 50, 'SO-2024-001', 'Sales order fulfillment', 'Jane Smith'),
(3, 1, 'IN', 2000, 'PO-2024-002', 'Bulk order receipt', 'John Doe'),
(3, 2, 'TRANSFER', 200, 'TR-2024-001', 'Transfer from East to West', 'Mike Johnson'),
(4, 1, 'IN', 5000, 'PO-2024-003', 'WiFi modules batch', 'John Doe'),
(4, 1, 'OUT', 1500, 'SO-2024-002', 'Large customer order', 'Jane Smith'),
(9, 1, 'IN', 500, 'PO-2024-004', 'Packaging supplies', 'Tom Davis'),
(9, 1, 'OUT', 80, 'INT-001', 'Internal use', 'Tom Davis'),
(7, 2, 'ADJUSTMENT', -10, 'ADJ-001', 'Damaged items write-off', 'Sarah Williams');

-- Insert purchase orders
INSERT INTO purchase_orders (po_number, supplier_id, warehouse_id, status, total_amount, expected_date, received_date, created_by) VALUES
('PO-2024-001', 1, 1, 'received', 22500.00, '2024-02-15', '2024-02-14', 'John Doe'),
('PO-2024-002', 1, 1, 'received', 17500.00, '2024-02-20', '2024-02-22', 'John Doe'),
('PO-2024-003', 1, 1, 'received', 22500.00, '2024-02-25', '2024-02-25', 'John Doe'),
('PO-2024-004', 5, 1, 'received', 4250.00, '2024-03-01', '2024-02-28', 'Tom Davis'),
('PO-2024-005', 2, 1, 'approved', 3600.00, '2024-03-15', NULL, 'Jane Smith'),
('PO-2024-006', 3, 2, 'submitted', 8750.00, '2024-03-20', NULL, 'Sarah Williams');

-- Insert purchase order items
INSERT INTO purchase_order_items (po_id, item_id, quantity_ordered, quantity_received, unit_cost, total_cost) VALUES
(1, 1, 500, 500, 45.00, 22500.00),
(2, 3, 2000, 2000, 8.75, 17500.00),
(3, 4, 5000, 5000, 4.50, 22500.00),
(4, 9, 500, 500, 8.50, 4250.00),
(5, 5, 200, 0, 12.00, 2400.00),
(5, 6, 100, 0, 18.00, 1800.00),
(6, 7, 1000, 0, 3.25, 3250.00),
(6, 8, 1000, 0, 5.50, 5500.00);

-- Create view for low stock alerts
CREATE VIEW low_stock_alert AS
SELECT
    i.sku,
    i.name AS item_name,
    w.name AS warehouse_name,
    sl.quantity_available,
    i.reorder_level,
    i.reorder_quantity,
    s.company_name AS supplier
FROM stock_levels sl
JOIN inventory_items i ON sl.item_id = i.id
JOIN warehouses w ON sl.warehouse_id = w.id
LEFT JOIN suppliers s ON i.supplier_id = s.id
WHERE sl.quantity_available <= i.reorder_level;
