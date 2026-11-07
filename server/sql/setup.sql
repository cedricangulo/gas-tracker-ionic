CREATE DATABASE IF NOT EXISTS gas_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gas_tracker;

CREATE TABLE IF NOT EXISTS settings (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tank_capacity DECIMAL(7,2) NOT NULL,
    gauge_segments TINYINT UNSIGNED NOT NULL,
    low_fuel_anchor DECIMAL(7,3) NOT NULL,
    factory_wmtc DECIMAL(6,2) NOT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (id, name, tank_capacity, gauge_segments, low_fuel_anchor, factory_wmtc)
VALUES (1, 'Honda Click 125i V4', 5.50, 6, 1.200, 50.00);

CREATE TABLE IF NOT EXISTS station_choices (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    UNIQUE KEY uq_station_choices_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grade_choices (
    id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    UNIQUE KEY uq_grade_choices_name (name)
) ENGINE=InnoDB;

INSERT IGNORE INTO station_choices (name, is_active, sort_order) VALUES
    ('Uno', TRUE, 0), ('Shell', TRUE, 1), ('Petron', TRUE, 2),
    ('Caltex', TRUE, 3), ('Cleanfuel', TRUE, 4);
INSERT IGNORE INTO grade_choices (name, is_active, sort_order) VALUES
    ('Unleaded', TRUE, 0), ('Premium', TRUE, 1);

CREATE TABLE IF NOT EXISTS fillups (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    liters DECIMAL(10,3) NULL,
    odometer DECIMAL(12,1) NULL,
    date_time VARCHAR(35) NOT NULL,
    station_choice_id SMALLINT UNSIGNED NULL,
    grade_choice_id SMALLINT UNSIGNED NULL,
    gauge_level TINYINT UNSIGNED NULL,
    filled_to_full BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(11,7) NULL,
    created_at BIGINT UNSIGNED NOT NULL,
    archived_at DATETIME NULL,
    INDEX by_date_time (date_time),
    INDEX by_station_choice (station_choice_id),
    INDEX by_grade_choice (grade_choice_id),
    CONSTRAINT fk_fillups_station_choice FOREIGN KEY (station_choice_id)
        REFERENCES station_choices (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_fillups_grade_choice FOREIGN KEY (grade_choice_id)
        REFERENCES grade_choices (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mutation_receipts (
    operation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    fingerprint CHAR(64) CHARACTER SET ascii NOT NULL,
    status SMALLINT UNSIGNED NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_login_attempts (
    client_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME NOT NULL,
    blocked_until DATETIME NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_tokens (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX by_expiration (expires_at)
) ENGINE=InnoDB;
