<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';
cors();
$pdo = null;
try {
    $method = server_value('REQUEST_METHOD');
    if ($method === 'GET') {
        $pdo = database();
        $authenticated = has_authenticated_token($pdo);
        respond(200, [
            'success' => true,
            'data' => ['authenticated' => $authenticated],
        ]);
    }
    if ($method !== 'POST') {
        header('Allow: GET, POST, OPTIONS');
        throw new InputError(405, 'This action is not available.');
    }
    $input = body();
    $action = $input['action'] ?? null;
    if ($action === 'logout') {
        $pdo = database();
        revoke_access_token($pdo);
        respond(200, [
            'success' => true,
            'data' => ['authenticated' => false],
        ]);
    }
    if ($action !== 'login') {
        throw new InputError(400, 'Enter your account details and try again.');
    }
    $config = configuration();
    $hash = $config['account_password_hash'];
    if ($hash === '' || password_get_info($hash)['algoName'] === 'unknown') {
        throw new InputError(503, 'Sign-in has not been set up yet.');
    }
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    if (!is_string($username) || !is_string($password) || strlen($password) > 1024) {
        throw new InputError(401, 'The username or password is incorrect.');
    }
    $pdo = database();
    $clientKey = login_client_key();
    assert_login_allowed($pdo, $clientKey);
    $usernameMatches = hash_equals($config['account_username'], $username);
    $passwordMatches = password_verify($password, $hash);
    if (!$usernameMatches || !$passwordMatches) {
        record_login_attempt($pdo, $clientKey, false);
        throw new InputError(401, 'The username or password is incorrect.');
    }
    record_login_attempt($pdo, $clientKey, true);
    $token = issue_access_token($pdo);
    respond(200, [
        'success' => true,
        'data' => ['authenticated' => true, 'accessToken' => $token],
    ]);
} catch (Throwable $error) {
    api_error($error, $pdo);
}
