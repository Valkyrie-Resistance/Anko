-- MySQL 8.4 LTS: Library Management Database
-- Sample data for a public library system

USE legacydb;

-- Library branches
CREATE TABLE branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    manager_name VARCHAR(100),
    opening_hours VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Genres/Categories
CREATE TABLE genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT,
    FOREIGN KEY (parent_id) REFERENCES genres(id)
);

-- Authors
CREATE TABLE authors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_year INT,
    death_year INT,
    nationality VARCHAR(50),
    biography TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Publishers
CREATE TABLE publishers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    country VARCHAR(100),
    website VARCHAR(255),
    founded_year INT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Books catalog
CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(300) NOT NULL,
    subtitle VARCHAR(300),
    genre_id INT,
    publisher_id INT,
    publication_year INT,
    edition VARCHAR(50),
    pages INT,
    language VARCHAR(50) DEFAULT 'English',
    description TEXT,
    cover_image_url VARCHAR(500),
    metadata JSON,
    subjects JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (genre_id) REFERENCES genres(id),
    FOREIGN KEY (publisher_id) REFERENCES publishers(id)
);

-- Book-Author junction (many-to-many)
CREATE TABLE book_authors (
    book_id INT NOT NULL,
    author_id INT NOT NULL,
    author_role ENUM('author', 'co-author', 'editor', 'translator') DEFAULT 'author',
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (author_id) REFERENCES authors(id)
);

-- Physical copies (inventory)
CREATE TABLE book_copies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    branch_id INT NOT NULL,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    condition_status ENUM('new', 'good', 'fair', 'poor', 'damaged') DEFAULT 'good',
    acquisition_date DATE,
    acquisition_source ENUM('purchase', 'donation', 'transfer') DEFAULT 'purchase',
    is_available BOOLEAN DEFAULT TRUE,
    is_reference_only BOOLEAN DEFAULT FALSE,
    notes TEXT,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Library members
CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    birth_date DATE,
    membership_type ENUM('standard', 'student', 'senior', 'child', 'premium') DEFAULT 'standard',
    registration_date DATE NOT NULL,
    expiry_date DATE,
    home_branch_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    total_checkouts INT DEFAULT 0,
    late_fees_owed DECIMAL(8, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (home_branch_id) REFERENCES branches(id)
);

-- Loans/Checkouts
CREATE TABLE loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    copy_id INT NOT NULL,
    member_id INT NOT NULL,
    checkout_branch_id INT NOT NULL,
    checkout_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    return_branch_id INT,
    renewed_count INT DEFAULT 0,
    late_fee DECIMAL(8, 2) DEFAULT 0,
    status ENUM('active', 'returned', 'overdue', 'lost') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (copy_id) REFERENCES book_copies(id),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (checkout_branch_id) REFERENCES branches(id),
    FOREIGN KEY (return_branch_id) REFERENCES branches(id)
);

-- Reservations/Holds
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    member_id INT NOT NULL,
    branch_id INT NOT NULL,
    reservation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE,
    status ENUM('pending', 'ready', 'fulfilled', 'cancelled', 'expired') DEFAULT 'pending',
    notification_sent BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Insert branches
INSERT INTO branches (code, name, address, city, phone, email, manager_name, opening_hours) VALUES
('MAIN', 'Central Library', '100 Library Square', 'Springfield', '555-1000', 'central@library.org', 'Margaret Thompson', 'Mon-Sat 9AM-9PM, Sun 12PM-6PM'),
('NORTH', 'Northside Branch', '450 Oak Street', 'Springfield', '555-1001', 'north@library.org', 'James Wilson', 'Mon-Fri 10AM-7PM, Sat 10AM-5PM'),
('SOUTH', 'Southgate Community Library', '789 Pine Avenue', 'Springfield', '555-1002', 'south@library.org', 'Linda Garcia', 'Mon-Fri 10AM-8PM, Sat 9AM-5PM'),
('EAST', 'Eastview Library', '222 Maple Drive', 'Springfield', '555-1003', 'east@library.org', 'Robert Chen', 'Tue-Sat 10AM-6PM'),
('WEST', 'Westside Reading Room', '567 Birch Lane', 'Springfield', '555-1004', 'west@library.org', 'Susan Miller', 'Mon-Thu 11AM-7PM, Fri-Sat 10AM-5PM');

-- Insert genres
INSERT INTO genres (name, description, parent_id) VALUES
('Fiction', 'Imaginative and narrative prose', NULL),
('Non-Fiction', 'Factual and informative works', NULL),
('Science Fiction', 'Speculative fiction with scientific elements', 1),
('Fantasy', 'Fiction involving magical or supernatural elements', 1),
('Mystery', 'Fiction involving crime or puzzles', 1),
('Romance', 'Fiction focusing on romantic relationships', 1),
('Biography', 'Life stories of real people', 2),
('History', 'Records of past events', 2),
('Science', 'Scientific knowledge and discoveries', 2),
('Self-Help', 'Personal improvement and guidance', 2),
('Children''s', 'Books for young readers', NULL),
('Young Adult', 'Books for teenage readers', NULL);

-- Insert authors
INSERT INTO authors (first_name, last_name, birth_year, death_year, nationality, biography) VALUES
('Jane', 'Austen', 1775, 1817, 'British', 'English novelist known for her social commentary and romantic fiction'),
('George', 'Orwell', 1903, 1950, 'British', 'English novelist and essayist, known for dystopian and political fiction'),
('Harper', 'Lee', 1926, 2016, 'American', 'American novelist famous for To Kill a Mockingbird'),
('J.R.R.', 'Tolkien', 1892, 1973, 'British', 'English writer and philologist, author of The Hobbit and The Lord of the Rings'),
('Agatha', 'Christie', 1890, 1976, 'British', 'English writer known as the Queen of Crime'),
('Isaac', 'Asimov', 1920, 1992, 'American', 'American writer and professor known for science fiction and science books'),
('Stephen', 'King', 1947, NULL, 'American', 'American author of horror, supernatural fiction, and suspense'),
('Michelle', 'Obama', 1964, NULL, 'American', 'American attorney, author, and former First Lady'),
('Yuval Noah', 'Harari', 1976, NULL, 'Israeli', 'Israeli historian and author of popular science books'),
('J.K.', 'Rowling', 1965, NULL, 'British', 'British author best known for the Harry Potter series'),
('Brandon', 'Sanderson', 1975, NULL, 'American', 'American author of epic fantasy and science fiction'),
('Tara', 'Westover', 1986, NULL, 'American', 'American author and historian');

-- Insert publishers
INSERT INTO publishers (name, country, website, founded_year) VALUES
('Penguin Random House', 'USA', 'https://www.penguinrandomhouse.com', 2013),
('HarperCollins', 'USA', 'https://www.harpercollins.com', 1989),
('Simon & Schuster', 'USA', 'https://www.simonandschuster.com', 1924),
('Macmillan Publishers', 'USA', 'https://www.macmillan.com', 1843),
('Hachette Book Group', 'USA', 'https://www.hachettebookgroup.com', 2006),
('Scholastic', 'USA', 'https://www.scholastic.com', 1920),
('Tor Books', 'USA', 'https://www.tor.com', 1980),
('Vintage Books', 'USA', 'https://www.vintagebooks.com', 1954);

-- Insert books
INSERT INTO books (isbn, title, subtitle, genre_id, publisher_id, publication_year, pages, description, metadata, subjects) VALUES
('978-0141439518', 'Pride and Prejudice', NULL, 6, 1, 1813, 432, 'A romantic novel following Elizabeth Bennet as she navigates issues of manners, upbringing, and marriage',
  '{"format": "paperback", "dimensions": {"height_cm": 19.8, "width_cm": 12.9}, "weight_g": 280, "reading_level": "adult", "awards": ["British Literature Classic"]}',
  '["Classic Literature", "Romance", "British", "19th Century", "Social Commentary"]'),
('978-0451524935', '1984', NULL, 3, 3, 1949, 328, 'A dystopian novel set in a totalitarian society under constant surveillance',
  '{"format": "paperback", "dimensions": {"height_cm": 17.5, "width_cm": 10.6}, "weight_g": 200, "reading_level": "adult", "themes": ["totalitarianism", "surveillance", "freedom"]}',
  '["Dystopian", "Political Fiction", "Science Fiction", "Classic"]'),
('978-0060935467', 'To Kill a Mockingbird', NULL, 1, 2, 1960, 336, 'A novel about racial injustice in the American South',
  '{"format": "paperback", "reading_level": "young adult", "awards": ["Pulitzer Prize"], "school_curriculum": true}',
  '["American Literature", "Legal Drama", "Coming of Age", "Civil Rights"]'),
('978-0618640157', 'The Hobbit', 'Or There and Back Again', 4, 5, 1937, 310, 'A fantasy novel about the adventures of Bilbo Baggins',
  '{"format": "hardcover", "illustrated": true, "reading_level": "all ages", "series": {"name": "Middle-earth", "order": 1}}',
  '["Fantasy", "Adventure", "Children''s Classic", "Quest"]'),
('978-0062073488', 'Murder on the Orient Express', NULL, 5, 2, 1934, 256, 'A detective novel featuring Hercule Poirot',
  '{"format": "paperback", "detective": "Hercule Poirot", "series": {"name": "Poirot", "order": 10}, "adaptations": ["film 1974", "film 2017"]}',
  '["Mystery", "Detective Fiction", "Crime", "British"]'),
('978-0553382563', 'Foundation', NULL, 3, 1, 1951, 244, 'The first novel in the Foundation series about the fall of a galactic empire',
  '{"format": "paperback", "series": {"name": "Foundation", "order": 1}, "awards": ["Hugo Award"], "adaptations": ["TV series 2021"]}',
  '["Science Fiction", "Space Opera", "Philosophy", "Galactic Empire"]'),
('978-1501142970', 'It', NULL, 1, 3, 1986, 1138, 'A horror novel about an evil clown terrorizing children',
  '{"format": "paperback", "reading_level": "adult", "content_warnings": ["violence", "horror"], "adaptations": ["TV 1990", "film 2017", "film 2019"]}',
  '["Horror", "Supernatural", "Coming of Age", "Thriller"]'),
('978-1524763138', 'Becoming', NULL, 7, 1, 2018, 448, 'A memoir by Michelle Obama',
  '{"format": "hardcover", "audiobook_narrator": "Michelle Obama", "bestseller_weeks": 24, "languages_available": 24}',
  '["Memoir", "Biography", "Politics", "Inspiration", "Women''s Studies"]'),
('978-0062316110', 'Sapiens', 'A Brief History of Humankind', 8, 2, 2014, 464, 'A book exploring the history of humanity',
  '{"format": "paperback", "translated_languages": 65, "academic_field": "history", "recommended_by": ["Bill Gates", "Mark Zuckerberg"]}',
  '["History", "Anthropology", "Science", "Philosophy", "Evolution"]'),
('978-0439708180', 'Harry Potter and the Sorcerer''s Stone', NULL, 4, 6, 1997, 309, 'The first book in the Harry Potter series',
  '{"format": "hardcover", "series": {"name": "Harry Potter", "order": 1, "total_books": 7}, "age_range": {"min": 8, "max": 12}}',
  '["Fantasy", "Young Adult", "Magic", "Friendship", "School"]'),
('978-0765311788', 'Mistborn: The Final Empire', NULL, 4, 7, 2006, 541, 'An epic fantasy novel set in a world of ash and mist',
  '{"format": "paperback", "series": {"name": "Mistborn", "order": 1, "era": 1}, "magic_system": "Allomancy"}',
  '["Epic Fantasy", "Magic System", "Heist", "Revolution"]'),
('978-0399590504', 'Educated', 'A Memoir', 7, 1, 2018, 352, 'A memoir about a woman who grew up in a survivalist family',
  '{"format": "hardcover", "bestseller_lists": ["NYT", "Amazon"], "book_club_pick": true}',
  '["Memoir", "Education", "Family", "Survival", "Self-Discovery"]'),
('978-0618260300', 'The Lord of the Rings', 'The Fellowship of the Ring', 4, 5, 1954, 423, 'The first volume of the epic fantasy trilogy',
  '{"format": "hardcover", "series": {"name": "The Lord of the Rings", "order": 1, "total_books": 3}, "maps_included": true}',
  '["Epic Fantasy", "Adventure", "Quest", "Good vs Evil"]'),
('978-0316769488', 'The Catcher in the Rye', NULL, 1, 5, 1951, 234, 'A novel about teenage angst and alienation',
  '{"format": "paperback", "controversial": true, "reading_level": "young adult", "school_curriculum": true}',
  '["Coming of Age", "American Literature", "Rebellion", "Identity"]'),
('978-0062315007', 'The Alchemist', NULL, 1, 2, 1988, 208, 'A philosophical novel about following your dreams',
  '{"format": "paperback", "original_language": "Portuguese", "copies_sold_millions": 150, "translations": 80}',
  '["Philosophical Fiction", "Fable", "Self-Discovery", "Adventure"]');

-- Insert book authors
INSERT INTO book_authors (book_id, author_id, author_role) VALUES
(1, 1, 'author'),
(2, 2, 'author'),
(3, 3, 'author'),
(4, 4, 'author'),
(5, 5, 'author'),
(6, 6, 'author'),
(7, 7, 'author'),
(8, 8, 'author'),
(9, 9, 'author'),
(10, 10, 'author'),
(11, 11, 'author'),
(12, 12, 'author'),
(13, 4, 'author');

-- Insert book copies (multiple copies per book, distributed across branches)
INSERT INTO book_copies (book_id, branch_id, barcode, condition_status, acquisition_date, acquisition_source) VALUES
(1, 1, 'LIB-001-001', 'good', '2020-01-15', 'purchase'),
(1, 1, 'LIB-001-002', 'good', '2020-01-15', 'purchase'),
(1, 2, 'LIB-001-003', 'fair', '2019-06-20', 'purchase'),
(2, 1, 'LIB-002-001', 'good', '2020-03-10', 'purchase'),
(2, 3, 'LIB-002-002', 'good', '2021-02-15', 'donation'),
(3, 1, 'LIB-003-001', 'good', '2019-09-01', 'purchase'),
(3, 2, 'LIB-003-002', 'new', '2023-01-10', 'purchase'),
(3, 4, 'LIB-003-003', 'fair', '2018-05-20', 'purchase'),
(4, 1, 'LIB-004-001', 'good', '2020-07-15', 'purchase'),
(4, 1, 'LIB-004-002', 'new', '2023-06-01', 'purchase'),
(5, 1, 'LIB-005-001', 'good', '2021-04-20', 'purchase'),
(5, 5, 'LIB-005-002', 'good', '2022-08-15', 'donation'),
(6, 1, 'LIB-006-001', 'fair', '2019-11-10', 'purchase'),
(7, 1, 'LIB-007-001', 'good', '2020-10-31', 'purchase'),
(7, 3, 'LIB-007-002', 'poor', '2017-06-15', 'purchase'),
(8, 1, 'LIB-008-001', 'new', '2024-01-05', 'purchase'),
(8, 2, 'LIB-008-002', 'good', '2023-03-20', 'purchase'),
(9, 1, 'LIB-009-001', 'good', '2022-05-15', 'purchase'),
(10, 1, 'LIB-010-001', 'good', '2020-12-01', 'purchase'),
(10, 2, 'LIB-010-002', 'good', '2021-07-15', 'purchase'),
(10, 3, 'LIB-010-003', 'fair', '2019-03-10', 'donation'),
(11, 1, 'LIB-011-001', 'new', '2023-09-01', 'purchase'),
(12, 1, 'LIB-012-001', 'good', '2022-02-20', 'purchase'),
(13, 1, 'LIB-013-001', 'good', '2020-06-15', 'purchase'),
(14, 1, 'LIB-014-001', 'fair', '2018-08-10', 'purchase'),
(15, 1, 'LIB-015-001', 'good', '2021-11-25', 'purchase');

-- Update availability for some copies
UPDATE book_copies SET is_available = FALSE WHERE id IN (1, 4, 9, 16, 19);

-- Insert members
INSERT INTO members (member_id, first_name, last_name, email, phone, city, postal_code, birth_date, membership_type, registration_date, expiry_date, home_branch_id, total_checkouts) VALUES
('MEM-2020-001', 'Alice', 'Johnson', 'alice.j@email.com', '555-0101', 'Springfield', '12345', '1985-06-15', 'standard', '2020-01-10', '2025-01-10', 1, 45),
('MEM-2020-002', 'Bob', 'Smith', 'bob.smith@email.com', '555-0102', 'Springfield', '12346', '1990-03-22', 'standard', '2020-02-15', '2025-02-15', 2, 32),
('MEM-2021-003', 'Carol', 'Williams', 'carol.w@email.com', '555-0103', 'Springfield', '12347', '1978-11-08', 'premium', '2021-05-20', '2025-05-20', 1, 78),
('MEM-2019-004', 'David', 'Brown', 'david.b@email.com', '555-0104', 'Springfield', '12348', '2008-08-30', 'student', '2019-09-01', '2024-09-01', 3, 120),
('MEM-2022-005', 'Eva', 'Martinez', 'eva.m@email.com', '555-0105', 'Springfield', '12349', '1955-04-12', 'senior', '2022-03-15', '2025-03-15', 4, 28),
('MEM-2023-006', 'Frank', 'Davis', 'frank.d@email.com', '555-0106', 'Springfield', '12350', '1995-12-03', 'standard', '2023-01-08', '2026-01-08', 1, 15),
('MEM-2020-007', 'Grace', 'Wilson', 'grace.w@email.com', '555-0107', 'Springfield', '12351', '2015-07-19', 'child', '2020-06-10', '2025-06-10', 2, 55),
('MEM-2021-008', 'Henry', 'Anderson', 'henry.a@email.com', '555-0108', 'Springfield', '12352', '1982-09-25', 'standard', '2021-11-20', '2024-11-20', 5, 22);

-- Insert loans (some active, some returned)
INSERT INTO loans (copy_id, member_id, checkout_branch_id, checkout_date, due_date, return_date, return_branch_id, renewed_count, status) VALUES
(1, 1, 1, '2024-02-20', '2024-03-05', NULL, NULL, 1, 'active'),
(4, 3, 1, '2024-02-25', '2024-03-10', NULL, NULL, 0, 'active'),
(9, 2, 1, '2024-03-01', '2024-03-15', NULL, NULL, 0, 'active'),
(16, 6, 1, '2024-03-05', '2024-03-19', NULL, NULL, 0, 'active'),
(19, 4, 3, '2024-02-15', '2024-03-01', NULL, NULL, 2, 'overdue'),
(2, 1, 1, '2024-01-10', '2024-01-24', '2024-01-22', 1, 0, 'returned'),
(5, 3, 3, '2024-01-15', '2024-01-29', '2024-01-28', 3, 0, 'returned'),
(7, 4, 2, '2024-02-01', '2024-02-15', '2024-02-14', 2, 0, 'returned'),
(11, 5, 4, '2024-02-05', '2024-02-19', '2024-02-20', 4, 0, 'returned'),
(20, 7, 2, '2024-02-10', '2024-02-24', '2024-02-23', 2, 0, 'returned');

-- Update late fees for overdue loan
UPDATE loans SET late_fee = 2.50 WHERE id = 5;
UPDATE members SET late_fees_owed = 2.50 WHERE id = 4;

-- Insert reservations
INSERT INTO reservations (book_id, member_id, branch_id, reservation_date, expiry_date, status) VALUES
(8, 2, 1, '2024-03-01 10:30:00', '2024-03-15', 'pending'),
(10, 5, 4, '2024-03-05 14:15:00', '2024-03-19', 'pending'),
(7, 1, 1, '2024-02-28 09:00:00', '2024-03-10', 'ready'),
(11, 3, 1, '2024-02-25 11:45:00', '2024-03-08', 'fulfilled');

-- Create view for popular books
CREATE VIEW popular_books AS
SELECT
    b.isbn,
    b.title,
    a.first_name AS author_first,
    a.last_name AS author_last,
    g.name AS genre,
    COUNT(DISTINCT bc.id) AS total_copies,
    COUNT(DISTINCT l.id) AS times_borrowed
FROM books b
JOIN book_authors ba ON b.id = ba.book_id AND ba.author_role = 'author'
JOIN authors a ON ba.author_id = a.id
LEFT JOIN genres g ON b.genre_id = g.id
LEFT JOIN book_copies bc ON b.id = bc.book_id
LEFT JOIN loans l ON bc.id = l.copy_id
GROUP BY b.id, a.id
ORDER BY times_borrowed DESC;

-- Create view for overdue loans
CREATE VIEW overdue_loans AS
SELECT
    l.id AS loan_id,
    b.title,
    CONCAT(m.first_name, ' ', m.last_name) AS member_name,
    m.email,
    m.phone,
    l.checkout_date,
    l.due_date,
    DATEDIFF(CURDATE(), l.due_date) AS days_overdue,
    l.late_fee,
    br.name AS checkout_branch
FROM loans l
JOIN book_copies bc ON l.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
JOIN members m ON l.member_id = m.id
JOIN branches br ON l.checkout_branch_id = br.id
WHERE l.status = 'overdue' OR (l.status = 'active' AND l.due_date < CURDATE());

-- Create index for better performance
CREATE INDEX idx_loans_member ON loans(member_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_copies_book ON book_copies(book_id);
CREATE INDEX idx_copies_branch ON book_copies(branch_id);
CREATE INDEX idx_members_branch ON members(home_branch_id);
