<?php
declare(strict_types=1);

/** @param array<array-key, mixed> $config */
function config_string(array $config, string $key): string
{
    $value = $config[$key] ?? null;
    if (!is_string($value)) {
        throw new RuntimeException('Invalid database configuration: ' . $key);
    }
    return $value;
}

/** @return array{host: string, port: int, database: string, username: string, password: string, allowed_origins: list<string>} */
function configuration(): array
{
    $path = dirname(__DIR__) . '/config.local.php';
    $config = require is_file($path) ? $path : dirname(__DIR__) . '/config.example.php';
    if (!is_array($config)) {
        throw new RuntimeException('Invalid database configuration.');
    }
    $override = getenv('GAS_TRACKER_DB');
    if ($override !== false && $override !== '') {
        $config['database'] = $override;
    }
    $port = $config['port'] ?? 3306;
    if (!is_int($port) || $port < 1 || $port > 65535) {
        throw new RuntimeException('Invalid database port.');
    }
    $origins = $config['allowed_origins'] ?? [];
    if (!is_array($origins) || !array_is_list($origins)) {
        throw new RuntimeException('Invalid allowed origins.');
    }
    $allowed = [];
    foreach ($origins as $origin) {
        if (!is_string($origin)) {
            throw new RuntimeException('Allowed origins must be strings.');
        }
        $allowed[] = $origin;
    }
    return [
        'host' => config_string($config, 'host'),
        'port' => $port,
        'database' => config_string($config, 'database'),
        'username' => config_string($config, 'username'),
        'password' => config_string($config, 'password'),
        'allowed_origins' => $allowed,
    ];
}

function database(): PDO
{
    $config = configuration();
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database'],
    );
    return new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
