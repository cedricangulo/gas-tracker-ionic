CREATE DATABASE IF NOT EXISTS gas_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gas_tracker;

CREATE TABLE IF NOT EXISTS settings (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    payload JSON NOT NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (id, payload) VALUES (1,
'{"name":"Honda Click 125i V4","tankCapacity":5.5,"gaugeSegments":6,"lowFuelAnchor":1.2,"factoryWMTC":50,"stations":["Uno","Shell","Petron","Caltex","Cleanfuel"],"grades":["Unleaded","Premium"]}');

CREATE TABLE IF NOT EXISTS fillups (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    liters DECIMAL(10,3) NULL,
    odometer DECIMAL(12,1) NULL,
    date_time VARCHAR(35) NOT NULL,
    station VARCHAR(80) NULL,
    grade VARCHAR(80) NULL,
    gauge_level TINYINT UNSIGNED NULL,
    filled_to_full BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(11,7) NULL,
    notes VARCHAR(2000) NOT NULL DEFAULT '',
    created_at BIGINT UNSIGNED NOT NULL,
    INDEX by_date_time (date_time)
) ENGINE=InnoDB;

-- Successful mutation receipts and the data mutation commit in the SAME transaction.
CREATE TABLE IF NOT EXISTS mutation_receipts (
    operation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    fingerprint CHAR(64) CHARACTER SET ascii NOT NULL,
    status SMALLINT UNSIGNED NOT NULL,
    payload JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
