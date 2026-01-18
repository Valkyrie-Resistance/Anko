-- PostgreSQL 15: HR Management Database
-- Sample data for a human resources system

-- Departments table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    budget DECIMAL(12, 2),
    cost_center VARCHAR(20),
    parent_id INT REFERENCES departments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Job positions table
CREATE TABLE job_positions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    min_salary DECIMAL(10, 2),
    max_salary DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE
);

-- Employees table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    hire_date DATE NOT NULL,
    birth_date DATE,
    department_id INT REFERENCES departments(id),
    position_id INT REFERENCES job_positions(id),
    manager_id INT REFERENCES employees(id),
    salary DECIMAL(10, 2),
    employment_type VARCHAR(20) DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'intern')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'on-leave', 'terminated')),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'USA',
    skills JSONB,
    benefits JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leave types
CREATE TABLE leave_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    days_allowed INT DEFAULT 0,
    is_paid BOOLEAN DEFAULT TRUE,
    description TEXT
);

-- Leave requests
CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    leave_type_id INT NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INT NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by INT REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance reviews
CREATE TABLE performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    reviewer_id INT NOT NULL REFERENCES employees(id),
    review_period VARCHAR(20) NOT NULL,
    review_date DATE NOT NULL,
    overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
    goals_rating INT CHECK (goals_rating BETWEEN 1 AND 5),
    skills_rating INT CHECK (skills_rating BETWEEN 1 AND 5),
    teamwork_rating INT CHECK (teamwork_rating BETWEEN 1 AND 5),
    comments TEXT,
    goals_for_next_period TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Training programs
CREATE TABLE training_programs (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    provider VARCHAR(100),
    duration_hours INT,
    cost_per_person DECIMAL(10, 2),
    is_mandatory BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Employee training records
CREATE TABLE employee_training (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    program_id INT NOT NULL REFERENCES training_programs(id),
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in-progress', 'completed', 'cancelled')),
    start_date DATE,
    completion_date DATE,
    score DECIMAL(5, 2),
    certificate_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payroll records
CREATE TABLE payroll (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    base_salary DECIMAL(10, 2) NOT NULL,
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    overtime_pay DECIMAL(10, 2) DEFAULT 0,
    bonus DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    tax_withheld DECIMAL(10, 2) DEFAULT 0,
    net_pay DECIMAL(10, 2) NOT NULL,
    pay_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert departments
INSERT INTO departments (code, name, description, budget, cost_center, parent_id) VALUES
('EXEC', 'Executive', 'Executive leadership team', 2000000.00, 'CC-100', NULL),
('ENG', 'Engineering', 'Software development and engineering', 5000000.00, 'CC-200', 1),
('ENG-FE', 'Frontend Engineering', 'UI and web development team', 1500000.00, 'CC-201', 2),
('ENG-BE', 'Backend Engineering', 'Server and API development team', 1800000.00, 'CC-202', 2),
('ENG-QA', 'Quality Assurance', 'Testing and quality control', 800000.00, 'CC-203', 2),
('PROD', 'Product', 'Product management and design', 1500000.00, 'CC-300', 1),
('MKT', 'Marketing', 'Marketing and communications', 2000000.00, 'CC-400', 1),
('SALES', 'Sales', 'Sales and business development', 3000000.00, 'CC-500', 1),
('HR', 'Human Resources', 'People operations and HR', 800000.00, 'CC-600', 1),
('FIN', 'Finance', 'Finance and accounting', 600000.00, 'CC-700', 1);

-- Insert job positions
INSERT INTO job_positions (code, title, description, min_salary, max_salary) VALUES
('CEO', 'Chief Executive Officer', 'Company leader and executive', 250000.00, 500000.00),
('CTO', 'Chief Technology Officer', 'Technology leadership', 200000.00, 400000.00),
('VP-ENG', 'VP of Engineering', 'Engineering department head', 180000.00, 300000.00),
('SR-ENG', 'Senior Software Engineer', 'Senior individual contributor', 120000.00, 180000.00),
('ENG', 'Software Engineer', 'Mid-level developer', 80000.00, 130000.00),
('JR-ENG', 'Junior Software Engineer', 'Entry-level developer', 60000.00, 90000.00),
('QA-LEAD', 'QA Lead', 'Quality assurance team lead', 100000.00, 150000.00),
('QA-ENG', 'QA Engineer', 'Quality assurance engineer', 70000.00, 110000.00),
('PM', 'Product Manager', 'Product management', 100000.00, 160000.00),
('DESIGNER', 'UX Designer', 'User experience designer', 80000.00, 140000.00),
('MKT-MGR', 'Marketing Manager', 'Marketing team manager', 90000.00, 140000.00),
('MKT-SPEC', 'Marketing Specialist', 'Marketing individual contributor', 55000.00, 85000.00),
('SALES-MGR', 'Sales Manager', 'Sales team manager', 100000.00, 150000.00),
('SALES-REP', 'Sales Representative', 'Sales individual contributor', 50000.00, 80000.00),
('HR-MGR', 'HR Manager', 'Human resources manager', 80000.00, 120000.00),
('HR-SPEC', 'HR Specialist', 'Human resources specialist', 50000.00, 75000.00),
('FIN-MGR', 'Finance Manager', 'Finance department manager', 90000.00, 130000.00),
('ACCOUNTANT', 'Accountant', 'Financial accounting', 55000.00, 85000.00);

-- Insert employees (hierarchical structure)
INSERT INTO employees (employee_id, first_name, last_name, email, phone, hire_date, birth_date, department_id, position_id, manager_id, salary, employment_type, city, country, skills, benefits) VALUES
('EMP001', 'Richard', 'Chen', 'richard.chen@company.com', '555-0001', '2018-01-15', '1975-03-22', 1, 1, NULL, 350000.00, 'full-time', 'San Francisco', 'USA',
  '{"leadership": ["strategic planning", "board relations", "M&A"], "technical": ["software architecture"], "languages": ["English", "Mandarin"]}',
  '{"health": {"plan": "executive", "dental": true, "vision": true}, "retirement": {"401k_match": 6, "stock_options": 50000}, "perks": ["company car", "executive assistant"]}'),
('EMP002', 'Patricia', 'Kumar', 'patricia.kumar@company.com', '555-0002', '2018-06-01', '1980-07-15', 2, 2, 1, 280000.00, 'full-time', 'San Francisco', 'USA',
  '{"leadership": ["team building", "technical strategy"], "technical": ["cloud architecture", "system design", "DevOps"], "certifications": ["AWS Solutions Architect"]}',
  '{"health": {"plan": "premium", "dental": true, "vision": true}, "retirement": {"401k_match": 6, "stock_options": 25000}, "perks": ["home office stipend"]}'),
('EMP003', 'Michael', 'Rodriguez', 'michael.rodriguez@company.com', '555-0003', '2019-03-15', '1982-11-08', 2, 3, 2, 220000.00, 'full-time', 'San Francisco', 'USA',
  '{"leadership": ["project management", "mentoring"], "technical": ["microservices", "Kubernetes", "Go", "Python"], "certifications": ["PMP"]}',
  '{"health": {"plan": "premium", "dental": true, "vision": true}, "retirement": {"401k_match": 5, "stock_options": 15000}}'),
('EMP004', 'Jennifer', 'Thompson', 'jennifer.thompson@company.com', '555-0004', '2019-09-01', '1985-04-30', 3, 4, 3, 155000.00, 'full-time', 'San Francisco', 'USA',
  '{"technical": ["React", "TypeScript", "GraphQL", "CSS", "accessibility"], "tools": ["Figma", "Storybook"], "frameworks": ["Next.js", "Remix"]}',
  '{"health": {"plan": "standard", "dental": true, "vision": true}, "retirement": {"401k_match": 4, "stock_options": 5000}}'),
('EMP005', 'David', 'Patel', 'david.patel@company.com', '555-0005', '2020-02-15', '1990-08-12', 3, 5, 4, 105000.00, 'full-time', 'San Francisco', 'USA',
  '{"technical": ["React", "JavaScript", "HTML", "CSS"], "learning": ["TypeScript", "testing"]}',
  '{"health": {"plan": "standard", "dental": true, "vision": false}, "retirement": {"401k_match": 4}}'),
('EMP006', 'Sarah', 'Kim', 'sarah.kim@company.com', '555-0006', '2021-06-01', '1995-01-25', 3, 6, 4, 72000.00, 'full-time', 'San Francisco', 'USA',
  '{"technical": ["JavaScript", "React basics", "HTML", "CSS"], "education": {"degree": "BS Computer Science", "university": "UC Berkeley"}}',
  '{"health": {"plan": "basic", "dental": true, "vision": false}, "retirement": {"401k_match": 3}}'),
('EMP007', 'James', 'Wilson', 'james.wilson@company.com', '555-0007', '2020-01-10', '1988-06-18', 4, 4, 3, 160000.00, 'full-time', 'Austin', 'USA',
  '{"technical": ["Java", "Spring Boot", "PostgreSQL", "Redis", "Kafka"], "certifications": ["AWS Developer Associate"]}',
  '{"health": {"plan": "premium", "dental": true, "vision": true}, "retirement": {"401k_match": 5, "stock_options": 8000}}'),
('EMP008', 'Emily', 'Johnson', 'emily.johnson@company.com', '555-0008', '2020-08-15', '1991-12-03', 4, 5, 7, 115000.00, 'full-time', 'Austin', 'USA',
  '{"technical": ["Node.js", "Python", "MongoDB", "REST APIs"], "learning": ["Rust", "GraphQL"]}',
  '{"health": {"plan": "standard", "dental": true, "vision": true}, "retirement": {"401k_match": 4}}'),
('EMP009', 'Robert', 'Lee', 'robert.lee@company.com', '555-0009', '2019-11-01', '1987-09-27', 5, 7, 3, 125000.00, 'full-time', 'Seattle', 'USA',
  '{"technical": ["test automation", "Selenium", "Cypress", "performance testing"], "certifications": ["ISTQB Advanced"]}',
  '{"health": {"plan": "premium", "dental": true, "vision": true}, "retirement": {"401k_match": 5, "stock_options": 6000}}'),
('EMP010', 'Amanda', 'Davis', 'amanda.davis@company.com', '555-0010', '2021-03-15', '1993-05-14', 5, 8, 9, 85000.00, 'full-time', 'Seattle', 'USA',
  '{"technical": ["manual testing", "API testing", "Postman", "SQL"], "learning": ["automation", "Cypress"]}',
  '{"health": {"plan": "standard", "dental": true, "vision": false}, "retirement": {"401k_match": 4}}'),
('EMP011', 'Christopher', 'Martinez', 'christopher.martinez@company.com', '555-0011', '2019-07-01', '1984-02-09', 6, 9, 1, 140000.00, 'full-time', 'San Francisco', 'USA',
  '{"leadership": ["roadmap planning", "stakeholder management"], "technical": ["data analysis", "A/B testing"], "tools": ["Jira", "Amplitude", "Mixpanel"]}',
  '{"health": {"plan": "premium", "dental": true, "vision": true}, "retirement": {"401k_match": 5, "stock_options": 10000}}'),
('EMP012', 'Jessica', 'Anderson', 'jessica.anderson@company.com', '555-0012', '2020-04-15', '1989-10-21', 6, 10, 11, 110000.00, 'full-time', 'San Francisco', 'USA',
  '{"technical": ["user research", "wireframing", "prototyping", "design systems"], "tools": ["Figma", "Sketch", "InVision", "Principle"]}',
  '{"health": {"plan": "standard", "dental": true, "vision": true}, "retirement": {"401k_match": 4, "stock_options": 3000}}'),
('EMP013', 'Daniel', 'Taylor', 'daniel.taylor@company.com', '555-0013', '2019-05-01', '1983-07-07', 7, 11, 1, 120000.00, 'full-time', 'New York', 'USA',
  '{"technical": ["SEO", "content marketing", "marketing automation"], "tools": ["HubSpot", "Google Analytics", "Marketo"]}',
  '{"health": {"plan": "premium", "dental": true, "vision": true}, "retirement": {"401k_match": 5, "stock_options": 5000}}'),
('EMP014', 'Ashley', 'Brown', 'ashley.brown@company.com', '555-0014', '2021-01-15', '1994-03-16', 7, 12, 13, 68000.00, 'full-time', 'New York', 'USA',
  '{"technical": ["social media", "content creation", "email marketing"], "tools": ["Canva", "Hootsuite", "Mailchimp"]}',
  '{"health": {"plan": "basic", "dental": true, "vision": false}, "retirement": {"401k_match": 3}}'),
('EMP015', 'Matthew', 'Garcia', 'matthew.garcia@company.com', '555-0015', '2019-08-01', '1986-11-29', 8, 13, 1, 130000.00, 'full-time', 'Chicago', 'USA',
  '{"leadership": ["team management", "pipeline forecasting"], "skills": ["negotiation", "CRM", "B2B sales"], "tools": ["Salesforce", "Outreach"]}',
  '{"health": {"plan": "premium", "dental": true, "vision": true}, "retirement": {"401k_match": 5, "stock_options": 8000}, "commission_rate": 0.15}'),
('EMP016', 'Stephanie', 'Miller', 'stephanie.miller@company.com', '555-0016', '2020-10-01', '1992-08-05', 8, 14, 15, 65000.00, 'full-time', 'Chicago', 'USA',
  '{"skills": ["cold calling", "lead qualification", "demos"], "tools": ["Salesforce", "LinkedIn Sales Navigator"]}',
  '{"health": {"plan": "standard", "dental": true, "vision": false}, "retirement": {"401k_match": 4}, "commission_rate": 0.10}'),
('EMP017', 'Kevin', 'White', 'kevin.white@company.com', '555-0017', '2019-04-15', '1981-01-12', 9, 15, 1, 105000.00, 'full-time', 'San Francisco', 'USA',
  '{"leadership": ["employee relations", "policy development"], "certifications": ["SHRM-CP", "PHR"]}',
  '{"health": {"plan": "premium", "dental": true, "vision": true}, "retirement": {"401k_match": 5, "stock_options": 4000}}'),
('EMP018', 'Nicole', 'Harris', 'nicole.harris@company.com', '555-0018', '2021-07-01', '1996-06-23', 9, 16, 17, 58000.00, 'full-time', 'San Francisco', 'USA',
  '{"skills": ["recruiting", "onboarding", "benefits administration"], "tools": ["Workday", "Greenhouse", "LinkedIn Recruiter"]}',
  '{"health": {"plan": "basic", "dental": true, "vision": false}, "retirement": {"401k_match": 3}}'),
('EMP019', 'Brian', 'Clark', 'brian.clark@company.com', '555-0019', '2019-10-01', '1979-04-08', 10, 17, 1, 115000.00, 'full-time', 'San Francisco', 'USA',
  '{"leadership": ["budgeting", "financial planning"], "technical": ["financial modeling", "forecasting"], "certifications": ["CPA", "CFA Level II"]}',
  '{"health": {"plan": "premium", "dental": true, "vision": true}, "retirement": {"401k_match": 5, "stock_options": 5000}}'),
('EMP020', 'Rachel', 'Lewis', 'rachel.lewis@company.com', '555-0020', '2020-12-15', '1990-09-17', 10, 18, 19, 70000.00, 'full-time', 'San Francisco', 'USA',
  '{"technical": ["bookkeeping", "accounts payable", "accounts receivable"], "tools": ["QuickBooks", "NetSuite", "Excel"]}',
  '{"health": {"plan": "standard", "dental": true, "vision": false}, "retirement": {"401k_match": 4}}');

-- Insert leave types
INSERT INTO leave_types (code, name, days_allowed, is_paid, description) VALUES
('PTO', 'Paid Time Off', 20, TRUE, 'General paid time off for vacation or personal use'),
('SICK', 'Sick Leave', 10, TRUE, 'Paid leave for illness or medical appointments'),
('MAT', 'Maternity Leave', 90, TRUE, 'Paid leave for new mothers'),
('PAT', 'Paternity Leave', 14, TRUE, 'Paid leave for new fathers'),
('UNPAID', 'Unpaid Leave', 30, FALSE, 'Unpaid personal leave'),
('JURY', 'Jury Duty', 5, TRUE, 'Paid leave for jury service'),
('BEREAVE', 'Bereavement', 5, TRUE, 'Paid leave for family loss');

-- Insert leave requests
INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days_requested, reason, status, approved_by, approved_at) VALUES
(5, 1, '2024-03-18', '2024-03-22', 5, 'Family vacation', 'approved', 4, '2024-03-01 10:00:00+00'),
(6, 2, '2024-03-11', '2024-03-12', 2, 'Doctor appointment', 'approved', 4, '2024-03-08 14:00:00+00'),
(8, 1, '2024-04-01', '2024-04-05', 5, 'Spring break trip', 'pending', NULL, NULL),
(10, 2, '2024-03-15', '2024-03-15', 1, 'Dental appointment', 'approved', 9, '2024-03-12 09:00:00+00'),
(14, 1, '2024-03-25', '2024-03-29', 5, 'Wedding attendance', 'approved', 13, '2024-03-10 11:00:00+00'),
(16, 5, '2024-04-15', '2024-04-30', 10, 'Personal matters', 'pending', NULL, NULL);

-- Insert performance reviews
INSERT INTO performance_reviews (employee_id, reviewer_id, review_period, review_date, overall_rating, goals_rating, skills_rating, teamwork_rating, comments, goals_for_next_period) VALUES
(4, 3, '2023-H2', '2024-01-15', 5, 5, 5, 4, 'Exceptional performance. Led major feature delivery ahead of schedule.', 'Take on tech lead responsibilities for new project'),
(5, 4, '2023-H2', '2024-01-20', 4, 4, 4, 5, 'Strong contributor with excellent collaboration skills.', 'Mentor junior team members'),
(6, 4, '2023-H2', '2024-01-22', 4, 3, 4, 5, 'Great progress for first year. Eager to learn.', 'Complete advanced training, take on more complex tasks'),
(7, 3, '2023-H2', '2024-01-18', 4, 4, 5, 4, 'Solid technical skills, good API design work.', 'Lead backend architecture initiative'),
(8, 7, '2023-H2', '2024-01-25', 3, 3, 4, 4, 'Meeting expectations. Room for growth in leadership.', 'Improve estimation skills, take initiative'),
(10, 9, '2023-H2', '2024-01-28', 4, 4, 4, 5, 'Strong QA processes, great attention to detail.', 'Implement automation testing framework');

-- Insert training programs
INSERT INTO training_programs (code, name, description, provider, duration_hours, cost_per_person, is_mandatory) VALUES
('ONBOARD', 'New Hire Onboarding', 'Company orientation and culture training', 'Internal', 8, 0.00, TRUE),
('SEC-101', 'Security Awareness', 'Basic security and data protection', 'Internal', 4, 0.00, TRUE),
('LEAD-101', 'Leadership Fundamentals', 'Basic management and leadership skills', 'LinkedIn Learning', 16, 500.00, FALSE),
('CLOUD-AWS', 'AWS Solutions Architect', 'AWS cloud certification preparation', 'AWS Training', 40, 2000.00, FALSE),
('AGILE', 'Agile & Scrum Master', 'Agile methodology and Scrum certification', 'Scrum.org', 24, 1500.00, FALSE),
('DEV-REACT', 'Advanced React Development', 'Modern React patterns and best practices', 'Frontend Masters', 20, 800.00, FALSE),
('COMM', 'Business Communication', 'Professional communication skills', 'Internal', 8, 0.00, FALSE);

-- Insert employee training records
INSERT INTO employee_training (employee_id, program_id, status, start_date, completion_date, score) VALUES
(6, 1, 'completed', '2021-06-01', '2021-06-01', 95.00),
(6, 2, 'completed', '2021-06-02', '2021-06-02', 88.00),
(6, 6, 'in-progress', '2024-02-01', NULL, NULL),
(8, 1, 'completed', '2020-08-15', '2020-08-15', 92.00),
(8, 2, 'completed', '2020-08-16', '2020-08-16', 90.00),
(8, 4, 'completed', '2023-06-01', '2023-07-15', 85.00),
(10, 1, 'completed', '2021-03-15', '2021-03-15', 98.00),
(10, 2, 'completed', '2021-03-16', '2021-03-16', 94.00),
(10, 5, 'enrolled', '2024-04-01', NULL, NULL),
(14, 1, 'completed', '2021-01-15', '2021-01-15', 90.00),
(14, 7, 'completed', '2023-09-01', '2023-09-15', 92.00);

-- Insert payroll records (last 3 months for some employees)
INSERT INTO payroll (employee_id, pay_period_start, pay_period_end, base_salary, overtime_hours, overtime_pay, bonus, deductions, tax_withheld, net_pay, pay_date) VALUES
(5, '2024-01-01', '2024-01-15', 4375.00, 5, 328.13, 0, 150.00, 940.63, 3612.50, '2024-01-20'),
(5, '2024-01-16', '2024-01-31', 4375.00, 0, 0, 0, 150.00, 845.00, 3380.00, '2024-02-05'),
(5, '2024-02-01', '2024-02-15', 4375.00, 8, 525.00, 0, 150.00, 998.00, 3752.00, '2024-02-20'),
(6, '2024-01-01', '2024-01-15', 3000.00, 0, 0, 0, 100.00, 580.00, 2320.00, '2024-01-20'),
(6, '2024-01-16', '2024-01-31', 3000.00, 0, 0, 0, 100.00, 580.00, 2320.00, '2024-02-05'),
(6, '2024-02-01', '2024-02-15', 3000.00, 0, 0, 500.00, 100.00, 680.00, 2720.00, '2024-02-20'),
(8, '2024-01-01', '2024-01-15', 4791.67, 0, 0, 0, 160.00, 926.33, 3705.34, '2024-01-20'),
(8, '2024-01-16', '2024-01-31', 4791.67, 3, 269.53, 0, 160.00, 980.24, 3920.96, '2024-02-05');

-- Create view for department headcount
CREATE VIEW department_headcount AS
SELECT
    d.name AS department,
    d.code AS dept_code,
    COUNT(e.id) AS employee_count,
    AVG(e.salary)::DECIMAL(10,2) AS avg_salary,
    MIN(e.hire_date) AS earliest_hire,
    MAX(e.hire_date) AS latest_hire
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id AND e.status = 'active'
GROUP BY d.id
ORDER BY employee_count DESC;

-- Create view for manager direct reports
CREATE VIEW manager_reports AS
SELECT
    m.employee_id AS manager_id,
    CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
    m.email AS manager_email,
    COUNT(e.id) AS direct_reports,
    d.name AS department
FROM employees m
JOIN employees e ON m.id = e.manager_id
JOIN departments d ON m.department_id = d.id
WHERE m.status = 'active'
GROUP BY m.id, d.name
ORDER BY direct_reports DESC;

-- Create indexes
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_performance_reviews_employee ON performance_reviews(employee_id);
