<?php
declare(strict_types=1);
// Copy to config.local.php. These defaults match a fresh LOCAL XAMPP installation.
// Never use the XAMPP root account on an exposed production database.
return [
    'host' => '127.0.0.1',
    'port' => 3306,
    'database' => 'gas_tracker',
    'username' => 'root',
    'password' => '',
    // Set one shared account and a password_hash(); never store the plain password here.
    'account_username' => 'owner',
    'account_password_hash' => '',
    // Require HTTPS for all API requests. Local XAMPP defaults to false.
    'require_https' => false,
    'allowed_origins' => [
        'http://localhost:8100',
        'http://127.0.0.1:8100',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
        'http://localhost',
        'https://localhost',
        'capacitor://localhost',
    ],
];
