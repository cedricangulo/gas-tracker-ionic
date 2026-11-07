<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';
cors();
$pdo = null;
try {
    $method = server_value('REQUEST_METHOD');
    if ($method === 'GET') {
        $authenticated = has_authenticated_session();
        respond(200, [
            'success' => true,
            'data' => ['authenticated' => $authenticated, 'csrfToken' => csrf_token()],
        ]);
    }
    if ($method !== 'POST') {
        header('Allow: GET, POST, OPTIONS');
        throw new InputError(405, 'This action is not available.');
    }
    start_auth_session();
    require_csrf();
    $input = body();
    $action = $input['action'] ?? null;
    if ($action === 'logout') {
        $_SESSION = [];
        if (!session_regenerate_id(true)) {
            throw new RuntimeException('Could not end the session.');
        }
        $token = csrf_token();
        respond(200, [
            'success' => true,
            'data' => ['authenticated' => false, 'csrfToken' => $token],
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
    if (!session_regenerate_id(true)) {
        throw new RuntimeException('Could not secure the session.');
    }
    $_SESSION['authenticated'] = true;
    $_SESSION['expires_at'] = time() + 43200;
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    respond(200, [
        'success' => true,
        'data' => ['authenticated' => true, 'csrfToken' => $_SESSION['csrf_token']],
    ]);
} catch (Throwable $error) {
    api_error($error, $pdo);
}
