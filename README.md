# Gas Tracker Mobile

An Ionic 8 + Angular 20 application for a personal motorcycle fuel log, with a framework-free PHP/MySQL backend hosted by local XAMPP.

The app includes Home, Charts, Log, Settings, create/edit fill-ups, and a Leaflet map with a density heatmap. It follows the design and fuel-calculation behavior of the main Gas Tracker project. No login or existing personal-data migration is included.

## Open this project

Example project location:

```text
<web-root>/gas-tracker-mobile
```

Open your project folder in your editor. The server directory is part of this repository.

## Run with XAMPP

1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open phpMyAdmin at `http://localhost/phpmyadmin/`.
3. For a fresh database, import `server/sql/setup.sql`. It creates the normalized `gas_tracker` schema and default choices. Re-importing does not erase existing records.
4. For an existing pre-normalization database, first export a full SQL backup in phpMyAdmin or with `mysqldump`. Close the app or stop sync while migrating, then run `php server/migrate.php` from the repository root. The CLI migration also writes a row-level restore backup under ignored `artifacts/` before altering tables. It can be rerun after a partial DDL failure.
5. Optionally copy `server/config.example.php` to `server/config.local.php` and set your local connection values. A standard fresh XAMPP installation uses host `127.0.0.1`, port `3306`, user `root`, and an empty password. The local configuration is ignored by Git.
6. Check the API at `http://localhost/gas-tracker-mobile/server/api/settings.php`.

The PHP runtime needs PDO MySQL; XAMPP's bundled PHP 8.2 works. Composer is **only needed for backend development checks**, not to run the API.

Apache serves the PHP endpoints. The repository's Apache rules deny access to source/configuration files and directory listings. Opening the repository root through Apache intentionally returns 403; use Ionic's frontend URL below.

## Run the Ionic frontend

Use Node **24 LTS** and pnpm. From the repository:

```powershell
pnpm install
pnpm exec ionic serve --host=127.0.0.1 --port=8100 --no-open
```

Open `http://127.0.0.1:8100`. The equivalent project command is `pnpm start -- --no-open`.

This project was initialized using `ionic start "Gas Tracker" blank --type=angular-standalone`. Pages, components, services, model/test shells, and the unsaved-form guard were created using `ionic generate`; Capacitor configuration was created using `cap init`, and app-shell caching using Angular's PWA schematic. Keep using the generators:

```powershell
pnpm exec ionic generate page pages/example --standalone --spec=true
pnpm exec ionic generate component components/example --standalone --spec=true
pnpm exec ionic generate service services/example
```

The current Ionic starter targets newer framework versions; the generated project was adjusted to the prompt's Ionic 8 / Angular 20 requirement.

## API configuration

Set `apiBaseUrl` in the generated environment files:

- `src/environments/environment.development.ts`: Ionic development server.
- `src/environments/environment.prod.ts`: production build.
- `src/environments/environment.ts`: base environment.

Default: `http://localhost/gas-tracker-mobile/server/api`.

If the frontend origin changes, add its exact origin to `allowed_origins` in the PHP configuration. The API requires `application/json` for mutations and rejects browser mutations from untrusted origins.

| Method | Endpoint                | Operation                                    |
| ------ | ----------------------- | -------------------------------------------- |
| GET    | `fillups.php`           | Read the fill-up log                         |
| POST   | `fillups.php`           | Create a fill-up                             |
| PUT    | `fillups.php?id=<uuid>` | Update a fill-up                             |
| DELETE | `fillups.php?id=<uuid>` | Archive a fill-up                            |
| GET    | `settings.php`          | Read bike settings and station/grade choices |
| POST   | `settings.php`          | Save bike settings and choices               |

Responses use the lecture-style `{ success, data?, message?, errors? }` envelope. Mutations include an `operationId` UUID; the frontend supplies it automatically. Successful mutation receipts are committed in the same MySQL transaction as the data change, making lost-response retries safe.

This is a local, single-dataset application without authentication. Public hosting and multi-account access are outside this delivery.

## Database structure

The database stores bike configuration as scalar settings columns. Selectable station and grade names live in separate choice tables; fill-ups refer to those rows with nullable foreign keys. The API still returns and accepts station/grade names. Removed choices become inactive so existing fill-up history keeps its labels and valid references. Deleting a fill-up sets its `archived_at` timestamp; archived rows are hidden from normal API reads and retained in the database.

## Fuel calculations

Defaults: Honda Click 125i V4, 5.5 L tank, six bars above E, 1.2 L low-fuel anchor, 50 km/L WMTC.

- Liters per bar = `(tank capacity âˆ’ low-fuel anchor) / gauge segments`.
- Gauge readings describe fuel **after** filling. E is the configured low-fuel anchor, not an empty tank.
- Tank-to-tank efficiency uses distance between full fills divided by purchases after the opening fill, including partial fills and the closing fill.
- Home prefers a rolling average of the latest five measurable tank intervals; otherwise it shows a labeled gauge estimate.
- Gauge intervals carry the same distance/fuel anchor across missing gauge readings. Missing fuel measurements do not become zero fuel.
- Home's price per liter is weighted by purchases with recorded liters. Its cost/km preserves the reference's **price estimate**: closing fill price/L divided by that tank interval's km/L. It is labeled as an estimate, not actual interval spending/km.
- Monthly odometer distance belongs to the later reading's recorded month. Where only liters and an efficiency reading exist, estimated monthly distance is labeled.
- Amount and date/time are required; liters, odometer, gauge, station, grade, and location are optional. Missing measurements display as unavailable.
- Odometer readings must increase in chronological order, including backdated entries and edits. Date-times retain a timezone offset.

## Offline use and location

Ionic Storage uses IndexedDB for the snapshot and pending operations. Saves are persisted on this device before synchronization. Opening the app, refreshing Home/Log, reconnecting, or returning to the app triggers sync.

A failed validation remains visible and can be corrected by editing the entry. Retry reattempts pending operations. Deleting a rejected entry does not block later changes. On browsers with Web Locks, both snapshot updates and complete sync flights are serialized across tabs/windows; BroadcastChannel shares local updates. Use one window on older browsers without Web Locks.

Production app-shell caching allows offline reopening **after a successful online load and service-worker installation**. Development `ionic serve` does not cache its app shell. Saved fill-ups, forms, totals, and charts work locally; map tiles need internet.

Location is captured only by pressing **Use current location**, and can be removed. Permission denial or timeouts do not block saving. Browser geolocation needs localhost or HTTPS. Local storage can be cleared by browser/site-data removal, so synchronize before clearing it.

## Build and checks

```powershell
pnpm build
pnpm typecheck
pnpm test
pnpm test:php
```

- `pnpm test:unit`: calculations, local projections, durable queue and sync-race regressions.
- `pnpm test:components`: the `.spec.ts` beside every page/shared component; Angular TestBed with Node/jsdom.
- `pnpm test:php`: real HTTP/PHP/MySQL integration against a disposable randomly named database. It never changes `gas_tracker`.
- `pnpm test`: both frontend unit suites.

For API integration tests, start MySQL. The script defaults to `php`; set `PHP_BINARY` for another installation.

Optional strict PHP checks after `composer install` inside `server`:

```powershell
php vendor\phpstan\phpstan\phpstan analyse api --level=9 --no-progress
php vendor\bin\phpunit --bootstrap api/helpers.php tests
```

If Composer needs ZIP support, enable the installed extension just for that command: `php -d extension=zip <path-to-composer.phar> install`.

See [TESTING.md](TESTING.md) for results and deferred checks. No real-browser tests were run, as requested. Canvas/map painting is isolated in component tests, so visual layout, real geolocation permissions, and native behavior still need a later walkthrough.

Preview the production build with `pnpm preview` at `http://127.0.0.1:4173` to use app-shell caching.

## Capacitor and APK later

Native platform projects and APK packaging are deferred. Geolocation and best-effort haptics use official Capacitor plugins.

When ready to package Android with the compatible SDK/JDK installed:

```powershell
pnpm add @capacitor/android@7
pnpm exec cap add android
pnpm build
pnpm exec cap sync android
pnpm exec cap open android
```

Add coarse/fine location permissions to AndroidManifest.xml. A phone's `localhost` is the phone itself: use your development computer's LAN IP in the API environment and permit the frontend's origin. Prefer HTTPS; local HTTP may need development-only cleartext configuration.

For iOS later, install `@capacitor/ios@7`, add the platform on macOS, set location usage descriptions in Info.plist, and sync/open using Capacitor.

The course's installable APK, 3â€“5 page report, and 8â€“12 minute recording remain separate submission steps. Suggested code snippets to explain: Angular HttpClient in `services/api.ts`, geolocation in `services/geo.ts`, and atomic offline mutations in `services/tracker-store.ts`.

## Vehicle Compatibility Notice

This application is designed and calibrated specifically for motorcycles that have a similar instrument panel to the Honda Click 123i/125i V4 (segmented fuel gauge bars + low-fuel anchor behavior).
It does **not** fully support all vehicle types.

- Motorcycles or vehicles that lack a multi-segment fuel gauge on the dashboard
- Vehicles without a clear low-fuel / E-segment behavior
- Cars or other vehicle types with different tank and gauge systems

may produce inaccurate gauge estimates, low-fuel warnings, or liters-per-bar calculations.
Users of other vehicles should treat the gauge-related features as approximate only, or disable them if the required inputs (gauge segments, lowFuelAnchor, etc.) are not available on their vehicle.

## References and AI assistance

- Main design/calculation reference: the existing `gas-tracker` repository.
- [Lecture PHP API](https://github.com/gelcunanan/http-backend).
- [Ionic documentation](https://ionicframework.com/docs).
- [Capacitor Geolocation](https://capacitorjs.com/docs/v7/apis/geolocation).
- Map tiles: OpenStreetMap Standard (Mapnik), with OpenStreetMap attribution.

Codex assisted with implementation, tests, documentation, and code review. The group should review the code and demonstrate the actual device/browser flow before recording its submission.

## Manual testing seed

The CLI-only `server/seed.php` embeds 42 fixed fill-ups (June 18-November 5, 2026), totaling **PHP 6,548.16**. It does not read `stations.txt` or external CSV files at runtime. Those reference files are marked read-only. Recorded input values are preserved; station assignments, coordinates, grades, missing times, liters, and odometers include synthetic test values. Per-record notes and test-data badges have been removed. Calculations now include the synthetic readings and should be treated as test results.

From the repository root:

```powershell
# Preview all records without changing the database
php server/seed.php
# Finish pending app synchronization and close app tabs first
php server/seed.php --apply
# Restore a backup (also creates a backup of the state being replaced)
php server/seed.php --restore artifacts/seed-backup-TIMESTAMP-ID.json
```

Apply replaces all fill-ups and clears old mutation receipts in one transaction. It merges seed station/grade choices and preserves other bike settings. A complete JSON backup of all five tables is written to ignored `artifacts/` before changes; failures roll back. Repeated apply runs produce the same fixed IDs and values. Restore accepts only backups matching the current database name. Reopen or refresh the app afterward; unsynced offline edits can otherwise reappear.

The seed tests create and drop uniquely named `gas_tracker_seed_test_*` databases using the configured local MySQL account. Run them with `php server/vendor/bin/phpunit --bootstrap server/api/helpers.php server/tests`. Include `server/seed.php` alongside `server/api` when running PHPStan level 9. Browser testing is intentionally skipped.

## Map station comparisons

The map uses OpenStreetMap Standard (Mapnik) for detailed roads, place names, and landmarks around fuel stops. Map tiles require internet and follow the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

Map is available in the bottom tabs and uses all recorded dates. Select a fuel grade to compare like-for-like prices; Unleaded is selected when available, otherwise the earliest recorded named grade. Ungraded records have a separate Not recorded option and no lowest-price recommendation.

The Leaflet.heat overlay shows visit frequency: blue means fewer visits and red means more. One marker represents each station branch, grouping matching names within 100 metres of the first recorded location. Tap a marker or a station card to see its historical prices and visits. Average PHP/L uses total spend divided by total liters only for entries with positive liters; latest price means the most recent usable priced entry, which can differ from the last visit. Stations sort by average price, with ties at displayed cents labelled Lowest recorded average and missing prices last. Prices are saved history, not live offers. Summaries containing the embedded seed entries are labelled Includes test data. Located fill-ups remain editable beneath the comparisons.

## Mobile lists and cost trends

Fill-up log and Located fill-ups display the newest 10 entries first. Tap Load more to append 10 at a time; the Showing count reflects the visible entries. Loaded counts and scroll offsets are held in memory for the current app session when returning from editing. Changing the Map fuel grade resets its Located list to 10. Map heat points, station comparisons, log distances, and totals always use the complete matching history.

Charts now includes Distance per month, Price per liter, Cost per kilometer, and Monthly spend. Price per liter is amount divided by recorded liters for each fill-up. Cost per kilometer follows the reference Charts screen: closing price per liter divided by gauge-stretch km/L. Burned fuel is the anchor gauge level plus purchases minus the closing gauge level; distance uses adjacent odometer readings. As in the reference, missing intermediate liter values count as zero purchases and non-estimable stretches are omitted. Home retains its separate latest full-tank price estimate. The Home efficiency display retains its tank/gauge calculations.

The Map page has an **Expand map** button. Its fullscreen dialog reuses the current map and grade/heat controls, covers navigation, and offers **Close map** (or Escape) to return to station comparisons and the loaded fill-up list.

## Code formatting

Run `pnpm format` to format supported source and documentation files, and `pnpm format:check` to verify formatting. Prettier uses the PHP plugin targeting XAMPP PHP 8.2. Generated output, dependencies, lockfiles and the read-only `stations.txt` source are excluded. VS Code uses the recommended Prettier extension for format on save.

### Server rename and notes removal

The PHP backend now lives in `server/`; the API remains PHP endpoints at `/gas-tracker-mobile/server/api`. Update deployed frontend configuration and restart the development server after this change. Finish pending synchronization and close old app tabs before switching paths: mutation receipts fingerprint request URLs and bodies, so this is a maintenance cutover rather than an old-client compatibility layer.

Run `php server/migrate.php` against an existing database. Before removing retired notes from the fill-up column or saved response payloads it writes a complete raw version 2 backup under ignored `artifacts/`. Existing fill-ups, archived timestamps, settings, choices, and mutation receipts remain in place; do not run the seed apply command to upgrade. New seed backups use version 3 without notes. Restore accepts versions 1, 2 and 3, discards retired note text from old backups, and preserves archived timestamps. Local snapshots retain records/settings and queued drafts while removing legacy note fields. Notes and test-data badges are no longer part of the app.

## Manage stations

Settings has a Stations list with Add, Rename, and Archive. Renaming requires a connection and completed pending saves; it corrects the same station in past fill-ups and on the map. If a rename cannot be confirmed, retry the same name or refresh stations before making another station change. Archiving hides a station from new-entry choices and keeps historical fill-ups. Fuel grades remain customizable through the fill-up form.

Station rename uses `POST settings.php` with `{ operationId, stationRename: { from, to } }`. It preserves the station row ID and uses the existing retry receipts. No database migration is required.
