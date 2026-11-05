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
        respond(403, ['success' => false, 'message' => 'Origin is not allowed.']);
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
        throw new InputError(415, 'Content-Type must be application/json.');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        throw new InputError(400, 'Request body is required.');
    }
    try {
        $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new InputError(400, 'Invalid JSON request body.');
    }
    if (!is_array($data) || array_is_list($data)) {
        throw new InputError(400, 'A JSON object is required.');
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
        throw new InputError(400, 'A valid UUID is required for ' . $field . '.');
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
            $key => $key . ' must be between ' . $min . ' and ' . $max . '.',
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
            !in_array(strtolower($name), array_map('strtolower', $result), true)
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
        throw new RuntimeException('Low-fuel anchor is required.');
    }
    $bars = number($data, 'gaugeSegments', 1, 20);
    if ($bars === null) {
        throw new RuntimeException('Gauge segments are required.');
    }
    if ($bars !== floor($bars)) {
        throw new InputError(422, 'Validation failed.', [
            'gaugeSegments' => 'Gauge segments must be a whole number.',
        ]);
    }
    if ($anchor >= $tank) {
        throw new InputError(422, 'Validation failed.', [
            'lowFuelAnchor' => 'Low-fuel anchor must be smaller than tank capacity.',
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
    $payload = query_statement($pdo, 'SELECT payload FROM settings WHERE id = 1')->fetchColumn();
    if (!is_string($payload)) {
        throw new RuntimeException('Import sql/setup.sql first.');
    }
    $settings = json_decode($payload, true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($settings)) {
        throw new RuntimeException('Invalid saved settings.');
    }
    return validate_settings(object_array($settings));
}

/** @param array<string, mixed> $data
 *  @param array<string, mixed> $settings
 *  @return array<string, mixed>
 */
function validate_fill(array $data, array $settings): array
{
    $date = $data['dateTime'] ?? null;
    if (
        !is_string($date) ||
        !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/D', $date)
    ) {
        throw new InputError(422, 'Validation failed.', [
            'dateTime' => 'Provide an ISO date-time with a timezone offset.',
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
        throw new InputError(422, 'Filled to full must be true or false.');
    }
    $lat = number($data, 'latitude', -90, 90, true);
    $lng = number($data, 'longitude', -180, 180, true);
    if (($lat === null) !== ($lng === null)) {
        throw new InputError(422, 'Both coordinates are required together.');
    }
    $notes = $data['notes'] ?? '';
    if (!is_string($notes) || strlen($notes) > 2000) {
        throw new InputError(422, 'Notes must be at most 2000 bytes.');
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
        'notes' => trim($notes),
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
        'notes' => db_string($row['notes']),
        'createdAt' => (int) db_number($row['created_at']),
    ];
}

/** @return list<array<string, mixed>> */
function get_fills(PDO $pdo): array
{
    $result = [];
    foreach (query_statement($pdo, 'SELECT * FROM fillups')->fetchAll() as $row) {
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
                'This operation ID was already used for a different request.',
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
        'message' =>
            'Database or server error. Start MySQL, import setup.sql, and check PHP configuration and logs.',
    ]);
}
