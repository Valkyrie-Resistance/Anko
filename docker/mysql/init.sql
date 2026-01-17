-- MySQL 8: E-commerce Database
-- Sample data for an online store

USE testdb;

-- Categories table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(10, 2),
    stock_quantity INT DEFAULT 0,
    category_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    weight_kg DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Customers table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    shipping DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Order items table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Insert categories
INSERT INTO categories (name, description, parent_id) VALUES
('Electronics', 'Electronic devices and accessories', NULL),
('Computers', 'Laptops, desktops, and accessories', 1),
('Smartphones', 'Mobile phones and tablets', 1),
('Audio', 'Headphones, speakers, and audio equipment', 1),
('Clothing', 'Apparel and fashion items', NULL),
('Men''s Clothing', 'Clothing for men', 5),
('Women''s Clothing', 'Clothing for women', 5),
('Home & Garden', 'Home improvement and garden supplies', NULL),
('Kitchen', 'Kitchen appliances and utensils', 8),
('Furniture', 'Home and office furniture', 8);

-- Insert products
INSERT INTO products (sku, name, description, price, cost, stock_quantity, category_id, weight_kg) VALUES
('ELEC-001', 'Wireless Bluetooth Headphones', 'Premium noise-canceling headphones with 30-hour battery life', 149.99, 75.00, 150, 4, 0.35),
('ELEC-002', 'USB-C Hub 7-in-1', 'Multi-port adapter with HDMI, USB 3.0, SD card reader', 49.99, 22.00, 300, 2, 0.12),
('ELEC-003', 'Mechanical Keyboard RGB', 'Gaming keyboard with Cherry MX switches', 129.99, 65.00, 85, 2, 0.95),
('ELEC-004', 'Smartphone Stand Adjustable', 'Aluminum alloy phone/tablet holder', 24.99, 8.00, 500, 3, 0.25),
('ELEC-005', 'Portable SSD 1TB', 'High-speed external solid state drive', 89.99, 55.00, 200, 2, 0.08),
('ELEC-006', 'Wireless Charging Pad', 'Fast 15W Qi-certified charger', 34.99, 15.00, 400, 3, 0.15),
('ELEC-007', '4K Webcam Pro', 'Ultra HD webcam with auto-focus and mic', 179.99, 90.00, 75, 2, 0.22),
('CLTH-001', 'Classic Cotton T-Shirt', '100% organic cotton, available in multiple colors', 29.99, 8.00, 1000, 6, 0.20),
('CLTH-002', 'Slim Fit Jeans', 'Stretch denim with modern fit', 59.99, 25.00, 300, 6, 0.55),
('CLTH-003', 'Summer Floral Dress', 'Lightweight cotton blend dress', 79.99, 30.00, 150, 7, 0.30),
('CLTH-004', 'Wool Blend Sweater', 'Warm and comfortable for cold weather', 89.99, 35.00, 200, 6, 0.45),
('HOME-001', 'Stainless Steel Cookware Set', '10-piece non-stick cooking set', 199.99, 85.00, 50, 9, 8.50),
('HOME-002', 'Memory Foam Pillow', 'Ergonomic design for better sleep', 49.99, 18.00, 250, 10, 1.20),
('HOME-003', 'LED Desk Lamp', 'Adjustable brightness with USB port', 39.99, 15.00, 180, 10, 0.85),
('HOME-004', 'Air Fryer 5.5L', 'Digital touchscreen, 8 cooking presets', 129.99, 60.00, 100, 9, 5.20);

-- Insert customers
INSERT INTO customers (email, first_name, last_name, phone, address_line1, city, state, postal_code, country) VALUES
('john.smith@email.com', 'John', 'Smith', '555-0101', '123 Main Street', 'New York', 'NY', '10001', 'USA'),
('sarah.johnson@email.com', 'Sarah', 'Johnson', '555-0102', '456 Oak Avenue', 'Los Angeles', 'CA', '90001', 'USA'),
('michael.brown@email.com', 'Michael', 'Brown', '555-0103', '789 Pine Road', 'Chicago', 'IL', '60601', 'USA'),
('emily.davis@email.com', 'Emily', 'Davis', '555-0104', '321 Elm Street', 'Houston', 'TX', '77001', 'USA'),
('david.wilson@email.com', 'David', 'Wilson', '555-0105', '654 Maple Drive', 'Phoenix', 'AZ', '85001', 'USA'),
('jennifer.martinez@email.com', 'Jennifer', 'Martinez', '555-0106', '987 Cedar Lane', 'Philadelphia', 'PA', '19101', 'USA'),
('robert.anderson@email.com', 'Robert', 'Anderson', '555-0107', '147 Birch Court', 'San Antonio', 'TX', '78201', 'USA'),
('lisa.taylor@email.com', 'Lisa', 'Taylor', '555-0108', '258 Walnut Way', 'San Diego', 'CA', '92101', 'USA'),
('james.thomas@email.com', 'James', 'Thomas', '555-0109', '369 Cherry Blvd', 'Dallas', 'TX', '75201', 'USA'),
('amanda.garcia@email.com', 'Amanda', 'Garcia', '555-0110', '741 Spruce Ave', 'San Jose', 'CA', '95101', 'USA');

-- Insert orders
INSERT INTO orders (order_number, customer_id, status, subtotal, tax, shipping, total, notes) VALUES
('ORD-2024-001', 1, 'delivered', 199.98, 16.00, 9.99, 225.97, 'Gift wrap requested'),
('ORD-2024-002', 2, 'shipped', 129.99, 10.40, 0.00, 140.39, 'Express shipping'),
('ORD-2024-003', 3, 'processing', 89.99, 7.20, 5.99, 103.18, NULL),
('ORD-2024-004', 1, 'delivered', 259.97, 20.80, 0.00, 280.77, 'Second order from customer'),
('ORD-2024-005', 4, 'pending', 79.99, 6.40, 5.99, 92.38, NULL),
('ORD-2024-006', 5, 'shipped', 179.99, 14.40, 9.99, 204.38, 'Handle with care'),
('ORD-2024-007', 6, 'delivered', 49.99, 4.00, 5.99, 59.98, NULL),
('ORD-2024-008', 7, 'cancelled', 129.99, 10.40, 0.00, 140.39, 'Customer cancelled'),
('ORD-2024-009', 8, 'processing', 319.97, 25.60, 0.00, 345.57, 'Large order'),
('ORD-2024-010', 9, 'pending', 59.99, 4.80, 5.99, 70.78, NULL);

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
(1, 1, 1, 149.99, 149.99),
(1, 6, 1, 34.99, 34.99),
(1, 4, 1, 24.99, 24.99),
(2, 3, 1, 129.99, 129.99),
(3, 5, 1, 89.99, 89.99),
(4, 7, 1, 179.99, 179.99),
(4, 2, 1, 49.99, 49.99),
(4, 8, 1, 29.99, 29.99),
(5, 10, 1, 79.99, 79.99),
(6, 7, 1, 179.99, 179.99),
(7, 2, 1, 49.99, 49.99),
(8, 3, 1, 129.99, 129.99),
(9, 12, 1, 199.99, 199.99),
(9, 15, 1, 129.99, 129.99),
(10, 9, 1, 59.99, 59.99);

-- Create a view for order summary
CREATE VIEW order_summary AS
SELECT
    o.order_number,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.email,
    o.status,
    COUNT(oi.id) AS item_count,
    o.total,
    o.created_at
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id;
