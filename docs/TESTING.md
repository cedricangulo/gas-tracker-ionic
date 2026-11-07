# Validation results

> **Historical results:** This log records checks performed during development through 2026-11-06. Authentication and navigation changes were added afterward. Rerun the relevant checks and update this page before using its totals as final-submission evidence.

Automated checks run on 2026-11-06, using local XAMPP PHP 8.2.12/MySQL, Ionic 8.8.19, Angular 20.3.35, and the machine's installed Node runtime.

| Check                           | Result                           | Coverage                                                                                                                                                                      |
| ------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain/offline unit tests       | PASS: 46 tests                   | Fuel math, offline saves, archive choices, rename receipt retries, concurrent drafts and recovery after restart                                                               |
| Page/component unit tests       | PASS: 11 affected Settings tests | Latest focused run: station actions, input validation, archive confirmation, connection/busy states and uncertain rename recovery; other component results are recorded below |
| Backend unit/migration tests    | PASS: 28 tests / 393 assertions  | Validation, normalized migration, notes removal, archive preservation, v1/v2/v3 backups, receipt identity and restore round trips                                             |
| PHP static analysis             | PASS: level 9                    | API, seed and migration scripts; no suppressed findings                                                                                                                       |
| PHP/MySQL HTTP integration      | PASS: 16 checks                  | CRUD, settings, receipts, validation, archive behavior and ID-preserving station rename across active/archived history                                                        |
| Real browser/visual testing     | SKIPPED by request               | No browser session or screenshot testing performed                                                                                                                            |
| Android/iOS device verification | DEFERRED                         | Native wrappers and APK are later deliverables                                                                                                                                |

Final production build and Angular type-check: PASS. Ionic CLI startup and frontend HTTP 200: PASS. Apache API endpoints return 200; internal config/SQL/helpers/Git metadata return 403.

Component tests use Angular's experimental Vitest unit-test builder with Node/jsdom. Chart canvas painting and map initialization are isolated; these tests verify application behavior without opening a browser. This is not visual or end-to-end verification.

API integration uses a new randomly named `gas_tracker_test_*` database and a separate local PHP process; the test database is removed afterward. Personal tracker data is not seeded or modified by tests.

## Remaining manual evaluation

During the later course walkthrough, verify the full sequence: configure bike â†’ create located fill-up â†’ inspect Home/Charts/Log/Map â†’ edit â†’ delete. Check small/large screen layouts, Day/Night/Auto, location denial/timeout, offline reopening after app-shell installation, tile failures, and native permissions/haptics.

An improvement for a later release is authenticated backup/synchronization for multiple accounts and devices. Offline map tiles and explicit multi-device conflict resolution are also outside this focused prototype.

### Self-contained manual-testing seed (2026-11-06)

Implemented CLI-only `server/seed.php` with 42 embedded records, fixed IDs and synthetic values, preview/apply/restore, transactional replacement, and complete JSON backups. No runtime dependency on the Desktop CSV or stations.txt. Historical seed verification: every populated source input checked (146 numeric values plus dates, recorded times, and full flags); both reference hashes unchanged and Windows read-only attributes verified.

Validation: PHPUnit 21 tests / 344 assertions passed, including isolated-database repeatability, restore, rollback on insert failure, backup failure, and wrong-database refusal. PHPStan level 9 passed for API plus seeder. Applied to local gas_tracker: API returned 42 fill-ups / PHP 6,548.16, 14 at each of three stations. HTTP access to seed.php returns 403. Pre-seed database snapshot (settings, zero fill-ups and two mutation receipts at apply time) backed up to artifacts/seed-backup-20261106-114146-6526e61dbea0.json. Browser testing skipped.

### Map comparisons (2026-11-06)

Removed date filters and added all-history, grade-based station comparisons. The helper and its colocated spec were generated using Ionic CLI. The new coverage includes 100-metre anchor grouping, distinct branches, named and ungraded records, weighted prices, latest-priced versus last-visit dates, missing/invalid liters, ties, grade fallback, grouped marker/heatmap data, full-card popup activation, density toggling without viewport resets, empty history, and map teardown. Leaflet drawing and tiles are mocked; no browser/canvas rendering claims.

Final checks: 39 component/helper tests in 13 files passed; 36 calculation/offline unit tests passed; type-check and production build passed. Independent code review has no remaining critical or important findings. No backend/database changes or browser testing.

### Mobile lists and price charts (2026-11-06)

Passed 47 component/helper/service tests in 14 colocated spec files and 37 calculation/offline unit tests (84 total frontend tests). Type-check and production build passed; independent review found no critical/important issues. The shared list-state service and spec were generated through Ionic CLI.

Tests cover 10-entry batches, final partial batches, showing counts, hidden Load more at the end, newest-first records, complete-history distances, heatmap data unaffected by list limits, grade resets, retained counts and scroll restoration commands after page recreation. Scroll restoration tests mock Ionic scrollToPoint and invoke the lifecycle hook; real navigation/layout behavior remains unverified because browser testing is skipped.

Charts coverage verifies four chart cards, per-fill price/liter, reference gauge-stretch cost estimates distinct from Home, and omission of unavailable cost measurements. No backend, database or source-export changes.

Reference cost/km update: unit coverage checks gauge changes without full-tank flags, paused gauge chains, adjacent odometer distance, missing intermediate liters, and unavailable closing measurements. Browser testing remains skipped.

Fullscreen map regression coverage checks reuse of the map canvas and grade select, retained loaded records/heat/grade state, and restoration on Escape and page leave. Dialog APIs are mocked because jsdom does not implement them; actual top-layer layout and focus remain manual checks. Browser testing skipped as requested.

Beta formatting verification: Prettier check passed; 39 frontend unit tests, 48 component tests, 13 API checks and 21 PHP tests (344 assertions) passed. Angular typecheck/build and PHPStan level 9 passed. Read-only stations.txt hash was unchanged; browser testing stayed skipped.

Database normalization coverage uses disposable MariaDB databases to verify legacy migration, idempotent reruns, preservation of fill-ups/settings/receipts, foreign-key protection, and restores from version 1 seed backups.

Normalization delivery verification: PHPUnit 26 tests / 372 assertions, PHPStan level 9, and all 13 disposable-database API checks passed. The production database was migrated with a SQL dump and row backup; post-migration API and seed-preview checks returned all 42 fill-ups and PHP 6,548.16. Browser testing remains skipped.

Delete behavior verification: fill-up DELETE sets `archived_at`; normal API reads hide archived rows while preserving them for recovery. The live database has 42 active seeded fill-ups and zero archived rows. PHPUnit, PHPStan, API checks, and Prettier passed after this change.

### Beta cleanup - final verification (2026-11-06)

Renamed the backend to `server/`, removed notes from records, storage and saved responses, simplified page headers/copy, added cumulative gauge selection, and moved map actions over the map. The map uses Stadia Alidade Smooth raster tiles. Independent reviews found no remaining important issues after fixes.

Passed: Angular type checking; 41 logic/offline tests; 50 unique component tests across 14 colocated spec files (the corrected map description was verified by a focused 8-test rerun); 28 PHPUnit tests / 393 assertions; PHPStan level 9; 13 disposable-database HTTP checks. Tests ran after implementation, with one process at a time and limited workers. Browser testing and production builds were skipped.

Apache checks: the renamed settings/fill-up endpoints return 200; config, seed and Git files return 403. The live API still returns 42 active fill-ups totaling 6,548.16 pesos without notes. The database migration preserved all records and archive timestamps, wrote a raw pre-removal backup under ignored `artifacts/`, and did not reseed. Legacy backup tests also verify that retired note text cannot reappear through receipt payloads.

### Detailed street map update (2026-11-06)

Replaced the minimal Stadia basemap with OpenStreetMap Standard (Mapnik), retaining heatmap, markers, fullscreen controls and attribution. Updated the documented provider. This provider-configuration change was checked with Prettier; component suites and browser testing were not repeated.

### Station management - final verification (2026-11-06)

Settings now offers Add, Rename and Archive. Rename requires a connection and pending saves to finish; it updates the existing station row and all historical labels. Grades stay customizable, with no grade conversion or database migration.

Passed type checking, 46 unique logic tests, the 11 affected Settings component tests, 16 disposable-database API checks, and PHPStan level 9. The retry assertion was corrected and all 19 store tests rerun successfully. New regressions cover automatic refresh after a lost response, restart recovery, same operation IDs, drafts queued by another window, duplicate names including inactive choices, case corrections, stable station IDs and archived fill-ups. The previous full PHP unit suite was not repeated; the new endpoint was exercised through HTTP integration.

Independent review found no remaining important issues after fixes. Tests ran only after implementation and used sequential processes with limited workers. Browser testing and production builds were skipped. No live database records were changed.
