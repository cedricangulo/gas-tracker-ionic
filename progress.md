# Progress

## 2026-11-06 — Complete

- Read prompt.md, the desktop course brief, main reference implementation, and lecture API.
- Confirmed six-screen scope, personal single-bike dataset, Ionic-first workflow, later APK/report, and XAMPP/MySQL.
- Relocated repository including Git metadata to D:/xampp/htdocs/gas-tracker-mobile.
- Reinitialized using ionic start; used ionic generate for pages, components, services, models, guard, spec/test-support shells; initialized Capacitor using CLI and offline app shell using ng add @angular/pwa.
- Implemented Home, Charts, Log, Settings, new/edit fill-up, Leaflet map/heatmap, optional Geolocation, haptics, typed math, durable IndexedDB queue, Web Locks/BroadcastChannel coordination, PHP/MySQL endpoints and transactionally idempotent receipts.
- Started XAMPP Apache and MySQL, imported non-destructive setup SQL.
- Generated a .spec.ts beside all six pages, all five shared components, and the app root. Added meaningful DOM/form/navigation/accessibility tests using Node/jsdom.
- Completed independent read-only code review; fixed identified ordering/security/hydration/map issues and added regressions. Re-review confirmed no remaining critical/important ordering issue.
- Wrote README.md with setup, API URL configuration, offline behavior, math semantics, exact vehicle notice, generators, tests and later native packaging steps.
- Production build: PASS, final output www/. Angular type-check: PASS.
- Domain/offline: 36/36 PASS. Component specs: 26/26 PASS in 12 files. PHP validation: 16/16 PASS with 20 assertions. PHPStan level 9: PASS, no errors. Real PHP/MySQL HTTP integration: 13/13 PASS.
- API tests create/drop only a unique gas_tracker_test_* database; personal gas_tracker data remains unseeded.
- Ionic CLI startup: PASS, http://127.0.0.1:8100 returns 200 and expected app title.
- Apache API GET endpoints: 200. Config example, SQL setup, internal helper and .git/HEAD URLs: 403.
- Browser/visual/native tests were not run, as requested. Chart/map painting is isolated in jsdom unit tests.
- Development server left running on port 8100. Reopen the relocated folder as the editor workspace.

### Self-contained manual-testing seed (2026-11-06)

Implemented CLI-only `php-backend/seed.php` with 42 embedded records, fixed IDs and synthetic values, preview/apply/restore, transactional replacement, and complete JSON backups. No runtime dependency on the Desktop CSV or stations.txt. Every populated source input checked (146 numeric values plus dates, recorded times, and full flags); both reference hashes unchanged and Windows read-only attributes verified.

Validation: PHPUnit 21 tests / 344 assertions passed, including isolated-database repeatability, restore, rollback on insert failure, backup failure, and wrong-database refusal. PHPStan level 9 passed for API plus seeder. Applied to local gas_tracker: API returned 42 fill-ups / PHP 6,548.16, 14 at each of three stations. HTTP access to seed.php returns 403. Pre-seed database snapshot (settings, zero fill-ups and two mutation receipts at apply time) backed up to artifacts/seed-backup-20261106-114146-6526e61dbea0.json. Browser testing skipped.

### Map station comparison follow-up - complete

Removed date filtering; implemented grade-based station grouping, historical weighted-price comparisons, safe grouped marker popups, interactive station cards, test-data labels, and preserved per-fill editing. Ionic CLI generated the helper and spec. Verified final source with independent review, 39 component/helper tests, 36 unit tests, type-check and production build. Browser testing skipped; database and read-only seed sources untouched.

### Mobile list loading and price charts - complete

Implemented 10-at-a-time Load more for Log and Map Located fill-ups, per-session counts/scroll restoration, and grade-change resets without limiting calculations or heatmap points. Replaced the Gauge estimate chart with price-per-liter and cost-per-kilometer charts using the same closing-purchase price estimate as Home. Final verification: 47 component/helper/service tests + 37 unit tests passed, type-check and production build passed, independent review resolved. Browser testing skipped.

## Beta formatting and initial Git history

Added pinned Prettier with PHP 8.2 formatting, shared scripts and VS Code integration. Preserve read-only source station file and ignored data/configuration. Verify formatted frontend/backend before creating four logical commits. User requested initial author/committer timestamp 2026-11-05 14:45:00 +08:00; subsequent timestamps are intentionally assigned within the period ending on 2026-11-06, rather than records of actual development time.

Verification before beta commits: formatting check, 39 frontend unit tests, 48 component tests, Angular typecheck and production build, 13 disposable-database API checks, 21 PHP tests (344 assertions), and PHPStan level 9 all passed. Browser testing skipped as requested. Read-only stations.txt SHA-256 unchanged.

### Database normalization - complete (2026-11-06)

Normalized scalar bike settings, station/grade choice catalogs, and fill-up references while retaining the API wire shape. Added a resumable legacy schema migration with a version 1 row backup and seed restore compatibility, updated fresh setup SQL and seed tooling, and documented upgrade steps.

Verified: PHPUnit 24 tests / 368 assertions; PHPStan level 9; 13 HTTP API integration checks; Prettier; frontend typecheck and production build. Migrated the live XAMPP database after creating `artifacts/gas-tracker-pre-normalization-20261106.sql`; migration wrote `artifacts/normalization-backup-v1-20261106-134934-b7dd990905.json`. Live settings and all 42 fill-ups were verified through the API; seed preview remains 42 / PHP 6,548.16.

### Archived deletes and final review fixes - complete (2026-11-06)

Fill-up DELETE now records `archived_at`, normal API reads omit archived rows, and seed backups preserve archive timestamps. Existing normalized databases gain the nullable column through the idempotent CLI migration. Catalog names use binary uniqueness so accent-distinct names remain distinct; settings validation checks stored decimal precision before writes. The live database retains all 42 seeded fill-ups, with 42 active and zero archived.

Verified: PHPUnit 26 tests / 372 assertions; PHPStan level 9; 13 disposable-database API checks including direct assertion that both deleted rows remain archived; Prettier and `git diff --check` passed. Browser testing skipped.

## Beta cleanup (2026-11-06)

Completed server rename, end-to-end notes removal with raw backup and legacy restore support, concise single-title pages, map overlay actions and Stadia tiles, cumulative form gauge, and portable README examples. Live records remain 42 active, zero archived, total 6,548.16 pesos. Final checks: typecheck, 41 logic tests, 50 unique component tests (map fix retested), 28 PHP tests/393 assertions, PHPStan level 9, 13 API checks and Apache access checks passed. Browser testing and production builds skipped. Changes remain uncommitted.

## Station management (2026-11-06)

Added Settings station Add/Rename/Archive and online ID-preserving rename through the existing settings endpoint. Retained customizable grades. Uncertain rename receipt metadata is durable and confirmed before later queued station drafts; concurrent unsent drafts keep their IDs while adopting the corrected name. Passed typecheck, 46 logic tests, 11 focused Settings tests, 16 API checks and PHPStan level 9. No live database changes, migrations, browser tests or production build. Changes remain uncommitted.
