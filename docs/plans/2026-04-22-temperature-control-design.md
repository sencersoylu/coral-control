# Temperature Control Design (Closed-Loop Fan)

## Goal
Replace the current discrete fan-speed command (kademe 0/1/2/3/4 → register 0/50/70/100/150) with a closed-loop controller: operator enters a target temperature during a session, and the system modulates fan speed automatically to hold it.

## Physical Context
- Single actuator: fan blows cold air from a cooling coil (serpantin).
- Fan speed ↑ → temperature ↓. No heater. Below setpoint, only option is to stop the fan and wait for natural warming.
- Fan register `R01700` operating range: **40–255**. `0` = fan off (explicitly supported).

## Control Strategy: Proportional (P)
Chosen over bang-bang (too noisy) and PID (integral windup is problematic in asymmetric one-sided control; two extra tune params unnecessary here).

```
error = currentTemp - targetTemp

if error <= deadband:
    fanRegister = 0                          # at/below target → fan off
else:
    percentRaw = Kp * (error - deadband)
    percent    = clamp(percentRaw, 0, fanMaxOutput)
    fanRegister = round(40 + percent/100 * (255 - 40))
```

### Parameters (all operator-adjustable live)
| Param             | Default | Range    | Meaning                                         |
|-------------------|---------|----------|-------------------------------------------------|
| `targetTemperature` | —     | 18–30 °C | Operator-entered target                         |
| `tempKp`          | 25      | 5–100    | Aggressiveness (1°C over target → Kp% fan)      |
| `fanMaxOutput`    | 100     | 30–100   | Upper cap on fan % (noise/comfort limit)        |
| `tempDeadband`    | 0.3     | 0.1–1.0  | °C hysteresis to prevent chatter near setpoint  |

Presets for Kp may be surfaced in UI: Yumuşak=10, Orta=25, Sert=50.

## State
Added to `sessionStatus`:
- `targetTemperature` (number, °C)
- `temperatureControlEnabled` (bool)
- `tempKp` (number)
- `fanMaxOutput` (number, %)
- `tempDeadband` (number, °C)

Defaults stored in `config` table and applied via `applyConfigToApp()`.

## API
- `POST /api/temperature/setTarget` — body `{ target?, enabled?, kp?, fanMax? }`, any field optional; only provided fields updated.
- WS channel: `chamberControl` message `type: 'temperatureTarget'` with the same payload.
- Config CRUD: `targetTemperature`, `tempKp`, `tempDeadband`, `fanMaxOutput` added to config defaults.

## Control Loop Integration
- Runs inside the existing main control loop (1–2 s cadence).
- Only writes `R01700` when the computed value differs from the last written value (avoid spamming PLC).
- Optional rate limit: max 1 write/sec.

## Manual Override
- Incoming legacy `fanSpeed` command (kademe 0–4) → automatically sets `temperatureControlEnabled = false` and writes the mapped value directly.
- Operator returns to auto by re-enabling temperature control from the UI.

## UI (dashboard + mobile)
- Target temperature input (18–30 °C).
- Auto / Manuel toggle.
- Aggressiveness selector (3 preset chips or slider).
- Fan ceiling slider (30–100%).
- Live readout: currentTemp, targetTemp, error, computed fan %, register value.

## Out of Scope
- PID control, feed-forward, adaptive tuning.
- Profile-step embedded target (could be added later; for now, target is session-level and operator-managed).
- Humidity / air-quality coupled control.

## Open Questions
- Confirm `R01700` semantics and the 40–255 scale with PLC documentation before implementation.
- Decide whether `targetTemperature` should persist across sessions (default from config) or reset each session.
