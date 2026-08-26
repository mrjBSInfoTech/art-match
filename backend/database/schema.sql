-- Art Match database schema
CREATE DATABASE IF NOT EXISTS art_match;
USE art_match;

CREATE TABLE IF NOT EXISTS admin (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  image VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(30) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NOT NULL,
  birthdate DATE NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  phone_number VARCHAR(30) NOT NULL,
  cor VARCHAR(255) NULL,
  year_level VARCHAR(30) NOT NULL,
  course VARCHAR(100) NOT NULL,
  student_number VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
);

CREATE TABLE IF NOT EXISTS accregistration (
  registration_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL UNIQUE,
  registered_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  register_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  approved_date DATETIME NULL,
  admin_id INT NULL,
  CONSTRAINT fk_registration_student
    FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
  CONSTRAINT fk_registration_admin
    FOREIGN KEY (admin_id) REFERENCES admin (admin_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS artwork (
  artwork_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  art_size VARCHAR(100) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  color_used TEXT NULL,
  price DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  image VARCHAR(255) NOT NULL,
  date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_artwork_student
    FOREIGN KEY (student_id) REFERENCES student (student_id) ON DELETE CASCADE,
  INDEX idx_artwork_student (student_id),
  INDEX idx_artwork_genre (genre)
);

CREATE TABLE IF NOT EXISTS artupload (
  artupload_id INT AUTO_INCREMENT PRIMARY KEY,
  artwork_id INT NOT NULL UNIQUE,
  admin_id INT NULL,
  request_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_date DATETIME NULL,
  CONSTRAINT fk_artupload_artwork
    FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE CASCADE,
  CONSTRAINT fk_artupload_admin
    FOREIGN KEY (admin_id) REFERENCES admin (admin_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feature (
  feature_id INT AUTO_INCREMENT PRIMARY KEY,
  artwork_id INT NOT NULL UNIQUE,
  feature_scanned TEXT NULL,
  mediums_used TEXT NULL,
  CONSTRAINT fk_feature_artwork
    FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS address (
  address_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  region VARCHAR(100) NOT NULL,
  province VARCHAR(100) NULL,
  city VARCHAR(100) NOT NULL,
  barangay VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  street_name VARCHAR(255) NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_address_customer
    FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE,
  INDEX idx_address_customer (customer_id)
);

CREATE TABLE IF NOT EXISTS add_cart (
  add_to_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL UNIQUE,
  total_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_customer
    FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cart_item (
  cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
  add_to_id INT NOT NULL,
  artwork_id INT NOT NULL,
  date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_item_cart
    FOREIGN KEY (add_to_id) REFERENCES add_cart (add_to_id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_item_artwork
    FOREIGN KEY (artwork_id) REFERENCES artwork (artwork_id) ON DELETE CASCADE,
  UNIQUE KEY uq_cart_artwork (add_to_id, artwork_id)
);

CREATE TABLE IF NOT EXISTS account_access (
  role VARCHAR(20) NOT NULL,
  account_id INT NOT NULL,
  strikes TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  banned_at DATETIME NULL,
  ban_reason VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role, account_id)
);

CREATE TABLE IF NOT EXISTS strike_logs (
  strike_log_id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  account_id INT NOT NULL,
  admin_id INT NULL,
  strike_number TINYINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_strike_logs_account (role, account_id),
  INDEX idx_strike_logs_created (created_at)
);

CREATE TABLE IF NOT EXISTS ban_logs (
  ban_log_id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  account_id INT NOT NULL,
  admin_id INT NULL,
  action ENUM('BAN', 'UNBAN') NOT NULL,
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ban_logs_account (role, account_id),
  INDEX idx_ban_logs_created (created_at)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  datetime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  action VARCHAR(50) NOT NULL,
  actor VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL,
  information TEXT
);