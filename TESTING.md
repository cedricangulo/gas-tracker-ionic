# Validation results

Automated checks run on 2026-11-06, using local XAMPP PHP 8.2.12/MySQL, Ionic 8.8.19, Angular 20.3.35, and the machine's installed Node runtime.

| Check                           | Result                                    | Coverage                                                                                                                                                                                                           |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain/offline unit tests       | PASS: 37 tests                            | Calibration, partial/full tanks, missing readings, monthly dates, odometer placement, persistence failures, interrupted requests, rejected edits/deletions, overlapping refresh, cross-window locks                |
| Page/component unit tests       | PASS: 47 tests in 14 colocated spec files | Empty/populated UI, tabs, accessibility labels, form errors/saves, initial hydration, dirty drafts, grade filters, station grouping/prices, marker/card interactions, accessible chart data, Leaflet plugin export |
| PHP validation unit tests       | PASS: 16 tests / 20 assertions            | Dates, quantities, coordinates, gauge calibration, UUIDs, catalog normalization, odometer ordering                                                                                                                 |
| PHP static analysis             | PASS: level 9                             | All API PHP files, no suppressed findings                                                                                                                                                                          |
| PHP/MySQL HTTP integration      | PASS: 13 checks                           | CRUD, settings, JSON types, persistence, idempotency receipts, malformed input, unknown IDs, preflight, rejected origins/content types                                                                             |
| Real browser/visual testing     | SKIPPED by request                        | No browser session or screenshot testing performed                                                                                                                                                                 |
| Android/iOS device verification | DEFERRED                                  | Native wrappers and APK are later deliverables                                                                                                                                                                     |

Final production build and Angular type-check: PASS. Ionic CLI startup and frontend HTTP 200: PASS. Apache API endpoints return 200; internal config/SQL/helpers/Git metadata return 403.

Component tests use Angular's experimental Vitest unit-test builder with Node/jsdom. Chart canvas painting and map initialization are isolated; these tests verify application behavior without opening a browser. This is not visual or end-to-end verification.

API integration uses a new randomly named `gas_tracker_test_*` database and a separate local PHP process; the test database is removed afterward. Personal tracker data is not seeded or modified by tests.

## Remaining manual evaluation

During the later course walkthrough, verify the full sequence: configure bike → create located fill-up → inspect Home/Charts/Log/Map → edit → delete. Check small/large screen layouts, Day/Night/Auto, location denial/timeout, offline reopening after app-shell installation, tile failures, and native permissions/haptics.

An improvement for a later release is authenticated backup/synchronization for multiple accounts and devices. Offline map tiles and explicit multi-device conflict resolution are also outside this focused prototype.

### Self-contained manual-testing seed (2026-11-06)

Implemented CLI-only `php-backend/seed.php` with 42 embedded records, fixed IDs and synthetic values, preview/apply/restore, transactional replacement, and complete JSON backups. No runtime dependency on the Desktop CSV or stations.txt. Every populated source input checked (146 numeric values plus dates, recorded times, and full flags); both reference hashes unchanged and Windows read-only attributes verified.

Validation: PHPUnit 21 tests / 344 assertions passed, including isolated-database repeatability, restore, rollback on insert failure, backup failure, and wrong-database refusal. PHPStan level 9 passed for API plus seeder. Applied to local gas_tracker: API returned 42 fill-ups / PHP 6,548.16, 14 at each of three stations. HTTP access to seed.php returns 403. Pre-seed database snapshot (settings, zero fill-ups and two mutation receipts at apply time) backed up to artifacts/seed-backup-20261106-114146-6526e61dbea0.json. Browser testing skipped.

### Map comparisons (2026-11-06)

Removed date filters and added all-history, grade-based station comparisons. The helper and its colocated spec were generated using Ionic CLI. The new coverage includes 100-metre anchor grouping, distinct branches, named and ungraded records, weighted prices, latest-priced versus last-visit dates, missing/invalid liters, ties, seed labels, grade fallback, grouped marker/heatmap data, full-card popup activation, density toggling without viewport resets, empty history, and map teardown. Leaflet drawing and tiles are mocked; no browser/canvas rendering claims.

Final checks: 39 component/helper tests in 13 files passed; 36 calculation/offline unit tests passed; type-check and production build passed. Independent code review has no remaining critical or important findings. No backend/database changes or browser testing.

### Mobile lists and price charts (2026-11-06)

Passed 47 component/helper/service tests in 14 colocated spec files and 37 calculation/offline unit tests (84 total frontend tests). Type-check and production build passed; independent review found no critical/important issues. The shared list-state service and spec were generated through Ionic CLI.

Tests cover 10-entry batches, final partial batches, showing counts, hidden Load more at the end, newest-first records, complete-history distances, heatmap data unaffected by list limits, grade resets, retained counts and scroll restoration commands after page recreation. Scroll restoration tests mock Ionic scrollToPoint and invoke the lifecycle hook; real navigation/layout behavior remains unverified because browser testing is skipped.

Charts coverage verifies four chart cards, per-fill price/liter, reference gauge-stretch cost estimates distinct from Home, and omission of unavailable cost measurements. No backend, database or source-export changes.

Reference cost/km update: unit coverage checks gauge changes without full-tank flags, paused gauge chains, adjacent odometer distance, missing intermediate liters, and unavailable closing measurements. Browser testing remains skipped.

Fullscreen map regression coverage checks reuse of the map canvas and grade select, retained loaded records/heat/grade state, and restoration on Escape and page leave. Dialog APIs are mocked because jsdom does not implement them; actual top-layer layout and focus remain manual checks. Browser testing skipped as requested.

Beta formatting verification: Prettier check passed; 39 frontend unit tests, 48 component tests, 13 API checks and 21 PHP tests (344 assertions) passed. Angular typecheck/build and PHPStan level 9 passed. Read-only stations.txt hash was unchanged; browser testing stayed skipped.
