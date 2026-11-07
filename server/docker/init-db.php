<?php
declare(strict_types=1);

// Idempotent schema setup for the configured database (setup.sql uses IF NOT EXISTS / INSERT IGNORE).
// Skips the CREATE DATABASE / USE lines: setup.sql includes local CREATE DATABASE / USE statements, which are skipped here.
// Run: php /var/www/app/docker/init-db.php
require_once dirname(__DIR__) . '/api/helpers.php';

$pdo = database();
$pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
$name = $pdo->query('SELECT DATABASE()')->fetchColumn();
$sql = file_get_contents(dirname(__DIR__) . '/sql/setup.sql');
if ($sql === false) {
    fwrite(STDERR, "Cannot read setup.sql\n");
    exit(1);
}
$sql = preg_replace('/^\s*(CREATE DATABASE|USE)\b[^;]*;/mi', '', $sql);
$pdo->exec((string) $sql);
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
echo "Connected to database '{$name}' on " .
    configuration()['host'] .
    "\nTables: " .
    implode(', ', $tables) .
    "\n";
