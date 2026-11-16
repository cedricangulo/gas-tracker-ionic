# Gas Tracker Mobile implementation

## Decisions

- Ionic 8 + Angular 20 standalone; Capacitor 7; pnpm; recommended Node 24.
- User requires Ionic CLI scaffolding and generators wherever supported.
- XAMPP Apache + MySQL; repository is placed under the XAMPP web root.
- Single-bike dataset shared through one account. Six core app screens plus sign-in; no role system or public registration.
- Main gas-tracker reference unchanged.
- Per-page/component specs requested and generated through Ionic CLI.
- No real-browser testing; component unit tests use Node/jsdom.

## Phases

1. Workspace relocation and Ionic CLI scaffold — complete.
2. Typed calculations, local persistence and offline synchronization — complete.
3. PHP/MySQL API, setup SQL and private-file access rules — complete.
4. Six generated screens and reference styling — complete.
5. Automated non-browser tests, code review, README — complete.

## Results

- Production build and Angular type-check pass.
- Domain/offline tests: 36 pass.
- Page/component specs: 26 pass across 12 spec files.
- PHP validation: 16 tests, 20 assertions pass.
- PHPStan: level 9, no errors.
- Isolated real PHP/MySQL API tests: 13 checks pass.
- Ionic CLI dev server returned HTTP 200 during validation.
- Apache API endpoints: HTTP 200. Private config, SQL, helpers and Git metadata: HTTP 403.
- Independent read-only review confirms sync ordering fixes; no remaining critical/important issue found in reviewed functions.
- Native packaging and visual/device verification remain deferred as agreed.

## Next Step

User: reopen the relocated repository and review the running app. Follow `../README.md` for setup and later APK packaging.

## Resolved setup issues

- Windows locked the original open folder; moved its contents, leaving that folder empty.
- Replaced initial hand-authored scaffold with Ionic CLI starter at user request.
- Adjusted newer starter framework versions/configuration to the prompt's Ionic 8/Angular 20 requirement.
- Dependency directory was removed by a separate npkill process; reinstalled and finished generators.
- Generated colocated specs by temporarily archiving implementations, generating with spec=true, and restoring source.
- Fixed cross-window snapshot/sync ordering, retry receipts, rejected deletions, initial-form hydration, unsaved chips/location, Leaflet plugin import and local API request validation.

### Map station comparison follow-up - complete

Removed date filtering; implemented grade-based station grouping, historical weighted-price comparisons, safe grouped marker popups, interactive station cards, test-data labels, and preserved per-fill editing. Ionic CLI generated the helper and spec. Verified final source with independent review, 39 component/helper tests, 36 unit tests, type-check and production build. Browser testing skipped; database and read-only seed sources untouched.

### Mobile list loading and price charts - complete

Implemented 10-at-a-time Load more for Log and Map Located fill-ups, per-session counts/scroll restoration, and grade-change resets without limiting calculations or heatmap points. Replaced the Gauge estimate chart with price-per-liter and cost-per-kilometer charts using the same closing-purchase price estimate as Home. Final verification: 47 component/helper/service tests + 37 unit tests passed, type-check and production build passed, independent review resolved. Browser testing skipped.

### Database normalization (active)

- [x] Inspect legacy schema/data and take a full SQL backup.
- [x] Normalize settings and station/grade catalogs; replace fill-up names with foreign keys.
- [x] Add resumable legacy migration and version 1 seed-backup restore support.
- [x] Update API, seed tooling, tests, and setup documentation.
- [x] Run PHP/API/type/build checks; migrate the live gas_tracker database and verify all existing records.

Normalization complete: PHP 24/368, API 13 checks, PHPStan level 9, formatting, typecheck and production build passed. Live XAMPP records were preserved and read back through the unchanged API contract.
