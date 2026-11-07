<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__) . '/migrate.php';

final class MigrationTest extends TestCase
{
    private PDO $admin;
    private PDO $pdo;
    private string $databaseName;
    private string $backupDirectory;

    protected function setUp(): void
    {
        $config = configuration();
        $this->admin = database();
        $this->databaseName = 'gas_tracker_migration_test_' . bin2hex(random_bytes(8));
        $this->backupDirectory = dirname(__DIR__, 2) . '/artifacts/' . $this->databaseName;
        $this->admin->exec(
            'CREATE DATABASE ' .
                $this->databaseName .
                ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
        );
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config['host'],
            $config['port'],
            $this->databaseName,
        );
        $this->pdo = new PDO($dsn, $config['username'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $this->pdo->exec(
            'CREATE TABLE settings (id TINYINT UNSIGNED PRIMARY KEY, payload JSON NOT NULL) ENGINE=InnoDB',
        );
        $this->pdo->exec("CREATE TABLE fillups (
            id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
            amount DECIMAL(10,2) NOT NULL, liters DECIMAL(10,3) NULL, odometer DECIMAL(12,1) NULL,
            date_time VARCHAR(35) NOT NULL, station VARCHAR(80) NULL, grade VARCHAR(80) NULL,
            gauge_level TINYINT UNSIGNED NULL, filled_to_full BOOLEAN NOT NULL DEFAULT FALSE,
            latitude DECIMAL(10,7) NULL, longitude DECIMAL(11,7) NULL, notes VARCHAR(2000) NOT NULL DEFAULT '',
            created_at BIGINT UNSIGNED NOT NULL, INDEX by_date_time (date_time)
        ) ENGINE=InnoDB");
        $this->pdo->exec("CREATE TABLE mutation_receipts (
            operation_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
            fingerprint CHAR(64) CHARACTER SET ascii NOT NULL, status SMALLINT UNSIGNED NOT NULL,
            payload JSON NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB");
        $this->pdo->exec(
            "INSERT INTO settings VALUES (1, '{\"name\":\"Honda Click 125i V4\",\"tankCapacity\":5.5,\"gaugeSegments\":6,\"lowFuelAnchor\":1.2,\"factoryWMTC\":50,\"stations\":[\"Uno\",\"Shell\"],\"grades\":[\"Unleaded\",\"Premium\"]}')",
        );
        $stmt = $this->pdo->prepare(
            'INSERT INTO fillups VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );
        $stmt->execute([
            '11111111-1111-4111-8111-111111111111',
            200,
            4,
            1000,
            '2026-11-01T10:00:00+08:00',
            'Uno',
            'Unleaded',
            5,
            1,
            15.1,
            120.1,
            'kept',
            10,
        ]);
        $stmt->execute([
            '22222222-2222-4222-8222-222222222222',
            150,
            null,
            null,
            '2026-11-02T10:00:00+08:00',
            'Uno Fuel',
            null,
            null,
            0,
            null,
            null,
            '',
            20,
        ]);
        $stmt->execute([
            '44444444-4444-4444-8444-444444444444',
            175,
            null,
            null,
            '2026-11-03T10:00:00+08:00',
            'Café',
            null,
            null,
            0,
            null,
            null,
            'accent distinct',
            30,
        ]);
        $this->pdo->exec(
            "UPDATE settings SET payload = JSON_SET(payload, '$.stations', JSON_ARRAY('Cafe', 'Shell')) WHERE id = 1",
        );
        $this->pdo->exec(
            "INSERT INTO mutation_receipts (operation_id,fingerprint,status,payload) VALUES ('33333333-3333-4333-8333-333333333333',REPEAT('a',64),200,'{}')",
        );
    }

    protected function tearDown(): void
    {
        $this->admin->exec('DROP DATABASE ' . $this->databaseName);
        foreach (glob($this->backupDirectory . '/*') ?: [] as $path) {
            unlink($path);
        }
        if (is_dir($this->backupDirectory)) {
            rmdir($this->backupDirectory);
        }
    }

    public function testMigrationPreservesSettingsFillupsAndReceiptsAndCanBeRerun(): void
    {
        $backup = migrate_normalize($this->pdo, $this->backupDirectory);
        self::assertIsString($backup);
        self::assertFileExists($backup);
        self::assertSame('Honda Click 125i V4', get_settings($this->pdo)['name']);
        self::assertSame(['Cafe', 'Shell'], get_settings($this->pdo)['stations']);
        self::assertSame(['Unleaded', 'Premium'], get_settings($this->pdo)['grades']);
        $fills = get_fills($this->pdo);
        self::assertCount(3, $fills);
        self::assertSame('Uno', $fills[0]['station']);
        self::assertSame('Unleaded', $fills[0]['grade']);
        self::assertArrayNotHasKey('notes', $fills[0]);
        self::assertNull($fills[1]['grade']);
        self::assertSame('Uno Fuel', $fills[1]['station']);
        self::assertSame('Café', $fills[2]['station']);
        self::assertContains('Cafe', get_settings($this->pdo)['stations']);
        self::assertCount(1, seed_snapshot($this->pdo)['mutation_receipts']);
        self::assertNull(migrate_normalize($this->pdo, $this->backupDirectory));
        self::assertFalse(migration_column_exists($this->pdo, 'fillups', 'notes'));
        self::assertCount(3, get_fills($this->pdo));
        $this->expectException(PDOException::class);
        $this->pdo->exec("DELETE FROM station_choices WHERE name = 'Uno'");
    }

    public function testNormalizedNotesRemovalPreservesArchivesAndWritesRawBackup(): void
    {
        migrate_normalize($this->pdo, $this->backupDirectory);
        $this->pdo->exec("ALTER TABLE fillups ADD COLUMN notes VARCHAR(2000) NOT NULL DEFAULT ''");
        $this->pdo->exec(
            "UPDATE fillups SET notes = 'retired text', archived_at = '2026-11-06 12:00:00' WHERE id = '11111111-1111-4111-8111-111111111111'",
        );
        $backup = migrate_normalize($this->pdo, $this->backupDirectory);
        self::assertIsString($backup);
        $raw = json_decode((string) file_get_contents($backup), true, 64, JSON_THROW_ON_ERROR);
        self::assertSame(2, $raw['version']);
        self::assertContains('retired text', array_column($raw['tables']['fillups'], 'notes'));
        self::assertFalse(migration_column_exists($this->pdo, 'fillups', 'notes'));
        $restored = seed_read_backup($this->pdo, $backup);
        seed_replace($this->pdo, $restored);
        self::assertCount(3, seed_snapshot($this->pdo)['fillups']);
        self::assertCount(2, get_fills($this->pdo));
        self::assertSame(
            '2026-11-06 12:00:00',
            $this->pdo
                ->query(
                    "SELECT archived_at FROM fillups WHERE id = '11111111-1111-4111-8111-111111111111'",
                )
                ->fetchColumn(),
        );
    }

    public function testReceiptOnlyNotesCleanupIsBackedUpAndIdempotent(): void
    {
        migrate_normalize($this->pdo, $this->backupDirectory);
        $payload =
            '{"success":true,"data":{"id":"kept","notes":"retired receipt text","amount":123},"extra":{}}';
        $stmt = $this->pdo->prepare('UPDATE mutation_receipts SET payload = ?');
        $stmt->execute([$payload]);
        $before = query_statement($this->pdo, 'SELECT * FROM mutation_receipts')->fetch();
        $backup = migration_remove_notes($this->pdo, $this->backupDirectory);
        self::assertIsString($backup);
        $raw = json_decode((string) file_get_contents($backup), true, 64, JSON_THROW_ON_ERROR);
        self::assertSame($payload, $raw['tables']['mutation_receipts'][0]['payload']);
        $after = query_statement($this->pdo, 'SELECT * FROM mutation_receipts')->fetch();
        self::assertSame($before['operation_id'], $after['operation_id']);
        self::assertSame($before['fingerprint'], $after['fingerprint']);
        self::assertSame($before['status'], $after['status']);
        self::assertSame($before['created_at'], $after['created_at']);
        $clean = json_decode($after['payload'], true, 64, JSON_THROW_ON_ERROR);
        self::assertArrayNotHasKey('notes', $clean['data']);
        self::assertSame(123, $clean['data']['amount']);
        self::assertNull(migration_remove_notes($this->pdo, $this->backupDirectory));
        // Version 2 restores remove the same path while retaining receipt identity and objects.
        $restored = seed_read_backup($this->pdo, $backup)['mutation_receipts'][0];
        self::assertSame($before['operation_id'], $restored['operation_id']);
        self::assertSame($before['fingerprint'], $restored['fingerprint']);
        self::assertSame(
            '{"success":true,"data":{"id":"kept","amount":123},"extra":{}}',
            $restored['payload'],
        );
    }

    public function testMigrationCanResumeAfterAnInterruptedDataBackfill(): void
    {
        $this->pdo->exec(
            "CREATE TRIGGER pause_normalization BEFORE UPDATE ON fillups FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='pause migration'",
        );
        try {
            migrate_normalize($this->pdo, $this->backupDirectory);
            self::fail('Expected an interrupted migration.');
        } catch (PDOException $error) {
            self::assertStringContainsString('pause migration', $error->getMessage());
        }
        $this->pdo->exec('DROP TRIGGER pause_normalization');
        $backup = migrate_normalize($this->pdo, $this->backupDirectory);
        self::assertIsString($backup);
        self::assertSame('Uno', get_fills($this->pdo)[0]['station']);
        self::assertSame('Unleaded', get_fills($this->pdo)[0]['grade']);
        self::assertCount(3, get_fills($this->pdo));
    }

    public function testLegacySeedBackupRestoresIntoNormalizedTables(): void
    {
        $this->pdo->exec(
            "UPDATE mutation_receipts SET payload = '{\"success\":true,\"data\":{\"notes\":\"legacy text\",\"id\":\"kept\"}}'",
        );
        $backup = migrate_normalize($this->pdo, $this->backupDirectory);
        self::assertIsString($backup);
        $expected = seed_snapshot($this->pdo);
        seed_replace($this->pdo, seed_read_backup($this->pdo, $backup));
        self::assertEquals($expected, seed_snapshot($this->pdo));
        $payload = json_decode(
            $expected['mutation_receipts'][0]['payload'],
            true,
            64,
            JSON_THROW_ON_ERROR,
        );
        self::assertSame(['id' => 'kept'], $payload['data']);
    }
}
