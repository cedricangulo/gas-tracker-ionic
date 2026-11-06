<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';
cors();
$pdo = null;
try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'POST'], true)) {
        header('Allow: GET, POST, OPTIONS');
        throw new InputError(405, 'This action is not available.');
    }
    $pdo = database();
    if ($method === 'GET') {
        respond(200, ['success' => true, 'data' => get_settings($pdo)]);
    }
    $input = body();
    $operation = begin_mutation($pdo, $input);
    if (array_key_exists('stationRename', $input)) {
        rename_station($pdo, $input['stationRename']);
        finish_mutation($pdo, $operation, 200, [
            'success' => true,
            'message' => 'Station renamed.',
            'data' => get_settings($pdo),
        ]);
    }
    $settings = validate_settings($input);
    $max = query_statement($pdo, 'SELECT MAX(gauge_level) FROM fillups')->fetchColumn();
    if ($max !== null && $max !== false && (int) $max > $settings['gaugeSegments']) {
        throw new InputError(422, 'Validation failed.', [
            'gaugeSegments' =>
                'A saved fill-up has more gauge bars. Correct it before reducing segments.',
        ]);
    }
    $stmt = $pdo->prepare(
        'UPDATE settings SET name = ?, tank_capacity = ?, gauge_segments = ?, low_fuel_anchor = ?, factory_wmtc = ? WHERE id = 1',
    );
    $stmt->execute([
        $settings['name'],
        $settings['tankCapacity'],
        $settings['gaugeSegments'],
        $settings['lowFuelAnchor'],
        $settings['factoryWMTC'],
    ]);
    save_choice_catalog($pdo, 'station_choices', $settings['stations']);
    save_choice_catalog($pdo, 'grade_choices', $settings['grades']);
    finish_mutation($pdo, $operation, 200, [
        'success' => true,
        'message' => 'Settings saved.',
        'data' => $settings,
    ]);
} catch (Throwable $error) {
    api_error($error, $pdo);
}
