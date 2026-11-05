<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';
cors();
$pdo = null;
try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'POST'], true)) {
        header('Allow: GET, POST, OPTIONS');
        throw new InputError(405, 'Method not allowed.');
    }
    $pdo = database();
    if ($method === 'GET') {
        respond(200, ['success' => true, 'data' => get_settings($pdo)]);
    }
    $input = body();
    $operation = begin_mutation($pdo, $input);
    $settings = validate_settings($input);
    $max = query_statement($pdo, 'SELECT MAX(gauge_level) FROM fillups')->fetchColumn();
    if ($max !== null && $max !== false && (int) $max > $settings['gaugeSegments']) {
        throw new InputError(422, 'Validation failed.', [
            'gaugeSegments' =>
                'A saved fill-up has more gauge bars. Correct it before reducing segments.',
        ]);
    }
    $stmt = $pdo->prepare('UPDATE settings SET payload = ? WHERE id = 1');
    $stmt->execute([json_encode($settings, JSON_THROW_ON_ERROR)]);
    finish_mutation($pdo, $operation, 200, [
        'success' => true,
        'message' => 'Settings saved.',
        'data' => $settings,
    ]);
} catch (Throwable $error) {
    api_error($error, $pdo);
}
