// Integration checks use a disposable database and a separate PHP process.
// Existing gas_tracker records are never modified.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const php = process.env.PHP_BINARY || 'php';
const database = 'gas_tracker_test_' + randomUUID().replaceAll('-', '');
const root = resolve('server');
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
  const testPassword = 'Integration-Only-Password-84!';
  const testPasswordHash = runPhp(
    'echo password_hash(' + JSON.stringify(testPassword) + ', PASSWORD_DEFAULT);',
  );
  server = spawn(
    php,
    ['-S', '127.0.0.1:' + port, '-t', root],
    {
      env: {
        ...process.env,
        GAS_TRACKER_DB: database,
        GAS_TRACKER_ACCOUNT_USERNAME: 'owner',
        GAS_TRACKER_ACCOUNT_PASSWORD_HASH: testPasswordHash,
        GAS_TRACKER_REQUIRE_HTTPS: 'false',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    },
  );
  let serverErrors = '';
  server.stderr.on('data', (chunk) => {
    serverErrors += chunk.toString();
  });
  const base = 'http://127.0.0.1:' + port + '/api/';
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base + 'auth.php')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(150);
  }
  assert.ok(ready, 'PHP server did not start: ' + serverErrors);
  let accessToken = '';
  async function request(path, method = 'GET', body, extra = {}) {
    const headers = {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:8100',
      ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
      ...extra,
    };
    const res = await fetch(base + path, {
      method,
      headers,
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
    if (data?.data?.accessToken) accessToken = data.data.accessToken;
    if (data?.data?.authenticated === false && method === 'POST') accessToken = '';
    return { status: res.status, body: data, headers: res.headers };
  }
  await check('API requires a bearer token', async () => {
    assert.equal((await request('settings.php')).status, 401);
    assert.equal((await request('fillups.php')).status, 401);
    const status = await request('auth.php');
    assert.equal(status.status, 200);
    assert.equal(status.body.data.authenticated, false);
    assert.equal(status.body.data.csrfToken, undefined);
    assert.equal(status.headers.get('access-control-allow-credentials'), null);
  });
  await check('Protected routes reject a malformed bearer token', async () => {
    const response = await request('fillups.php', 'GET', undefined, {
      Authorization: 'Bearer malformed',
    });
    assert.equal(response.status, 401);
  });
  await check(
    'Shared account rejects incorrect credentials and issues an access token',
    async () => {
      assert.equal(
        (
          await request('auth.php', 'POST', {
            action: 'login',
            username: 'owner',
            password: 'wrong',
          })
        ).status,
        401,
      );
      const signedIn = await request('auth.php', 'POST', {
        action: 'login',
        username: 'owner',
        password: testPassword,
      });
      assert.equal(signedIn.status, 200);
      assert.equal(signedIn.body.data.authenticated, true);
      assert.match(signedIn.body.data.accessToken, /^[A-Za-z0-9_-]{43}$/);
    },
  );
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
    const custom = {
      ...fill,
      id: randomUUID(),
      operationId: randomUUID(),
      odometer: 1100,
      dateTime: '2026-11-02T10:00:00+08:00',
      station: 'Local pump',
      grade: null,
    };
    assert.equal((await request('fillups.php', 'POST', custom)).status, 201);
    const removeOldChoice = {
      ...saved,
      operationId: randomUUID(),
      stations: saved.stations.filter((station) => station !== 'Uno'),
    };
    assert.equal((await request('settings.php', 'POST', removeOldChoice)).status, 200);
    assert.ok(!(await request('settings.php')).body.data.stations.includes('Uno'));
    const history = (await request('fillups.php')).body.data;
    assert.equal(history.find((entry) => entry.id === id).station, 'Uno');
    assert.equal(history.find((entry) => entry.id === custom.id).station, 'Local pump');
    fill.customId = custom.id;
  });
  await check('Unknown IDs return 404 and unsupported methods return 405', async () => {
    assert.equal(
      (await request('fillups.php?id=' + randomUUID(), 'DELETE', { operationId: randomUUID() }))
        .status,
      404,
    );
    assert.equal((await request('settings.php', 'PUT', {})).status, 405);
  });
  await check('DELETE is replay-safe and archives the record', async () => {
    const op = { operationId: randomUUID() };
    assert.equal((await request('fillups.php?id=' + id, 'DELETE', op)).status, 200);
    assert.equal((await request('fillups.php?id=' + id, 'DELETE', op)).status, 200);
    assert.equal(
      (await request('fillups.php?id=' + fill.customId, 'DELETE', { operationId: randomUUID() }))
        .status,
      200,
    );
    assert.deepEqual((await request('fillups.php')).body.data, []);
    const archivedRows = Number(
      runPhp(
        configCode +
          '$pdo->exec("USE ' +
          database +
          '"); echo $pdo->query("SELECT COUNT(*) FROM fillups WHERE archived_at IS NOT NULL")->fetchColumn();',
      ),
    );
    assert.equal(archivedRows, 2);
  });
  await check(
    'Station rename keeps identity and active plus archived history, and retries its receipt',
    async () => {
      const active = {
        ...fill,
        id: randomUUID(),
        operationId: randomUUID(),
        station: 'Local pump',
        odometer: 1200,
        dateTime: '2026-11-03T10:00:00+08:00',
      };
      assert.equal((await request('fillups.php', 'POST', active)).status, 201);
      const readRows = () =>
        JSON.parse(
          runPhp(
            configCode +
              '$pdo->exec("USE ' +
              database +
              "\"); echo json_encode($pdo->query(\"SELECT s.id,s.name,s.is_active,f.id AS fill_id,f.archived_at FROM station_choices s JOIN fillups f ON f.station_choice_id=s.id WHERE s.name='Local pump' OR s.name='Neighborhood pump'\")->fetchAll(PDO::FETCH_ASSOC));",
          ),
        );
      const before = readRows();
      const input = {
        operationId: randomUUID(),
        stationRename: { from: 'Local pump', to: ' Neighborhood pump ' },
      };
      const first = await request('settings.php', 'POST', input);
      assert.equal(first.status, 200);
      assert.ok(first.body.data.stations.includes('Neighborhood pump'));
      assert.deepEqual(
        await request('settings.php', 'POST', input).then((r) => r.body),
        first.body,
      );
      const after = readRows();
      assert.equal(after.length, 2);
      assert.deepEqual(
        after.map((row) => [row.id, row.is_active, row.fill_id, row.archived_at]),
        before.map((row) => [row.id, row.is_active, row.fill_id, row.archived_at]),
      );
      assert.ok(after.every((row) => row.name === 'Neighborhood pump'));
      assert.equal(
        (await request('fillups.php')).body.data.find((row) => row.id === active.id).station,
        'Neighborhood pump',
      );
    },
  );
  await check(
    'Station rename rejects blanks, long names, missing stations and active or inactive duplicates',
    async () => {
      for (const to of ['', '   ', 'x'.repeat(81), 'shell', 'UNO']) {
        const result = await request('settings.php', 'POST', {
          operationId: randomUUID(),
          stationRename: { from: 'Neighborhood pump', to },
        });
        assert.equal(result.status, 422);
      }
      assert.equal(
        (
          await request('settings.php', 'POST', {
            operationId: randomUUID(),
            stationRename: { from: 'Missing station', to: 'New name' },
          })
        ).status,
        404,
      );
      assert.equal(
        (await request('settings.php', 'POST', { operationId: randomUUID(), stationRename: null }))
          .status,
        422,
      );
    },
  );
  await check(
    'Station rename permits case corrections and exact no-ops without reactivating archived choices',
    async () => {
      for (const [from, to] of [
        ['Uno', 'UNO'],
        ['UNO', 'UNO'],
      ]) {
        const result = await request('settings.php', 'POST', {
          operationId: randomUUID(),
          stationRename: { from, to },
        });
        assert.equal(result.status, 200);
        assert.ok(!result.body.data.stations.includes(to));
      }
      const result = await request('settings.php', 'POST', {
        operationId: randomUUID(),
        stationRename: { from: 'Neighborhood pump', to: 'NEIGHBORHOOD PUMP' },
      });
      assert.equal(result.status, 200);
      assert.ok(result.body.data.stations.includes('NEIGHBORHOOD PUMP'));
    },
  );
  await check('Logout revokes access to the shared dataset', async () => {
    assert.equal((await request('auth.php', 'POST', { action: 'logout' })).status, 200);
    assert.equal((await request('settings.php')).status, 401);
    assert.equal((await request('auth.php')).body.data.authenticated, false);
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
