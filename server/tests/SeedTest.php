<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__) . '/seed.php';

final class SeedTest extends TestCase
{
    private PDO $pdo;
    private PDO $admin;
    private string $databaseName;
    private string $backupDirectory;

    protected function setUp(): void
    {
        $config = configuration();
        $this->admin = database();
        $this->databaseName = 'gas_tracker_seed_test_' . bin2hex(random_bytes(8));
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
        $sql = file_get_contents(dirname(__DIR__) . '/sql/setup.sql');
        self::assertIsString($sql);
        $this->pdo->exec(str_replace('gas_tracker', $this->databaseName, $sql));
    }

    protected function tearDown(): void
    {
        if (
            isset($this->admin, $this->databaseName) &&
            preg_match('/^gas_tracker_seed_test_[a-f0-9]{16}$/D', $this->databaseName)
        ) {
            $this->admin->exec('DROP DATABASE ' . $this->databaseName);
        }
    }

    public function testFixturePreservesKnownReadings(): void
    {
        $fills = seed_validated_rows(get_settings($this->pdo));
        self::assertCount(42, $fills);
        self::assertEqualsWithDelta(6548.16, array_sum(array_column($fills, 'amount')), 0.001);
        self::assertSame($fills, seed_validated_rows(get_settings($this->pdo)));
        self::assertSame(2.7, $fills[0]['liters']);
        self::assertSame(10.0, $fills[0]['odometer']);
        self::assertSame('2026-09-28T15:20:00+08:00', $fills[29]['dateTime']);
        self::assertSame(4244.0, $fills[41]['odometer']);
        self::assertSame('2026-11-05T14:11:00+08:00', $fills[41]['dateTime']);
        foreach ($fills as $i => $fill) {
            self::assertArrayNotHasKey('notes', $fill);
            self::assertGreaterThan(0, $fill['liters']);
            self::assertContains($fill['station'], ['Uno Fuel', 'CLEANTECH', 'Petron']);
            self::assertNotNull($fill['latitude']);
            self::assertNotNull($fill['longitude']);
            if ($i > 0) {
                self::assertGreaterThan($fills[$i - 1]['odometer'], $fill['odometer']);
                self::assertGreaterThan($fills[$i - 1]['dateTime'], $fill['dateTime']);
            }
        }
    }

    public function testApplyIsRepeatableAndRestoreRecoversAllTables(): void
    {
        $this->pdo->exec(
            "INSERT INTO mutation_receipts (operation_id,fingerprint,status,payload) VALUES ('b7724ad8-13a5-4396-8423-ddbf4ba130ad',REPEAT('a',64),200,'{}')",
        );
        $before = seed_snapshot($this->pdo);
        $backup = seed_apply($this->pdo, $this->backupDirectory);
        self::assertFileExists($backup);
        $seeded = seed_snapshot($this->pdo);
        self::assertCount(42, $seeded['fillups']);
        self::assertSame([], $seeded['mutation_receipts']);
        self::assertCount(7, $seeded['station_choices']);
        self::assertCount(2, $seeded['grade_choices']);
        self::assertContains('CLEANTECH', get_settings($this->pdo)['stations']);
        self::assertContains('Shell', get_settings($this->pdo)['stations']);
        seed_apply($this->pdo, $this->backupDirectory);
        self::assertEquals($seeded, seed_snapshot($this->pdo));
        $preRestore = seed_apply(
            $this->pdo,
            $this->backupDirectory,
            seed_read_backup($this->pdo, $backup),
        );
        self::assertEquals($before, seed_snapshot($this->pdo));
        seed_apply($this->pdo, $this->backupDirectory, seed_read_backup($this->pdo, $preRestore));
        self::assertEquals($seeded, seed_snapshot($this->pdo));
    }

    public function testFailedInsertRollsBackDeletesAndSettings(): void
    {
        $before = seed_snapshot($this->pdo);
        $this->pdo->exec(
            "CREATE TRIGGER fail_seed BEFORE INSERT ON fillups FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='intentional seed failure'",
        );
        try {
            seed_apply($this->pdo, $this->backupDirectory);
            self::fail('Expected database failure.');
        } catch (PDOException $error) {
            self::assertStringContainsString('intentional seed failure', $error->getMessage());
        }
        self::assertFalse($this->pdo->inTransaction());
        self::assertEquals($before, seed_snapshot($this->pdo));
        self::assertNotEmpty(glob($this->backupDirectory . '/*.json'));
    }

    public function testBackupFailureLeavesDatabaseUnchanged(): void
    {
        $before = seed_snapshot($this->pdo);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Backup path is not a directory.');
        try {
            seed_apply($this->pdo, __FILE__);
        } finally {
            self::assertEquals($before, seed_snapshot($this->pdo));
            self::assertFalse($this->pdo->inTransaction());
        }
    }

    public function testRestoreRejectsWrongDatabaseBeforeWriting(): void
    {
        $before = seed_snapshot($this->pdo);
        $backup = seed_write_backup($this->pdo, $before, $this->backupDirectory);
        $raw = file_get_contents($backup);
        self::assertIsString($raw);
        file_put_contents($backup, str_replace($this->databaseName, 'unrelated_database', $raw));
        try {
            seed_read_backup($this->pdo, $backup);
            self::fail('Expected database mismatch.');
        } catch (RuntimeException $error) {
            self::assertStringContainsString('does not match', $error->getMessage());
        }
        self::assertEquals($before, seed_snapshot($this->pdo));
    }
}
