# Findings

- Prompt: D:/0010/webdev/projects/gas-tracker/prompt.md.
- Reference uses gray surfaces, bronze accent #7A5224, Barlow, Barlow Condensed, Geist Mono, digital instrument readout, four floating tabs and separate add control.
- Course brief: C:/Users/ANGEL/Desktop/MOBILE APPLICATION TECHNOLOGY - CS.md; focused explainable prototype, device capability, data operation, testing, later APK/report/recording.
- PHP is D:/xampp/php/php.exe (8.2.12), PDO MySQL available. Apache document root D:/xampp/htdocs, port 80. MySQL tools in D:/xampp/mysql/bin.
- Angular 20 supports Node 24; system Node is 26, so package scripts must use supported runtime.
- Lecture API uses procedural PHP, strict types, PDO, success/data/message/errors JSON, explicit CORS origins and preflight.
- No Angular HttpClient example was present in lecture repository examples (requests.http only).
- Reference tank-to-tank math excludes opening fill liters, includes closing/intermediate purchases. Gauge math needs consistent anchor distance over missing readings.

## Defaults

- One bike; 5.5 L, 6 bars, 1.2 L low-fuel anchor, 50 km/L WMTC; Day appearance.
- Native wrappers and APK deferred. PHP backend local only.

## Normalized schema (2026-11-06)

- `settings` is one typed singleton row for bike configuration. `station_choices` and `grade_choices` store active ordered choices and retain retired values. `fillups` uses nullable foreign keys and the API joins display names back into the existing wire format.
- XAMPP is MariaDB 10.4.32; migration avoids newer SQL features and can resume across its implicit-commit DDL steps. It writes a version 1 row backup before alterations.
- Fresh installs import normalized `php-backend/sql/setup.sql`; existing installs run `php-backend/migrate.php` after making a full SQL dump.
- Live migration preserved one settings row, seven stations, two grades, and 42 fill-ups. The backup is in ignored `artifacts/`.
