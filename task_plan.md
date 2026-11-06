# Gas Tracker Mobile implementation

## Decisions

- Ionic 8 + Angular 20 standalone; Capacitor 7; pnpm; recommended Node 24.
- User requires Ionic CLI scaffolding and generators wherever supported.
- XAMPP Apache + MySQL; repository in D:/xampp/htdocs/gas-tracker-mobile.
- Personal single-bike dataset. Six prompt screens; no accounts/import/export.
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
- Ionic CLI dev server: http://127.0.0.1:8100, HTTP 200.
- Apache API endpoints: HTTP 200. Private config, SQL, helpers and Git metadata: HTTP 403.
- Independent read-only review confirms sync ordering fixes; no remaining critical/important issue found in reviewed functions.
- Native packaging and visual/device verification remain deferred as agreed.

## Next Step

User: reopen the relocated repository and review the running app. Follow README.md for future startup and later APK packaging.

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
