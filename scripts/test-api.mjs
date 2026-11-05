// Integration checks use a disposable database and a separate PHP process.
// Existing gas_tracker records are never modified.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const php = process.env.PHP_BINARY || 'D:/xampp/php/php.exe';
const database = 'gas_tracker_test_' + randomUUID().replaceAll('-', '');
const root = resolve('php-backend');
let server;
let count = 0;
const results = [];
function runPhp(code, input) {
  const r = spawnSync(php, ['-r', code], { input, encoding: 'utf8', env: process.env });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  return r.stdout;
}
const configCode =
  'require ' +
  JSON.stringify(resolve(root, 'api/config.php')).replaceAll('\\', '/') +
  '; $c=configuration(); $pdo=new PDO(sprintf("mysql:host=%s;port=%d;charset=utf8mb4",$c["host"],$c["port"]),(string)$c["username"],(string)$c["password"],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]); ';
async function check(name, fn) {
  await fn();
  count++;
  results.push({ test: name, status: 'PASS' });
  console.log('PASS ' + name);
}
try {
  const setup = readFileSync(resolve(root, 'sql/setup.sql'), 'utf8').replaceAll(
    'gas_tracker',
    database,
  );
  runPhp(configCode + '$pdo->exec(stream_get_contents(STDIN));', setup);
  // Ask PHP for an available local port to avoid touching an existing server.
  const port = Number(
    runPhp(
      '$s=stream_socket_server("tcp://127.0.0.1:0"); echo parse_url("tcp://".stream_socket_get_name($s,false),PHP_URL_PORT);',
    ),
  );
  server = spawn(php, ['-S', '127.0.0.1:' + port, '-t', root], {
    env: { ...process.env, GAS_TRACKER_DB: database },
    stdio: ['ignore', 'ignore', 'pipe'],
    windowsHide: true,
  });
  let serverErrors = '';
  server.stderr.on('data', (chunk) => {
    serverErrors += chunk.toString();
  });
  const base = 'http://127.0.0.1:' + port + '/api/';
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base + 'settings.php')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(150);
  }
  assert.ok(ready, 'PHP server did not start: ' + serverErrors);
  async function request(path, method = 'GET', body, extra = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...extra },
      ...(body !== undefined
        ? { body: typeof body === 'string' ? body : JSON.stringify(body) }
        : {}),
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error('Non-JSON response: ' + text);
    }
    return { status: res.status, body: data, headers: res.headers };
  }
  const defaults = (await request('settings.php')).body.data;
  const id = randomUUID();
  const fill = {
    id,
    operationId: randomUUID(),
    amount: 200,
    liters: 4,
    odometer: 1000,
    dateTime: '2026-11-01T00:30:00+08:00',
    station: 'Uno',
    grade: 'Unleaded',
    gaugeLevel: 6,
    filledToFull: true,
    latitude: 14.5995,
    longitude: 120.9842,
    notes: 'API fixture',
    createdAt: Date.now(),
  };
  await check('GET settings and initially empty fill-ups', async () => {
    assert.equal(defaults.tankCapacity, 5.5);
    assert.deepEqual((await request('fillups.php')).body.data, []);
  });
  await check('CORS allows Ionic origin and handles preflight', async () => {
    const r = await request('fillups.php', 'OPTIONS', undefined, {
      Origin: 'http://localhost:8100',
    });
    assert.equal(r.status, 204);
    assert.equal(r.headers.get('access-control-allow-origin'), 'http://localhost:8100');
    const denied = await request('fillups.php', 'OPTIONS', undefined, {
      Origin: 'https://untrusted.example',
    });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  });
  await check('Untrusted origins and non-JSON content cannot mutate local data', async () => {
    const untrusted = await request(
      'settings.php',
      'POST',
      { ...defaults, operationId: randomUUID(), name: 'Blocked' },
      { Origin: 'https://untrusted.example', 'Content-Type': 'text/plain' },
    );
    assert.equal(untrusted.status, 403);
    const plain = await request(
      'settings.php',
      'POST',
      { ...defaults, operationId: randomUUID(), name: 'Blocked' },
      { 'Content-Type': 'text/plain' },
    );
    assert.equal(plain.status, 415);
    assert.equal((await request('settings.php')).body.data.name, defaults.name);
  });
  await check('POST creates a typed fill-up with coordinates and local date intact', async () => {
    const r = await request('fillups.php', 'POST', fill);
    assert.equal(r.status, 201);
    assert.equal(r.body.data.id, id);
    assert.equal(r.body.data.dateTime, fill.dateTime);
    assert.equal(r.body.data.filledToFull, true);
    assert.equal(r.body.data.latitude, fill.latitude);
  });
  await check('Repeating a POST operation returns its receipt without duplicating', async () => {
    assert.equal((await request('fillups.php', 'POST', fill)).status, 201);
    assert.equal((await request('fillups.php')).body.data.length, 1);
  });
  await check('Reusing an operation ID for a different payload is rejected', async () => {
    assert.equal((await request('fillups.php', 'POST', { ...fill, amount: 250 })).status, 409);
  });
  await check('PUT edits preserve stable creation ordering', async () => {
    const r = await request('fillups.php?id=' + id, 'PUT', {
      ...fill,
      operationId: randomUUID(),
      amount: 150,
      createdAt: 1,
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.amount, 150);
    assert.equal(r.body.data.createdAt, fill.createdAt);
  });
  await check(
    'Input validation rejects malformed JSON, negative values, invalid dates, and incomplete coordinates',
    async () => {
      assert.equal((await request('fillups.php', 'POST', '{')).status, 400);
      for (const changes of [
        { amount: -1 },
        { liters: 0 },
        { gaugeLevel: 7 },
        { dateTime: '2026-02-30T10:00:00+08:00' },
        { latitude: null },
      ]) {
        assert.equal(
          (
            await request('fillups.php', 'POST', {
              ...fill,
              operationId: randomUUID(),
              id: randomUUID(),
              ...changes,
            })
          ).status,
          422,
        );
      }
    },
  );
  await check('Later odometer readings must increase', async () => {
    const r = await request('fillups.php', 'POST', {
      ...fill,
      operationId: randomUUID(),
      id: randomUUID(),
      odometer: 900,
      dateTime: '2026-11-02T10:00:00+08:00',
    });
    assert.equal(r.status, 422);
    assert.ok(r.body.errors.odometer);
  });
  await check(
    'Settings reject impossible calibration and preserve existing gauge readings',
    async () => {
      assert.equal(
        (
          await request('settings.php', 'POST', {
            ...defaults,
            operationId: randomUUID(),
            lowFuelAnchor: 8,
          })
        ).status,
        422,
      );
      assert.equal(
        (
          await request('settings.php', 'POST', {
            ...defaults,
            operationId: randomUUID(),
            gaugeSegments: 5,
          })
        ).status,
        422,
      );
    },
  );
  await check('Settings and custom station names persist with idempotent retries', async () => {
    const input = {
      ...defaults,
      operationId: randomUUID(),
      name: 'Test bike',
      stations: [...defaults.stations, 'Local pump'],
    };
    assert.equal((await request('settings.php', 'POST', input)).status, 200);
    assert.equal((await request('settings.php', 'POST', input)).status, 200);
    const saved = (await request('settings.php')).body.data;
    assert.equal(saved.name, 'Test bike');
    assert.ok(saved.stations.includes('Local pump'));
  });
  await check('Unknown IDs return 404 and unsupported methods return 405', async () => {
    assert.equal(
      (await request('fillups.php?id=' + randomUUID(), 'DELETE', { operationId: randomUUID() }))
        .status,
      404,
    );
    assert.equal((await request('settings.php', 'PUT', {})).status, 405);
  });
  await check('DELETE is replay-safe and removes the record', async () => {
    const op = { operationId: randomUUID() };
    assert.equal((await request('fillups.php?id=' + id, 'DELETE', op)).status, 200);
    assert.equal((await request('fillups.php?id=' + id, 'DELETE', op)).status, 200);
    assert.deepEqual((await request('fillups.php')).body.data, []);
  });
  mkdirSync('artifacts', { recursive: true });
  writeFileSync(
    'artifacts/api-results.json',
    JSON.stringify({ at: new Date().toISOString(), checks: count, results }, null, 2),
  );
  console.log(count + ' API checks passed.');
} finally {
  server?.kill();
  // Only the exact randomly named database created above is eligible for cleanup.
  assert.match(database, /^gas_tracker_test_[a-f0-9]{32}$/);
  runPhp(configCode + '$pdo->exec("DROP DATABASE ' + database + '");');
}
