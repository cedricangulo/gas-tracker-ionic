<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

final class InputError extends RuntimeException
{
    /** @param array<string, string> $fields */
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly array $fields = [],
    ) {
        parent::__construct($message);
    }
}

/** @param array<string, mixed> $payload */
function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR,
    );
    exit();
}

function server_value(string $key, string $fallback = ''): string
{
    $value = $_SERVER[$key] ?? $fallback;
    return is_string($value) ? $value : $fallback;
}

/** @return array<string, mixed> */
function object_array(mixed $value): array
{
    if (!is_array($value)) {
        throw new RuntimeException('Expected an object.');
    }
    $result = [];
    foreach ($value as $key => $item) {
        if (!is_string($key)) {
            throw new RuntimeException('Expected named object fields.');
        }
        $result[$key] = $item;
    }
    return $result;
}

function query_statement(PDO $pdo, string $sql): PDOStatement
{
    $statement = $pdo->query($sql);
    if ($statement === false) {
        throw new RuntimeException('Database query failed.');
    }
    return $statement;
}

function db_string(mixed $value): string
{
    if (!is_string($value)) {
        throw new RuntimeException('Invalid stored string.');
    }
    return $value;
}

function db_number(mixed $value): float
{
    if (
        (!is_int($value) && !is_float($value) && !(is_string($value) && is_numeric($value))) ||
        !is_finite((float) $value)
    ) {
        throw new RuntimeException('Invalid stored number.');
    }
    return (float) $value;
}

function cors(): void
{
    $config = configuration();
    $origin = server_value('HTTP_ORIGIN');
    $allowed = $config['allowed_origins'];
    if ($origin !== '' && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    if (
        $origin !== '' &&
        !in_array($origin, $allowed, true) &&
        in_array(server_value('REQUEST_METHOD'), ['POST', 'PUT', 'DELETE'], true)
    ) {
        respond(403, [
            'success' => false,
            'message' => 'This app cannot connect from this address.',
        ]);
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    if (server_value('REQUEST_METHOD') === 'OPTIONS') {
        http_response_code(204);
        exit();
    }
}

/** @return array<string, mixed> */
function body(): array
{
    $contentType = strtolower(trim(explode(';', server_value('CONTENT_TYPE'))[0]));
    if ($contentType !== 'application/json') {
        throw new InputError(415, 'The save request could not be read. Please try again.');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        throw new InputError(400, 'No changes were received. Please try again.');
    }
    try {
        $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new InputError(400, 'The save request could not be read. Please try again.');
    }
    if (!is_array($data) || array_is_list($data)) {
        throw new InputError(400, 'The save request could not be read. Please try again.');
    }
    return object_array($data);
}

function uuid(mixed $value, string $field = 'id'): string
{
    if (
        !is_string($value) ||
        !preg_match(
            '/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iD',
            $value,
        )
    ) {
        throw new InputError(400, 'This record could not be identified. Refresh and try again.');
    }
    return strtolower($value);
}

/** @param array<string, mixed> $data */
function number(array $data, string $key, float $min, float $max, bool $optional = false): ?float
{
    $value = $data[$key] ?? null;
    if ($optional && $value === null) {
        return null;
    }
    if (
        (!is_int($value) && !is_float($value)) ||
        !is_finite((float) $value) ||
        $value < $min ||
        $value > $max
    ) {
        throw new InputError(422, 'Validation failed.', [
            $key =>
                match ($key) {
                    'tankCapacity' => 'Tank capacity',
                    'lowFuelAnchor' => 'Fuel remaining at E',
                    'gaugeSegments' => 'Fuel gauge bars',
                    'factoryWMTC' => 'Factory fuel economy',
                    'gaugeLevel' => 'Fuel gauge reading',
                    'createdAt' => 'Recorded time',
                    'latitude', 'longitude' => 'Location',
                    default => ucfirst($key),
                } .
                ' must be between ' .
                $min .
                ' and ' .
                $max .
                '.',
        ]);
    }
    return (float) $value;
}

function text(mixed $value, string $key, int $max, bool $optional = false): ?string
{
    if ($optional && ($value === null || $value === '')) {
        return null;
    }
    if (!is_string($value) || strlen($value) > $max || (!$optional && trim($value) === '')) {
        throw new InputError(422, 'Validation failed.', [
            $key => 'Enter a valid ' . $key . ' (maximum ' . $max . ' bytes).',
        ]);
    }
    return trim($value);
}

/** @return list<string> */
function catalog(mixed $value, string $key): array
{
    if (!is_array($value) || !array_is_list($value) || count($value) > 100) {
        throw new InputError(422, 'Validation failed.', [
            $key => 'Provide a list of up to 100 names.',
        ]);
    }
    $result = [];
    foreach ($value as $item) {
        $name = text($item, $key, 80);
        if (
            $name !== null &&
            !in_array(
                mb_strtolower($name, 'UTF-8'),
                array_map(
                    static fn(string $item): string => mb_strtolower($item, 'UTF-8'),
                    $result,
                ),
                true,
            )
        ) {
            $result[] = $name;
        }
    }
    return $result;
}

/** @param array<string, mixed> $data
 *  @return array{name: string, tankCapacity: float, gaugeSegments: int, lowFuelAnchor: float, factoryWMTC: float, stations: list<string>, grades: list<string>}
 */
function validate_settings(array $data): array
{
    $tank = number($data, 'tankCapacity', 0.1, 1000);
    if ($tank === null) {
        throw new RuntimeException('Tank capacity is required.');
    }
    $anchor = number($data, 'lowFuelAnchor', 0, 999);
    if ($anchor === null) {
        throw new RuntimeException('Fuel remaining at E is required.');
    }
    $bars = number($data, 'gaugeSegments', 1, 20);
    if ($bars === null) {
        throw new RuntimeException('Gauge segments are required.');
    }
    if ($bars !== floor($bars)) {
        throw new InputError(422, 'Validation failed.', [
            'gaugeSegments' => 'Fuel gauge bars must be a whole number.',
        ]);
    }
    if ($anchor >= $tank) {
        throw new InputError(422, 'Validation failed.', [
            'lowFuelAnchor' => 'Fuel remaining at E must be smaller than tank capacity.',
        ]);
    }
    if (round($anchor, 3) >= round($tank, 2)) {
        throw new InputError(422, 'Validation failed.', [
            'lowFuelAnchor' =>
                'Fuel remaining at E must be smaller than tank capacity after rounding.',
        ]);
    }
    $name = text($data['name'] ?? null, 'bike name', 100);
    $wmtc = number($data, 'factoryWMTC', 0.1, 300);
    if ($name === null || $wmtc === null) {
        throw new RuntimeException('Bike name and benchmark are required.');
    }
    return [
        'name' => $name,
        'tankCapacity' => $tank,
        'gaugeSegments' => (int) $bars,
        'lowFuelAnchor' => $anchor,
        'factoryWMTC' => $wmtc,
        'stations' => catalog($data['stations'] ?? [], 'stations'),
        'grades' => catalog($data['grades'] ?? [], 'grades'),
    ];
}

/** @return array{name: string, tankCapacity: float, gaugeSegments: int, lowFuelAnchor: float, factoryWMTC: float, stations: list<string>, grades: list<string>} */
function get_settings(PDO $pdo): array
{
    $row = query_statement(
        $pdo,
        'SELECT name, tank_capacity, gauge_segments, low_fuel_anchor, factory_wmtc FROM settings WHERE id = 1',
    )->fetch();
    if (!is_array($row)) {
        throw new RuntimeException('Import sql/setup.sql first.');
    }
    $catalog = static function (PDO $pdo, string $table): array {
        if (!in_array($table, ['station_choices', 'grade_choices'], true)) {
            throw new RuntimeException('Invalid choice catalog.');
        }
        $result = [];
        foreach (
            query_statement(
                $pdo,
                'SELECT name FROM ' . $table . ' WHERE is_active = 1 ORDER BY sort_order, id',
            )->fetchAll()
            as $choice
        ) {
            $result[] = db_string($choice['name']);
        }
        return $result;
    };
    return validate_settings([
        'name' => db_string($row['name']),
        'tankCapacity' => db_number($row['tank_capacity']),
        'gaugeSegments' => (int) db_number($row['gauge_segments']),
        'lowFuelAnchor' => db_number($row['low_fuel_anchor']),
        'factoryWMTC' => db_number($row['factory_wmtc']),
        'stations' => $catalog($pdo, 'station_choices'),
        'grades' => $catalog($pdo, 'grade_choices'),
    ]);
}

/** Rename one station without replacing its identity, activation or historical references. */
function rename_station(PDO $pdo, mixed $rename): void
{
    if (!is_array($rename) || array_is_list($rename)) {
        throw new InputError(422, 'Choose a station and enter its new name.');
    }
    $fromValue = $rename['from'] ?? null;
    $toValue = $rename['to'] ?? null;
    if (!is_string($fromValue) || !is_string($toValue)) {
        throw new InputError(422, 'Enter a station name.');
    }
    $from = trim($fromValue);
    $to = trim($toValue);
    if ($from === '' || $to === '') {
        throw new InputError(422, 'Enter a station name.');
    }
    if (strlen($from) > 80 || strlen($to) > 80) {
        throw new InputError(422, 'Enter a shorter station name.');
    }
    $find = $pdo->prepare('SELECT id FROM station_choices WHERE name = ?');
    $find->execute([$from]);
    $id = $find->fetchColumn();
    if ($id === false) {
        throw new InputError(404, 'Station not found.');
    }
    if ($from === $to) {
        return;
    }
    $duplicate = $pdo->prepare(
        'SELECT id FROM station_choices WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1',
    );
    $duplicate->execute([$to, $id]);
    if ($duplicate->fetchColumn() !== false) {
        throw new InputError(422, 'A station with that name already exists.');
    }
    $update = $pdo->prepare('UPDATE station_choices SET name = ? WHERE id = ?');
    $update->execute([$to, $id]);
}

/** Persist selectable names while retaining retired values referenced by past fill-ups.
 *  @param list<string> $names
 */
function save_choice_catalog(PDO $pdo, string $table, array $names): void
{
    if (!in_array($table, ['station_choices', 'grade_choices'], true)) {
        throw new RuntimeException('Invalid choice catalog.');
    }
    query_statement($pdo, 'UPDATE ' . $table . ' SET is_active = 0')->execute();
    $stmt = $pdo->prepare(
        'INSERT INTO ' .
            $table .
            ' (name, is_active, sort_order) VALUES (?, 1, ?) ON DUPLICATE KEY UPDATE is_active = 1, sort_order = VALUES(sort_order)',
    );
    foreach ($names as $index => $name) {
        $stmt->execute([$name, $index]);
    }
}

/** Resolve a display name to its normalized choice row, retaining its spelling.
 *  @param 'station_choices'|'grade_choices' $table
 */
function choice_id(PDO $pdo, string $table, ?string $name): ?int
{
    if ($name === null) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT id FROM ' . $table . ' WHERE name = ?');
    $stmt->execute([$name]);
    $id = $stmt->fetchColumn();
    if ($id !== false) {
        return (int) $id;
    }
    $insert = $pdo->prepare(
        'INSERT INTO ' . $table . ' (name, is_active, sort_order) VALUES (?, 0, 65535)',
    );
    $insert->execute([$name]);
    return (int) $pdo->lastInsertId();
}

/** @param array<string, mixed> $data
 *  @param array<string, mixed> $settings
 *  @return array{id: string, amount: float, liters: float|null, odometer: float|null, dateTime: string, station: string|null, grade: string|null, gaugeLevel: int|null, filledToFull: bool, latitude: float|null, longitude: float|null, createdAt: int}
 */
function validate_fill(array $data, array $settings): array
{
    $date = $data['dateTime'] ?? null;
    if (
        !is_string($date) ||
        !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/D', $date)
    ) {
        throw new InputError(422, 'Validation failed.', [
            'dateTime' => 'Enter a valid date and time.',
        ]);
    }
    try {
        $parsed = new DateTimeImmutable($date);
    } catch (Exception) {
        throw new InputError(422, 'Invalid date-time.');
    }
    if ($parsed->format('Y-m-d\TH:i:s') !== substr($date, 0, 19)) {
        throw new InputError(422, 'Validation failed.', [
            'dateTime' => 'The date or time does not exist.',
        ]);
    }
    $gauge = number($data, 'gaugeLevel', 0, db_number($settings['gaugeSegments']), true);
    if ($gauge !== null && $gauge !== floor($gauge)) {
        throw new InputError(422, 'Gauge reading must be a whole number.');
    }
    if (!isset($data['filledToFull']) || !is_bool($data['filledToFull'])) {
        throw new InputError(422, 'Choose whether the tank was filled to full.');
    }
    $lat = number($data, 'latitude', -90, 90, true);
    $lng = number($data, 'longitude', -180, 180, true);
    if (($lat === null) !== ($lng === null)) {
        throw new InputError(422, 'Both coordinates are required together.');
    }
    return [
        'id' => uuid($data['id'] ?? null),
        'amount' => round(number($data, 'amount', 0.01, 99999999) ?? 0, 2),
        'liters' => number($data, 'liters', 0.001, 99999, true),
        'odometer' => number($data, 'odometer', 0, 999999999, true),
        'dateTime' => $date,
        'station' => text($data['station'] ?? null, 'station', 80, true),
        'grade' => text($data['grade'] ?? null, 'grade', 80, true),
        'gaugeLevel' => $gauge === null ? null : (int) $gauge,
        'filledToFull' => $data['filledToFull'],
        'latitude' => $lat,
        'longitude' => $lng,

        'createdAt' => (int) (number($data, 'createdAt', 1, 9007199254740991) ?? 0),
    ];
}

/** @param array<string, mixed> $row
 *  @return array<string, mixed>
 */
function fill_dto(array $row): array
{
    $floatOrNull = static fn(mixed $v): ?float => $v === null ? null : db_number($v);
    return [
        'id' => db_string($row['id']),
        'amount' => db_number($row['amount']),
        'liters' => $floatOrNull($row['liters']),
        'odometer' => $floatOrNull($row['odometer']),
        'dateTime' => db_string($row['date_time']),
        'station' => $row['station'],
        'grade' => $row['grade'],
        'gaugeLevel' => $row['gauge_level'] === null ? null : (int) db_number($row['gauge_level']),
        'filledToFull' => db_number($row['filled_to_full']) === 1.0,
        'latitude' => $floatOrNull($row['latitude']),
        'longitude' => $floatOrNull($row['longitude']),

        'createdAt' => (int) db_number($row['created_at']),
    ];
}

/** @return list<array<string, mixed>> */
function get_fills(PDO $pdo): array
{
    $result = [];
    $sql =
        'SELECT f.id, f.amount, f.liters, f.odometer, f.date_time, s.name AS station, g.name AS grade, f.gauge_level, f.filled_to_full, f.latitude, f.longitude, f.created_at FROM fillups f LEFT JOIN station_choices s ON s.id = f.station_choice_id LEFT JOIN grade_choices g ON g.id = f.grade_choice_id WHERE f.archived_at IS NULL';
    foreach (query_statement($pdo, $sql)->fetchAll() as $row) {
        $result[] = fill_dto(object_array($row));
    }
    return $result;
}

/** @param list<array<string, mixed>> $rows
 *  @param array<string, mixed> $candidate
 */
function validate_placement(array $rows, array $candidate): void
{
    if ($candidate['odometer'] === null) {
        return;
    }
    $rows = array_values(
        array_filter(
            $rows,
            static fn(array $f): bool => $f['id'] !== $candidate['id'] && $f['odometer'] !== null,
        ),
    );
    $rows[] = $candidate;
    usort($rows, static function (array $a, array $b): int {
        return new DateTimeImmutable(db_string($a['dateTime'])) <=>
        new DateTimeImmutable(db_string($b['dateTime'])) ?:
            $a['createdAt'] <=> $b['createdAt'] ?:
            strcmp(db_string($a['id']), db_string($b['id']));
    });
    foreach ($rows as $i => $row) {
        if ($row['id'] !== $candidate['id']) {
            continue;
        }
        if ($i > 0 && $candidate['odometer'] <= $rows[$i - 1]['odometer']) {
            throw new InputError(422, 'Validation failed.', [
                'odometer' => 'Odometer must be higher than the previous reading.',
            ]);
        }
        if ($i < count($rows) - 1 && $candidate['odometer'] >= $rows[$i + 1]['odometer']) {
            throw new InputError(422, 'Validation failed.', [
                'odometer' => 'Odometer must be lower than the next reading.',
            ]);
        }
    }
}

/** @param array<string, mixed> $input */
function begin_mutation(PDO $pdo, array $input): string
{
    $operation = uuid($input['operationId'] ?? null, 'operationId');
    $pdo->beginTransaction();
    // One personal dataset: serializing writes keeps placement checks and retries atomic.
    query_statement($pdo, 'SELECT id FROM settings WHERE id = 1 FOR UPDATE')->fetch();
    $stmt = $pdo->prepare(
        'SELECT status, payload, fingerprint FROM mutation_receipts WHERE operation_id = ?',
    );
    $stmt->execute([$operation]);
    $receipt = $stmt->fetch();
    if (is_array($receipt)) {
        if (!hash_equals(db_string($receipt['fingerprint']), request_fingerprint())) {
            $pdo->rollBack();
            throw new InputError(
                409,
                'This change conflicts with an earlier save. Refresh and try again.',
            );
        }
        $pdo->commit();
        $payload = json_decode(db_string($receipt['payload']), true, 32, JSON_THROW_ON_ERROR);
        respond((int) db_number($receipt['status']), object_array($payload));
    }
    return $operation;
}

function request_fingerprint(): string
{
    return hash(
        'sha256',
        server_value('REQUEST_METHOD') .
            ' ' .
            server_value('REQUEST_URI') .
            ' ' .
            file_get_contents('php://input'),
    );
}

/** @param array<string, mixed> $payload */
function finish_mutation(PDO $pdo, string $operation, int $status, array $payload): never
{
    $stmt = $pdo->prepare(
        'INSERT INTO mutation_receipts (operation_id, fingerprint, status, payload) VALUES (?, ?, ?, ?)',
    );
    $stmt->execute([
        $operation,
        request_fingerprint(),
        $status,
        json_encode($payload, JSON_THROW_ON_ERROR),
    ]);
    $pdo->commit();
    respond($status, $payload);
}

function api_error(Throwable $error, ?PDO $pdo): never
{
    if ($pdo !== null && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($error instanceof InputError) {
        $payload = ['success' => false, 'message' => $error->getMessage()];
        if ($error->fields !== []) {
            $payload['errors'] = $error->fields;
        }
        respond($error->status, $payload);
    }
    error_log('Gas Tracker API: ' . $error->getMessage());
    respond(500, [
        'success' => false,
        'message' => 'Could not save or load your tracker. Please try again shortly.',
    ]);
}
