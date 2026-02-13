# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Coral Control Arc is a **hyperbaric chamber control system** — a Node.js/Express server that communicates with a PLC (Programmable Logic Controller) over TCP sockets, reads sensor data (pressure, temperature, O2, humidity, air pressure, O2 pressure), manages treatment sessions with pressure profiles, and exposes a REST API for a React Native mobile app.

The project language context is Turkish (comments, variable names like `dalisSuresi`, `cikisSuresi`, `hedeflenen`, migration docs).

## Commands

```bash
npm start              # Start with nodemon (dev)
npm run db:create      # Initialize/sync DB schema (non-destructive)
npm run db:migrate     # Add missing columns without data loss
npm run seed:admin     # Create admin user (scripts/createAdminUser.js)
```

Production: `pm2 start ecosystem.config.js` (app name: `coral-control`, logs in `logs/`).

There are no tests or linting configured.

## Architecture

### Entry Point

**`index.js`** (~3500 lines) — Monolithic main file containing: Express server setup, PLC TCP socket client, Socket.IO real-time broadcasting, sensor reading/conversion pipeline, session state machine, valve control logic, alarm handling, and MQTT publishing. Everything runs in a single process.

Legacy entry points exist (`index_arc.js`, `cora_2.js`) but are not actively used.

### Database

- **SQLite** (`coral.sqlite`) via Sequelize ORM
- Models in `src/models/`, registered in `src/models/index.js`
- Key models: `sensors`, `users`, `patients`, `hyperbaricProfiles` + `hyperbaricProfileSteps`, `sessionRecords` + `sessionSensorLogs`, `config`, `sensorData`
- Associations: profiles have steps (cascade delete), profiles belong to users, session records have sensor logs and belong to users
- Migrations are manual (check column existence, add if missing) in `scripts/migrate-db.js` — not Sequelize CLI migrations

### Key Subsystems

- **Config system**: Single row in `config` table (id=1). On startup, `loadConfigFromDB()` → `global.appConfig` → `applyConfigToApp()` applies to `sessionStatus`, `o2CalibrationData`, `demoMode`, `LowPassFilter` instances. Default values defined in `src/routes/config.js:defaultConfigValues`. Config admin panel served at `/static/config.html`. When config is updated via API, `global.applyConfigToApp()` is called to apply changes live.
- **Sensor pipeline**: PLC sends raw analog values (0–16383) via TCP → `linearConversion()` (in `src/helpers/index.js`) maps to engineering units → `LowPassFilter` (EMA) smooths readings → values broadcast via Socket.IO.
- **Session state machine**: `sessionStatus` global tracks lifecycle (status 0–3: idle/started/paused/stopped), profile steps, timing, valve control, alarm states, O2 break tracking.
- **Profile system**: Treatment profiles are arrays of `[minutes, pressure, type]` tuples where type is `"air"` or `"o"`. `ProfileManager` class in `profile_manager_old.js` handles step creation, validation, and time-series conversion.
- **O2 calibration**: `SensorCalibration` class (`o2_calibration.js`) does 3-point polynomial (quadratic) and linear interpolation. Calibration API exposed via globals.
- **WebSocket command relay**: `src/ws/client.js` sends commands to peers (e.g., Raspberry Pi) through a signaling server.
- **Cloud Sync**: `cloud_reporter.js` — `CloudReporter` class sends chamber data to `stack-cloud-sync` service (Supabase-backed) via HTTP. Fire-and-forget: errors are logged but never block the control loop. Heartbeat every 30s, session start/end, alarm notifications, patient sync. Auth via `X-Chamber-Key` header. Disabled when env vars are not set.

### API Routes (`src/routes/`)

- `config.js` — Config DB CRUD (`/config/getConfig`, `/config/updateConfig`, `/config/resetConfig`, `/config/updateConfigField`, `/config/updateO2Calibration`, `/config/updateControlParams`, `/config/updateDefaultSessionParams`)
- `sensors.js` — CRUD for sensor config, bulk update sensor data (POST `/sensors/bulk-update`)
- `auth.js` — JWT auth (register, login, /auth/me). Secret: `JWT_SECRET` env var or `'coral-secret'`
- `users.js` — User management (CRUD)
- `sessions.js` — Session records with sensor logs (`/api/sessions`)
- `index.js` — Patients CRUD, O2 calibration endpoints (`/api/o2/*`), chart generation via Highcharts export server

### Helpers (`src/helpers/index.js`)

Contains `linearConversion`, `successResponse`/`errorResponse` wrappers, JWT middleware (`authenticateJWT`, `authorizeRoles`, `generateUserToken`), sensor data update utilities.

## Important Patterns

- Heavy use of `global.*` to share state between routes and the main control loop (e.g., `global.sessionStatus`, `global.sensorData`, `global.o2CalibrationData`).
- `global.appConfig` holds the full config object from DB. `global.applyConfigToApp` is a function routes call after updating config to apply changes live.
- Sensor IDs are fixed: 1=pressure, 2=temperature, 3=humidity, 4=o2, 5=air_pressure, 6=o2_pressure.
- PLC analog range is 0–16383 (14-bit ADC).
- The app uses `sync({ alter: true })` on startup to auto-migrate the SQLite schema.

## Environment Variables

Key env vars (from `.env`): `JWT_SECRET`, `SIGNALING_URL`, `CLOUD_API_URL` (stack-cloud-sync base URL), `CHAMBER_API_KEY` (chamber auth key for cloud sync).

`FILTER_ALPHA_PRESSURE`, `FILTER_ALPHA_O2`, `FILTER_ALPHA_TEMPERATURE`, `FILTER_ALPHA_HUMIDITY` — now optional; values are read from DB config first, env vars are fallback only.

PLC connection: `plcIpAddress` and `plcPort` are stored in DB config (defaults: `192.168.77.100:4000`).
