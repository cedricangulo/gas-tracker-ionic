<?php
declare(strict_types=1);

require_once __DIR__ . '/api/helpers.php';
require_once __DIR__ . '/seed.php';

function migration_column_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    );
    $stmt->execute([$table, $column]);
    return (int) $stmt->fetchColumn() > 0;
}

function migration_constraint_exists(PDO $pdo, string $name): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?',
    );
    $stmt->execute(['fillups', $name]);
    return (int) $stmt->fetchColumn() > 0;
}

/** Save a version 1 row backup before applying any DDL. */
function migration_backup_legacy(PDO $pdo, string $directory): string
{
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Cannot create migration backup directory.');
    }
    $tables = [];
    foreach (['settings', 'fillups', 'mutation_receipts'] as $table) {
        $tables[$table] = [];
        foreach (query_statement($pdo, 'SELECT * FROM ' . $table)->fetchAll() as $row) {
            $tables[$table][] = object_array($row);
        }
    }
    $path =
        $directory .
        '/normalization-backup-v1-' .
        gmdate('Ymd-His') .
        '-' .
        bin2hex(random_bytes(5)) .
        '.json';
    $data = json_encode(
        [
            'version' => 1,
            'database' => query_statement($pdo, 'SELECT DATABASE()')->fetchColumn(),
            'createdAt' => gmdate(DATE_ATOM),
            'tables' => $tables,
        ],
        JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR,
    );
    if (file_put_contents($path, $data, LOCK_EX) !== strlen($data)) {
        throw new RuntimeException('Cannot write migration backup; database was not changed.');
    }
    return $path;
}

/** Back up all rows, including retired note text, before removing the column. */
function migration_remove_notes(PDO $pdo, string $directory): ?string
{
    $hasNotesColumn = migration_column_exists($pdo, 'fillups', 'notes');
    $receiptNotes = (int) query_statement(
        $pdo,
        "SELECT COUNT(*) FROM mutation_receipts WHERE JSON_CONTAINS_PATH(payload, 'one', '$.data.notes') = 1",
    )->fetchColumn();
    if (!$hasNotesColumn && $receiptNotes === 0) {
        return null;
    }
    $tables = [];
    foreach (array_keys(seed_columns()) as $table) {
        $tables[$table] = array_values(
            array_map(
                static fn(array $row): array => object_array($row),
                query_statement($pdo, 'SELECT * FROM ' . $table)->fetchAll(),
            ),
        );
    }
    $backup = seed_write_backup($pdo, $tables, $directory, 2);
    if ($hasNotesColumn) {
        $pdo->exec('ALTER TABLE fillups DROP COLUMN notes');
    }
    if ($receiptNotes > 0) {
        $pdo->exec(
            "UPDATE mutation_receipts SET payload = JSON_REMOVE(payload, '$.data.notes') WHERE JSON_CONTAINS_PATH(payload, 'one', '$.data.notes') = 1",
        );
    }
    return $backup;
}

/** Upgrade the original JSON settings/string-choice schema in place. */
function migrate_normalize(PDO $pdo, string $backupDirectory): ?string
{
    if (!migration_column_exists($pdo, 'settings', 'payload')) {
        if (
            !migration_column_exists($pdo, 'settings', 'tank_capacity') ||
            !migration_column_exists($pdo, 'fillups', 'station_choice_id') ||
            !migration_column_exists($pdo, 'fillups', 'grade_choice_id')
        ) {
            throw new RuntimeException(
                'Database schema is neither the supported legacy nor normalized version.',
            );
        }
        if (!migration_column_exists($pdo, 'fillups', 'archived_at')) {
            $pdo->exec('ALTER TABLE fillups ADD COLUMN archived_at DATETIME NULL');
        }
        foreach (['station_choices', 'grade_choices'] as $table) {
            $pdo->exec(
                'ALTER TABLE ' .
                    $table .
                    ' MODIFY name VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL',
            );
        }
        return migration_remove_notes($pdo, $backupDirectory);
    }

    $raw = query_statement($pdo, 'SELECT payload FROM settings WHERE id = 1')->fetchColumn();
    if (!is_string($raw)) {
        throw new RuntimeException('Legacy singleton settings row is missing.');
    }
    $settings = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($settings)) {
        throw new RuntimeException('Legacy settings payload is invalid.');
    }
    $legacyNamesRemain = migration_column_exists($pdo, 'fillups', 'station');
    if ($legacyNamesRemain) {
        $fillSql = 'SELECT * FROM fillups';
    } else {
        $fillSql =
            'SELECT f.*, s.name AS station, g.name AS grade FROM fillups f LEFT JOIN station_choices s ON s.id = f.station_choice_id LEFT JOIN grade_choices g ON g.id = f.grade_choice_id';
    }
    $legacyTables = [
        'settings' => [['id' => 1, 'payload' => $raw]],
        'fillups' => array_values(
            array_map(
                static fn(array $row): array => object_array($row),
                query_statement($pdo, $fillSql)->fetchAll(),
            ),
        ),
        'mutation_receipts' => array_values(
            array_map(
                static fn(array $row): array => object_array($row),
                query_statement($pdo, 'SELECT * FROM mutation_receipts')->fetchAll(),
            ),
        ),
    ];
    if ($legacyNamesRemain) {
        $normalized = seed_convert_legacy_tables($legacyTables);
        $backup = migration_backup_legacy($pdo, $backupDirectory);
    } else {
        $normalized = [
            'settings' => array_map(
                static fn(array $row): array => object_array($row),
                query_statement($pdo, 'SELECT * FROM settings_normalized')->fetchAll(),
            ),
            'station_choices' => array_map(
                static fn(array $row): array => object_array($row),
                query_statement($pdo, 'SELECT * FROM station_choices')->fetchAll(),
            ),
            'grade_choices' => array_map(
                static fn(array $row): array => object_array($row),
                query_statement($pdo, 'SELECT * FROM grade_choices')->fetchAll(),
            ),
            'fillups' => array_map(
                static fn(array $row): array => object_array($row),
                query_statement(
                    $pdo,
                    'SELECT id, station_choice_id, grade_choice_id FROM fillups',
                )->fetchAll(),
            ),
        ];
        $backups = glob($backupDirectory . '/normalization-backup-v1-*.json') ?: [];
        if ($backups === []) {
            throw new RuntimeException(
                'Cannot resume migration without its version 1 row backup. Restore the SQL backup and retry.',
            );
        }
        sort($backups);
        $backup = $backups[array_key_last($backups)];
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS station_choices (
        id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        UNIQUE KEY uq_station_choices_name (name)
    ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS grade_choices (
        id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        UNIQUE KEY uq_grade_choices_name (name)
    ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings_normalized (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        tank_capacity DECIMAL(7,2) NOT NULL,
        gauge_segments TINYINT UNSIGNED NOT NULL,
        low_fuel_anchor DECIMAL(7,3) NOT NULL,
        factory_wmtc DECIMAL(6,2) NOT NULL
    ) ENGINE=InnoDB");
    $stmt = $pdo->prepare(
        'REPLACE INTO settings_normalized (id, name, tank_capacity, gauge_segments, low_fuel_anchor, factory_wmtc) VALUES (?, ?, ?, ?, ?, ?)',
    );
    foreach ($normalized['settings'] as $row) {
        $stmt->execute([
            $row['id'],
            $row['name'],
            $row['tank_capacity'],
            $row['gauge_segments'],
            $row['low_fuel_anchor'],
            $row['factory_wmtc'],
        ]);
    }
    foreach (['station_choices', 'grade_choices'] as $table) {
        $stmt = $pdo->prepare(
            'INSERT INTO ' .
                $table .
                ' (id, name, is_active, sort_order) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active), sort_order = VALUES(sort_order)',
        );
        foreach ($normalized[$table] as $row) {
            $stmt->execute([$row['id'], $row['name'], $row['is_active'], $row['sort_order']]);
        }
    }

    if (!migration_column_exists($pdo, 'fillups', 'station_choice_id')) {
        $pdo->exec(
            'ALTER TABLE fillups ADD COLUMN station_choice_id SMALLINT UNSIGNED NULL, ADD COLUMN grade_choice_id SMALLINT UNSIGNED NULL',
        );
    }
    if (!migration_column_exists($pdo, 'fillups', 'archived_at')) {
        $pdo->exec('ALTER TABLE fillups ADD COLUMN archived_at DATETIME NULL');
    }
    $stmt = $pdo->prepare(
        'UPDATE fillups SET station_choice_id = ?, grade_choice_id = ? WHERE id = ?',
    );
    foreach ($normalized['fillups'] as $row) {
        $stmt->execute([$row['station_choice_id'], $row['grade_choice_id'], $row['id']]);
    }
    if (!migration_constraint_exists($pdo, 'fk_fillups_station_choice')) {
        $pdo->exec(
            'ALTER TABLE fillups ADD INDEX by_station_choice (station_choice_id), ADD CONSTRAINT fk_fillups_station_choice FOREIGN KEY (station_choice_id) REFERENCES station_choices (id) ON UPDATE CASCADE ON DELETE RESTRICT',
        );
    }
    if (!migration_constraint_exists($pdo, 'fk_fillups_grade_choice')) {
        $pdo->exec(
            'ALTER TABLE fillups ADD INDEX by_grade_choice (grade_choice_id), ADD CONSTRAINT fk_fillups_grade_choice FOREIGN KEY (grade_choice_id) REFERENCES grade_choices (id) ON UPDATE CASCADE ON DELETE RESTRICT',
        );
    }
    foreach (['station', 'grade'] as $legacyColumn) {
        if (migration_column_exists($pdo, 'fillups', $legacyColumn)) {
            $pdo->exec('ALTER TABLE fillups DROP COLUMN ' . $legacyColumn);
        }
    }
    $pdo->exec(
        'RENAME TABLE settings TO settings_legacy_normalization, settings_normalized TO settings',
    );
    $pdo->exec('DROP TABLE IF EXISTS settings_legacy_normalization');
    migration_remove_notes($pdo, $backupDirectory);
    return $backup;
}

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit();
}
if (
    isset($_SERVER['SCRIPT_FILENAME']) &&
    is_string($_SERVER['SCRIPT_FILENAME']) &&
    realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__
) {
    try {
        $pdo = database();
        $backup = migrate_normalize($pdo, dirname(__DIR__) . '/artifacts');
        echo $backup === null
            ? "Database is already normalized.\n"
            : "Database normalized. Row backup: $backup\n";
    } catch (Throwable $error) {
        fwrite(STDERR, $error->getMessage() . "\n");
        exit(1);
    }
}
