<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';
cors();
$pdo = null;
try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'POST', 'PUT', 'DELETE'], true)) {
        header('Allow: GET, POST, PUT, DELETE, OPTIONS');
        throw new InputError(405, 'Method not allowed.');
    }
    $pdo = database();
    if ($method === 'GET') {
        respond(200, ['success' => true, 'data' => get_fills($pdo)]);
    }
    $input = body();
    $operation = begin_mutation($pdo, $input);
    if ($method === 'DELETE') {
        $id = uuid($_GET['id'] ?? null);
        $stmt = $pdo->prepare('DELETE FROM fillups WHERE id = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) {
            throw new InputError(404, 'Fill-up not found.');
        }
        finish_mutation($pdo, $operation, 200, [
            'success' => true,
            'message' => 'Fill-up deleted.',
        ]);
    }
    $fill = validate_fill($input, get_settings($pdo));
    if ($method === 'PUT' && uuid($_GET['id'] ?? null) !== $fill['id']) {
        throw new InputError(400, 'Body ID must match the query ID.');
    }
    $existing = $pdo->prepare('SELECT created_at FROM fillups WHERE id = ?');
    $existing->execute([$fill['id']]);
    $createdAt = $existing->fetchColumn();
    if ($method === 'POST' && $createdAt !== false) {
        throw new InputError(409, 'Fill-up already exists.');
    }
    if ($method === 'PUT' && $createdAt === false) {
        throw new InputError(404, 'Fill-up not found.');
    }
    if ($createdAt !== false) {
        $fill['createdAt'] = (int) $createdAt;
    }
    validate_placement(get_fills($pdo), $fill);
    $values = [
        $fill['amount'],
        $fill['liters'],
        $fill['odometer'],
        $fill['dateTime'],
        $fill['station'],
        $fill['grade'],
        $fill['gaugeLevel'],
        $fill['filledToFull'] ? 1 : 0,
        $fill['latitude'],
        $fill['longitude'],
        $fill['notes'],
        $fill['createdAt'],
        $fill['id'],
    ];
    $sql =
        $method === 'POST'
            ? 'INSERT INTO fillups (amount, liters, odometer, date_time, station, grade, gauge_level, filled_to_full, latitude, longitude, notes, created_at, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            : 'UPDATE fillups SET amount=?, liters=?, odometer=?, date_time=?, station=?, grade=?, gauge_level=?, filled_to_full=?, latitude=?, longitude=?, notes=?, created_at=? WHERE id=?';
    $pdo->prepare($sql)->execute($values);
    finish_mutation($pdo, $operation, $method === 'POST' ? 201 : 200, [
        'success' => true,
        'message' => $method === 'POST' ? 'Fill-up created.' : 'Fill-up updated.',
        'data' => $fill,
    ]);
} catch (Throwable $error) {
    api_error($error, $pdo);
}
