# Gas Tracker Case Study Report Outline

> The completed report is available as [PDF](Gas-Tracker-Case-Study-Report.pdf) and [editable Markdown](Gas-Tracker-Case-Study-Report.md).

Use this outline to prepare the course deliverable: a concise **3–5 page PDF report**, excluding the cover page and references. Replace bracketed prompts with verified group information and current results. Keep the report focused on the problem, working app, mobile capability, data operation, evaluation, and what the group can explain.

## Cover page (not included in the page count)

- **Project:** Gas Tracker
- **Course:** Mobile Application Technology (IT-WS07)
- **Group members:** [Full names and section]
- **Instructor:** [Instructor name]
- **Submission date:** [Date]
- **Repository / shared folder:** [Link]

## 1. Project information, problem, and solution

### Problem

Explain the difficulty of keeping reliable motorcycle fuel records and understanding fuel spending, fuel economy, and station prices from scattered or incomplete notes.

### Intended users and proposed solution

Identify the primary user as a motorcycle owner who records fill-ups. Describe Gas Tracker as a mobile app that stores fill-up details and location, then turns the saved history into fuel-use, spending, and station comparisons. Clarify that the class instance uses one shared account and dataset; do not present it as separate private accounts.

## 2. Application features and user flow

Describe the main flow briefly, supported by a few labeled screenshots if space allows:

1. Sign in, configure the bike, and enter a fill-up with amount, date/time, and optional fuel, odometer, station, grade, gauge, and location details.
2. Review the home summary and charts for spending, fuel economy, price per liter, and estimated cost per kilometer.
3. Use the fill-up log to review, edit, or archive records; use the map to compare saved station prices by fuel grade and view visit density.

Keep the feature descriptions tied to user decisions and avoid listing every screen control.

## 3. Technical implementation

### Mobile capability

Explain that Capacitor Geolocation obtains the current position only when the user requests it for a fill-up or map centering. Capacitor Haptics provides optional save feedback. Describe permission denial or location timeout as handled cases. Do not claim continuous background tracking.

### Data operations and architecture

Summarize Ionic 8 / Angular standalone as the app UI and structure, Capacitor as the native bridge, PHP as the API, and MySQL as the shared database. Explain local-first saves and queued synchronization, the normalized fill-up and settings data, and the authenticated API operations. Mention that archived fill-ups are retained rather than physically deleted.

Choose **two or three** code excerpts for the report/presentation, such as:

- `src/app/services/geo.ts` — requesting location and handling failures.
- `src/app/services/tracker-store.ts` — saving locally and synchronizing queued changes.
- `src/app/models/math.ts` — deriving fuel and cost measures from recorded fill-ups.

For each excerpt, explain what it does, why the app needs it, and how the group verified it. The group does not need to explain the entire codebase.

## 4. Testing and evaluation

Refresh results against the final commit before submission. Use concise, reproducible tasks and fill the actual column from observed results; do not copy historical test counts without rerunning the checks. The course requires a table with expected and actual results and a status of **PASS**, **FAIL**, or **FUTURE IMPROVEMENT**.

| Feature or task tested           | Expected result                                                                            | Actual result                  | Status                             |
| -------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------ | ---------------------------------- |
| Sign in and open the main screen | Valid account opens the app; protected data is available                                   | [Record final result]          | [PASS / FAIL / FUTURE IMPROVEMENT] |
| Add and edit a fill-up           | Saved values appear in the log and summaries                                               | [Record final result]          | [Status]                           |
| Save while offline and reconnect | Local entry remains available and syncs when connected                                     | [Record final result]          | [Status]                           |
| Request location for a fill-up   | Permission and location result are handled; save remains usable if location is unavailable | [Record device/browser result] | [Status]                           |
| Compare stations on the map      | Matching fuel-grade history produces the expected station summary                          | [Record final result]          | [Status]                           |

State the verification environment (device/emulator or browser, OS, and app build). Distinguish automated unit/integration tests from a manual user-flow test. Visual browser checks were skipped in prior development; perform and report an appropriate final walkthrough rather than implying those checks passed. Android APK installation and native device behavior also need explicit verification before claiming them as tested.

### Limitations and improvement

Report observed limitations, not hypothetical ones. Known items to verify or disclose include the shared account/data model, map tiles requiring internet, and the deferred Android/device walkthrough. Recommend at least one practical improvement, for example per-user accounts, offline map support, or conflict handling for multiple devices. Choose the improvement that best follows from the tests and intended users.

## 5. AI usage disclosure

Disclose OpenAI Codex and any other tools the group actually used. Briefly state how they assisted (for example, scaffolding, implementation, debugging, tests, or documentation), what the group reviewed or changed, which checks were run, and what remains unverified. Do not claim review or testing that did not occur. Do not include passwords, private API keys, or other secrets; share any required app access details privately with the instructor.

## References (not included in the page count)

List the course module and the official Ionic, Angular, Capacitor, Leaflet, and map-tile documentation actually consulted. Cite external basemap data/provider terms where relevant, and include the project repository link if requested.

## Submission checklist (outside the report body)

- [ ] Final 3–5 page PDF, with separate cover and references.
- [ ] Android APK, if Android is the chosen target; install and verify it before submission.
- [ ] Source ZIP or repository link with setup instructions and no secrets.
- [ ] 8–12 minute recording link and any privately shared access instructions needed by the instructor.
- [ ] Confirm all group members can explain the demonstrated features and selected code.

## Presentation alignment (8–12 minutes)

- Problem and proposed solution: **1–2 minutes**.
- App walkthrough and core features: **3–4 minutes**.
- Two or three technical excerpts: **2–3 minutes**.
- Testing, limitations, and improvement: **1–2 minutes**.
- AI disclosure: **about 30 seconds**.
