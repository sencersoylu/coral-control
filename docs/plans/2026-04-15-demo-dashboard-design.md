# Demo Dashboard Design

## Goal
HTML dashboard for triggering edge cases and monitoring demo mode in real-time.

## Access
`public/demo.html` — `http://<ip>:4001/demo.html`

## Layout
- **Left:** Live data panel (Socket.IO listener)
- **Right:** Control panel (Socket event + REST triggers)

## Live Data (sensorData event)
- Pressure (FSW): target vs actual
- O2 (%), Temperature (C), Humidity (%)
- Session: status, time (mm:ss), profile progress, grafik durum (inis/cikis/duz), step (air/o), mask status
- Control values: pcontrol, difference, pressRate, comp/decomp params
- Active alarms list

## Controls
- Session: start/pause/resume/stop buttons, manual exit trigger
- Alarm simulation: high O2, high humidity, door toggle
- Oxygen/ventilation: mask on/off, ventilation mode select, manual/auto toggle
- Comp/decomp params: number inputs for offset/gain/depth (live update on change), reset button

## Backend
1. `demoControl` socket event handler — modifies sessionStatus fields
2. `express.static('public')` middleware
3. Extended sensorData broadcast with comp/decomp params and pcontrol

## Out of Scope
- Charts/graphs, profile editor, auth
