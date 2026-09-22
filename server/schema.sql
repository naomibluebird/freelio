CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('freelancer','client','admin') NOT NULL DEFAULT 'freelancer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS freelancer_profiles (
  user_id INT UNSIGNED PRIMARY KEY,
  title VARCHAR(160) DEFAULT '',
  bio TEXT,
  hourly_rate DECIMAL(10,2) DEFAULT NULL,
  rate_currency ENUM('USD','ETB') NOT NULL DEFAULT 'USD',
  location VARCHAR(120) DEFAULT '',
  experience_years TINYINT UNSIGNED DEFAULT 0,
  availability ENUM('available','busy','unavailable') NOT NULL DEFAULT 'available',
  portfolio_url VARCHAR(255) DEFAULT '',
  github_url VARCHAR(255) DEFAULT '',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS client_profiles (
  user_id INT UNSIGNED PRIMARY KEY,
  company_name VARCHAR(160) DEFAULT '',
  website VARCHAR(255) DEFAULT '',
  about TEXT,
  location VARCHAR(120) DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS skills (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS freelancer_skills (
  user_id INT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, skill_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  job_type ENUM('part-time','full-time','contract') NOT NULL,
  work_mode ENUM('remote','on-site','hybrid') NOT NULL,
  location VARCHAR(120) DEFAULT '',
  budget_min DECIMAL(12,2) DEFAULT NULL,
  budget_max DECIMAL(12,2) DEFAULT NULL,
  budget_type ENUM('fixed','hourly','monthly') NOT NULL DEFAULT 'fixed',
  currency ENUM('USD','ETB') NOT NULL DEFAULT 'USD',
  experience_level ENUM('entry','mid','senior') NOT NULL DEFAULT 'mid',
  deadline DATE DEFAULT NULL,
  status ENUM('open','closed','filled') NOT NULL DEFAULT 'open',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status_created (status, created_at),
  INDEX idx_featured (is_featured)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS project_skills (
  project_id INT UNSIGNED NOT NULL,
  skill_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (project_id, skill_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS applications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  freelancer_id INT UNSIGNED NOT NULL,
  cover_letter TEXT NOT NULL,
  proposed_rate DECIMAL(12,2) DEFAULT NULL,
  status ENUM('pending','shortlisted','accepted','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_application (project_id, freelancer_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS saved_projects (
  user_id INT UNSIGNED NOT NULL,
  project_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, project_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  freelancer_id INT UNSIGNED NOT NULL,
  client_id INT UNSIGNED NOT NULL,
  project_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_review (client_id, project_id, freelancer_id),
  FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;
