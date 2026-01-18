-- PostgreSQL 16: Blog Platform Database
-- Sample data for a blogging platform

-- Authors table
CREATE TABLE authors (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    website VARCHAR(255),
    social_links JSONB,
    preferences JSONB,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1'
);

-- Posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    author_id INT NOT NULL REFERENCES authors(id),
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(350) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    view_count INT DEFAULT 0,
    reading_time_minutes INT,
    is_featured BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Post-Tags junction table
CREATE TABLE post_tags (
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    author_email VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    parent_id INT REFERENCES comments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscribers table
CREATE TABLE subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    is_confirmed BOOLEAN DEFAULT FALSE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Insert authors
INSERT INTO authors (username, email, display_name, bio, website, social_links, preferences, is_verified) VALUES
('techwriter', 'alex.chen@blog.com', 'Alex Chen', 'Senior software engineer passionate about web technologies and developer experience.', 'https://alexchen.dev',
  '{"twitter": "@alexchendev", "github": "alexchen", "linkedin": "alexchen-dev", "mastodon": "@alex@techhub.social"}',
  '{"theme": "dark", "email_notifications": true, "newsletter_frequency": "weekly", "preferred_languages": ["TypeScript", "Python", "Rust"]}',
  TRUE),
('designguru', 'maya.patel@blog.com', 'Maya Patel', 'UI/UX designer with 10 years of experience creating beautiful digital experiences.', 'https://mayapatel.design',
  '{"twitter": "@mayaDesigns", "dribbble": "mayapatel", "behance": "mayapatel", "instagram": "@maya.designs"}',
  '{"theme": "light", "email_notifications": true, "newsletter_frequency": "monthly", "preferred_tools": ["Figma", "Sketch", "Adobe XD"]}',
  TRUE),
('dataenthusiast', 'jordan.kim@blog.com', 'Jordan Kim', 'Data scientist exploring the intersection of AI and everyday applications.', NULL,
  '{"twitter": "@jordankimdata", "github": "jkim-data", "kaggle": "jordankim"}',
  '{"theme": "system", "email_notifications": false, "newsletter_frequency": "never", "preferred_languages": ["Python", "R", "Julia"]}',
  TRUE),
('cloudninja', 'sam.oconnor@blog.com', 'Sam O''Connor', 'DevOps engineer specializing in cloud infrastructure and automation.', 'https://cloudninja.io',
  '{"twitter": "@cloudninja_sam", "github": "cloudninja", "linkedin": "sam-oconnor-devops"}',
  '{"theme": "dark", "email_notifications": true, "newsletter_frequency": "weekly", "cloud_providers": ["AWS", "GCP", "Azure"]}',
  FALSE),
('securitypro', 'taylor.nguyen@blog.com', 'Taylor Nguyen', 'Cybersecurity expert helping organizations stay safe in the digital age.', NULL,
  '{"twitter": "@taylorsec", "github": "taylornguyen-sec", "linkedin": "taylor-nguyen-security"}',
  '{"theme": "dark", "email_notifications": true, "newsletter_frequency": "weekly", "certifications": ["CISSP", "CEH", "OSCP"]}',
  TRUE);

-- Insert tags
INSERT INTO tags (name, slug, description, color) VALUES
('JavaScript', 'javascript', 'All things JavaScript and ECMAScript', '#f7df1e'),
('Python', 'python', 'Python programming language tutorials and tips', '#3776ab'),
('React', 'react', 'React.js framework and ecosystem', '#61dafb'),
('DevOps', 'devops', 'Development operations and CI/CD', '#ff6b6b'),
('Security', 'security', 'Cybersecurity and best practices', '#e74c3c'),
('Database', 'database', 'SQL, NoSQL, and data management', '#27ae60'),
('Cloud', 'cloud', 'AWS, Azure, GCP and cloud computing', '#3498db'),
('AI/ML', 'ai-ml', 'Artificial Intelligence and Machine Learning', '#9b59b6'),
('Career', 'career', 'Career advice and professional development', '#f39c12'),
('Tutorial', 'tutorial', 'Step-by-step guides and how-tos', '#1abc9c');

-- Insert posts
INSERT INTO posts (author_id, title, slug, excerpt, content, status, view_count, reading_time_minutes, is_featured, published_at) VALUES
(1, 'Getting Started with TypeScript in 2024', 'getting-started-typescript-2024', 'A comprehensive guide to TypeScript for JavaScript developers looking to level up their skills.', 'TypeScript has become the de facto standard for large-scale JavaScript applications. In this guide, we''ll cover everything you need to know to get started...

## Why TypeScript?

TypeScript offers several advantages over plain JavaScript:
- Static type checking
- Better IDE support
- Improved code documentation
- Easier refactoring

## Setting Up Your Environment

First, install TypeScript globally...', 'published', 15420, 8, TRUE, '2024-01-15 10:00:00+00'),

(2, 'Design Systems: Building for Scale', 'design-systems-building-scale', 'Learn how to create and maintain design systems that grow with your organization.', 'Design systems are the backbone of consistent user experiences. This post explores the key components and best practices...

## What is a Design System?

A design system is a collection of reusable components, guided by clear standards...', 'published', 8930, 12, TRUE, '2024-01-20 14:30:00+00'),

(3, 'Introduction to Machine Learning with Python', 'intro-machine-learning-python', 'Start your ML journey with practical Python examples and scikit-learn.', 'Machine learning doesn''t have to be intimidating. Let''s break down the fundamentals with hands-on Python code...

## Prerequisites

Before we begin, make sure you have:
- Python 3.8+
- NumPy
- Pandas
- Scikit-learn

## Your First ML Model

Let''s build a simple classifier...', 'published', 22150, 15, TRUE, '2024-02-01 09:00:00+00'),

(4, 'Kubernetes Best Practices for Production', 'kubernetes-best-practices-production', 'Essential tips for running Kubernetes clusters in production environments.', 'Running Kubernetes in production requires careful planning and adherence to best practices...

## Resource Management

Always set resource requests and limits for your pods...', 'published', 11200, 10, FALSE, '2024-02-10 11:00:00+00'),

(5, 'Web Security Essentials Every Developer Should Know', 'web-security-essentials-developers', 'Protect your applications from common vulnerabilities with these security fundamentals.', 'Security is not optional. Every developer needs to understand these core concepts...

## OWASP Top 10

The OWASP Top 10 represents the most critical security risks...', 'published', 18750, 14, TRUE, '2024-02-15 13:00:00+00'),

(1, 'Building RESTful APIs with Node.js and Express', 'building-restful-apis-nodejs-express', 'A practical guide to creating robust APIs using Node.js and Express framework.', 'REST APIs are the foundation of modern web applications. Let''s build one from scratch...', 'published', 9840, 11, FALSE, '2024-02-20 10:00:00+00'),

(2, 'Color Theory for Digital Designers', 'color-theory-digital-designers', 'Understanding color psychology and its application in UI design.', 'Color is one of the most powerful tools in a designer''s toolkit...', 'published', 6520, 9, FALSE, '2024-02-25 15:00:00+00'),

(3, 'Deep Learning with PyTorch: A Beginner''s Guide', 'deep-learning-pytorch-beginners', 'Get started with neural networks using the PyTorch framework.', 'PyTorch has become the preferred framework for deep learning research...', 'draft', 0, 18, FALSE, NULL),

(4, 'Terraform vs CloudFormation: Which Should You Choose?', 'terraform-vs-cloudformation-comparison', 'An in-depth comparison of infrastructure as code tools.', 'Choosing the right IaC tool can significantly impact your workflow...', 'published', 7890, 13, FALSE, '2024-03-01 12:00:00+00'),

(5, 'Zero Trust Security Architecture Explained', 'zero-trust-security-architecture', 'Understanding the principles and implementation of zero trust security.', 'Never trust, always verify. This is the core principle of zero trust...', 'published', 5430, 16, FALSE, '2024-03-05 09:00:00+00');

-- Insert post tags
INSERT INTO post_tags (post_id, tag_id) VALUES
(1, 1), (1, 10),
(2, 10), (2, 9),
(3, 2), (3, 8), (3, 10),
(4, 4), (4, 7),
(5, 5), (5, 10),
(6, 1), (6, 10),
(7, 9), (7, 10),
(8, 2), (8, 8),
(9, 4), (9, 7),
(10, 5);

-- Insert comments
INSERT INTO comments (post_id, author_name, author_email, content, is_approved, parent_id) VALUES
(1, 'Dev Learner', 'devlearner@example.com', 'This is exactly what I needed! TypeScript has been on my list to learn.', TRUE, NULL),
(1, 'Code Newbie', 'codenewbie@example.com', 'Great tutorial! Could you also cover generics in a future post?', TRUE, NULL),
(1, 'Alex Chen', 'alex.chen@blog.com', 'Thanks for the feedback! Generics post is coming soon.', TRUE, 2),
(3, 'ML Student', 'mlstudent@example.com', 'Finally an ML tutorial that doesn''t assume I have a PhD!', TRUE, NULL),
(3, 'Data Curious', 'datacurious@example.com', 'The scikit-learn examples are really helpful. More please!', TRUE, NULL),
(5, 'Security Newbie', 'secnewbie@example.com', 'I had no idea about some of these vulnerabilities. Eye-opening!', TRUE, NULL),
(2, 'Junior Designer', 'juniordesigner@example.com', 'This helped me convince my team to invest in a design system.', TRUE, NULL),
(4, 'K8s Beginner', 'k8sbeginner@example.com', 'The resource limits section saved my cluster from OOM issues!', TRUE, NULL);

-- Insert subscribers
INSERT INTO subscribers (email, name, is_confirmed) VALUES
('subscriber1@example.com', 'Alice Wonder', TRUE),
('subscriber2@example.com', 'Bob Builder', TRUE),
('subscriber3@example.com', 'Charlie Brown', TRUE),
('subscriber4@example.com', 'Diana Prince', FALSE),
('subscriber5@example.com', 'Edward Norton', TRUE),
('subscriber6@example.com', 'Fiona Apple', TRUE),
('subscriber7@example.com', 'George Lucas', FALSE),
('subscriber8@example.com', 'Hannah Montana', TRUE);

-- Create a view for post statistics
CREATE VIEW post_stats AS
SELECT
    p.id,
    p.title,
    a.display_name AS author,
    p.status,
    p.view_count,
    COUNT(DISTINCT c.id) AS comment_count,
    COUNT(DISTINCT pt.tag_id) AS tag_count,
    p.published_at
FROM posts p
JOIN authors a ON p.author_id = a.id
LEFT JOIN comments c ON p.id = c.post_id AND c.is_approved = TRUE
LEFT JOIN post_tags pt ON p.id = pt.post_id
GROUP BY p.id, a.display_name;

-- Create index for better query performance
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_comments_post ON comments(post_id);
