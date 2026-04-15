# Demo Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an HTML dashboard that shows live demo data and lets users trigger edge cases via Socket.IO and REST.

**Architecture:** Add a Socket.IO server to the existing Express/HTTP server. The server re-broadcasts sensor data and session status to dashboard clients every second (piggybacking on the existing `setInterval`). Dashboard clients send `demoControl` events to modify `sessionStatus` fields. The HTML file is served via `express.static('public')`.

**Tech Stack:** Socket.IO server (already in package.json), Express static middleware, vanilla HTML/JS (no framework)

---

### Task 1: Add Socket.IO Server and Static Middleware

Set up the Socket.IO server on the existing HTTP server and add `express.static` for serving `public/`.

**Files:**
- Modify: `index.js:1-25` (requires section)
- Modify: `index.js:225-232` (middleware section)
- Modify: `index.js:574-595` (app startup section)

**Step 1: Add Socket.IO server require**

After line 9 (`const { io } = require('socket.io-client');`), add:

```js
const { Server: SocketIOServer } = require('socket.io');
```

**Step 2: Add static middleware**

After line 232 (`app.use(allRoutes);`), add:

```js
app.use(express.static('public'));
```

**Step 3: Initialize Socket.IO server after HTTP server listen**

After the `server.listen(port, ...)` call (around line 595), add:

```js
	// Socket.IO server for dashboard clients
	const ioServer = new SocketIOServer(server, {
		cors: { origin: '*' },
	});
	global.ioServer = ioServer;

	ioServer.on('connection', (dashSocket) => {
		console.log('Dashboard client connected:', dashSocket.id);

		// Send initial state immediately
		dashSocket.emit('sensorData', {
			pressure: Number(sensorData['pressure']?.toFixed?.(2)) || 0,
			anteChamberPressure: Number((sensorData['anteChamberPressure'] || 0).toFixed?.(2)) || 0,
			o2: Number(sensorData['o2']?.toFixed?.(0)) || 0,
			temperature: Number(sensorData['temperature']?.toFixed?.(1)) || 0,
			humidity: Number(sensorData['humidity']?.toFixed?.(0)) || 0,
		});
		dashSocket.emit('sessionStatus', sessionStatus);
		dashSocket.emit('alarmStatus', alarmManager.getStatus());

		dashSocket.on('demoControl', (data) => {
			if (demoMode == 0) {
				console.log('demoControl ignored — not in demo mode');
				return;
			}
			handleDemoControl(data);
		});

		dashSocket.on('sessionStart', (data) => {
			// Re-emit to PLC socket as if mobile app sent it
			if (socket && socket.connected) {
				socket.emit('sessionStart', JSON.stringify(data));
			}
		});

		dashSocket.on('sessionPause', () => {
			if (socket && socket.connected) {
				socket.emit('sessionPause', '{}');
			}
		});

		dashSocket.on('sessionResume', () => {
			if (socket && socket.connected) {
				socket.emit('sessionResume', '{}');
			}
		});

		dashSocket.on('sessionStop', () => {
			if (socket && socket.connected) {
				socket.emit('sessionStop', '{}');
			}
		});

		dashSocket.on('disconnect', () => {
			console.log('Dashboard client disconnected:', dashSocket.id);
		});
	});
```

**Step 4: Add `handleDemoControl` function**

Add this function before the `read_demo()` function (around line 2070):

```js
function handleDemoControl(data) {
	const { action, param, value } = data;
	switch (action) {
		case 'setCikis':
			sessionStatus.cikis = value ? 1 : 0;
			break;
		case 'setOksijen':
			sessionStatus.oksijen = value ? 1 : 0;
			break;
		case 'setVentil':
			sessionStatus.ventil = Number(value) || 0;
			break;
		case 'setOtomanuel':
			sessionStatus.otomanuel = value ? 1 : 0;
			break;
		case 'setCompParam':
			if (['comp_offset', 'comp_gain', 'comp_depth', 'decomp_offset', 'decomp_gain', 'decomp_depth', 'minimumvalve'].includes(param)) {
				sessionStatus[param] = Number(value);
			}
			break;
		case 'resetCompParams':
			sessionStatus.comp_offset = 12;
			sessionStatus.comp_gain = 8;
			sessionStatus.comp_depth = 100;
			sessionStatus.decomp_offset = 14;
			sessionStatus.decomp_gain = 7;
			sessionStatus.decomp_depth = 100;
			sessionStatus.minimumvalve = 12;
			break;
		case 'simulateHighO2':
			sensorData['o2'] = filters.o2.update(value ? 25 : 21.1);
			break;
		case 'simulateHighHumidity':
			sensorData['humidity'] = filters.humidity.update(value ? 80 : 45);
			break;
		case 'toggleDoor':
			sessionStatus.doorSensorStatus = sessionStatus.doorSensorStatus === 0 ? 1 : 0;
			break;
		default:
			console.log('Unknown demoControl action:', action);
	}
}
```

**Step 5: Broadcast to dashboard clients in the setInterval**

In the existing `setInterval` block (around line 1410), at the very end (after the `read_demo()` or `read()` call and the alarm checks), add:

```js
	// Broadcast to dashboard clients
	if (global.ioServer) {
		const dashData = {
			pressure: Number(sensorData['pressure']?.toFixed?.(2)) || 0,
			anteChamberPressure: Number((sensorData['anteChamberPressure'] || 0).toFixed?.(2)) || 0,
			o2: Number(sensorData['o2']?.toFixed?.(0)) || 0,
			temperature: Number(sensorData['temperature']?.toFixed?.(1)) || 0,
			humidity: Number(sensorData['humidity']?.toFixed?.(0)) || 0,
		};
		global.ioServer.emit('sensorData', dashData);
		global.ioServer.emit('sessionStatus', {
			status: sessionStatus.status,
			zaman: sessionStatus.zaman,
			hedef: sessionStatus.hedef,
			main_fsw: sessionStatus.main_fsw,
			pressure: sessionStatus.pressure,
			fsw: sessionStatus.fsw,
			grafikdurum: sessionStatus.grafikdurum,
			adim: sessionStatus.adim,
			oksijen: sessionStatus.oksijen,
			otomanuel: sessionStatus.otomanuel,
			ventil: sessionStatus.ventil,
			vanacikis: sessionStatus.vanacikis,
			cikis: sessionStatus.cikis,
			eop: sessionStatus.eop,
			toplamSure: sessionStatus.toplamSure,
			setDerinlik: sessionStatus.setDerinlik,
			speed: sessionStatus.speed,
			doorStatus: sessionStatus.doorStatus,
			doorSensorStatus: sessionStatus.doorSensorStatus,
			pcontrol: sessionStatus.pcontrol,
			comp_offset: sessionStatus.comp_offset,
			comp_gain: sessionStatus.comp_gain,
			comp_depth: sessionStatus.comp_depth,
			decomp_offset: sessionStatus.decomp_offset,
			decomp_gain: sessionStatus.decomp_gain,
			decomp_depth: sessionStatus.decomp_depth,
			minimumvalve: sessionStatus.minimumvalve,
			pressRateFswPerMin: sessionStatus.pressRateFswPerMin,
			pressRateBarPerMin: sessionStatus.pressRateBarPerMin,
			bufferdifference: sessionStatus.bufferdifference[sessionStatus.zaman] || 0,
			higho: sessionStatus.higho,
			highHumidity: sessionStatus.highHumidity,
		});
		global.ioServer.emit('alarmStatus', alarmManager.getStatus());
	}
```

**Step 6: Verify**

```bash
node --check index.js
```

**Step 7: Commit**

```bash
git add index.js
git commit -m "feat: add Socket.IO server, static middleware, and demoControl handler"
```

---

### Task 2: Create Demo Dashboard HTML

Create `public/demo.html` — a single-file HTML dashboard with embedded CSS and JS.

**Files:**
- Create: `public/demo.html`

**Step 1: Create the dashboard file**

Create `public/demo.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Demo Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: monospace; background: #1a1a2e; color: #e0e0e0; font-size: 13px; }
  .container { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; max-width: 1400px; margin: 0 auto; }
  h1 { grid-column: 1 / -1; font-size: 16px; padding: 8px 0; border-bottom: 1px solid #333; }
  .panel { background: #16213e; border: 1px solid #333; border-radius: 6px; padding: 12px; }
  .panel h2 { font-size: 13px; color: #ff6b35; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .data-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .data-row .label { color: #888; }
  .data-row .value { font-weight: bold; text-align: right; }
  .highlight { color: #2dd4a8; }
  .warning { color: #ff4757; }
  .btn-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  button { background: #0f3460; color: #e0e0e0; border: 1px solid #444; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-family: monospace; font-size: 12px; }
  button:hover { background: #1a4a7a; }
  button.active { background: #ff6b35; color: #fff; border-color: #ff6b35; }
  button.danger { background: #5c1a1a; border-color: #ff4757; }
  button.danger:hover { background: #7a2020; }
  button.success { background: #1a4a2e; border-color: #2dd4a8; }
  button.success:hover { background: #1a6a3e; }
  .param-group { display: grid; grid-template-columns: 120px 80px; gap: 4px 8px; align-items: center; margin-top: 6px; }
  .param-group label { color: #888; font-size: 12px; }
  .param-group input { background: #0a0a1a; color: #e0e0e0; border: 1px solid #444; border-radius: 3px; padding: 4px 6px; font-family: monospace; font-size: 12px; width: 100%; }
  .param-group input:focus { outline: none; border-color: #ff6b35; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; }
  .status-idle { background: #333; }
  .status-running { background: #1a4a2e; color: #2dd4a8; }
  .status-paused { background: #4a3a1a; color: #ffa502; }
  .alarm-list { max-height: 120px; overflow-y: auto; margin-top: 6px; }
  .alarm-item { padding: 3px 6px; margin: 2px 0; background: #2a1a1a; border-left: 3px solid #ff4757; border-radius: 2px; font-size: 11px; }
  .connected { color: #2dd4a8; }
  .disconnected { color: #ff4757; }
  select { background: #0a0a1a; color: #e0e0e0; border: 1px solid #444; border-radius: 3px; padding: 4px 6px; font-family: monospace; font-size: 12px; }
  .session-start-form { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; margin-top: 6px; }
  .session-start-form label { color: #888; font-size: 12px; }
  .session-start-form input, .session-start-form select { background: #0a0a1a; color: #e0e0e0; border: 1px solid #444; border-radius: 3px; padding: 4px 6px; font-family: monospace; font-size: 12px; }
</style>
</head>
<body>

<div class="container">
  <h1>DEMO DASHBOARD <span id="connStatus" class="disconnected">[disconnected]</span></h1>

  <!-- LEFT: Live Data -->
  <div>
    <div class="panel">
      <h2>Sensors</h2>
      <div class="data-grid">
        <div class="data-row"><span class="label">Pressure</span><span class="value" id="s-pressure">--</span></div>
        <div class="data-row"><span class="label">Target</span><span class="value" id="s-target">--</span></div>
        <div class="data-row"><span class="label">O2</span><span class="value" id="s-o2">--</span></div>
        <div class="data-row"><span class="label">Temperature</span><span class="value" id="s-temp">--</span></div>
        <div class="data-row"><span class="label">Humidity</span><span class="value" id="s-humidity">--</span></div>
        <div class="data-row"><span class="label">Difference</span><span class="value" id="s-diff">--</span></div>
      </div>
    </div>

    <div class="panel" style="margin-top:12px">
      <h2>Session</h2>
      <div class="data-grid">
        <div class="data-row"><span class="label">Status</span><span class="value" id="ss-status">--</span></div>
        <div class="data-row"><span class="label">Time</span><span class="value" id="ss-time">--</span></div>
        <div class="data-row"><span class="label">Progress</span><span class="value" id="ss-progress">--</span></div>
        <div class="data-row"><span class="label">Graph</span><span class="value" id="ss-graph">--</span></div>
        <div class="data-row"><span class="label">Step</span><span class="value" id="ss-step">--</span></div>
        <div class="data-row"><span class="label">Mask</span><span class="value" id="ss-mask">--</span></div>
        <div class="data-row"><span class="label">Mode</span><span class="value" id="ss-mode">--</span></div>
        <div class="data-row"><span class="label">Speed</span><span class="value" id="ss-speed">--</span></div>
        <div class="data-row"><span class="label">Door</span><span class="value" id="ss-door">--</span></div>
        <div class="data-row"><span class="label">Exit</span><span class="value" id="ss-exit">--</span></div>
        <div class="data-row"><span class="label">EOP</span><span class="value" id="ss-eop">--</span></div>
      </div>
    </div>

    <div class="panel" style="margin-top:12px">
      <h2>Control Values</h2>
      <div class="data-grid">
        <div class="data-row"><span class="label">pcontrol</span><span class="value" id="cv-pcontrol">--</span></div>
        <div class="data-row"><span class="label">Rate (FSW/min)</span><span class="value" id="cv-rate-fsw">--</span></div>
        <div class="data-row"><span class="label">Rate (bar/min)</span><span class="value" id="cv-rate-bar">--</span></div>
        <div class="data-row"><span class="label">Ventil</span><span class="value" id="cv-ventil">--</span></div>
        <div class="data-row"><span class="label">Vana Cikis</span><span class="value" id="cv-vanacikis">--</span></div>
        <div class="data-row"><span class="label">High O2</span><span class="value" id="cv-higho">--</span></div>
      </div>
    </div>

    <div class="panel" style="margin-top:12px">
      <h2>Comp/Decomp Params</h2>
      <div class="data-grid">
        <div class="data-row"><span class="label">comp_offset</span><span class="value" id="cp-comp-offset">--</span></div>
        <div class="data-row"><span class="label">comp_gain</span><span class="value" id="cp-comp-gain">--</span></div>
        <div class="data-row"><span class="label">comp_depth</span><span class="value" id="cp-comp-depth">--</span></div>
        <div class="data-row"><span class="label">decomp_offset</span><span class="value" id="cp-decomp-offset">--</span></div>
        <div class="data-row"><span class="label">decomp_gain</span><span class="value" id="cp-decomp-gain">--</span></div>
        <div class="data-row"><span class="label">decomp_depth</span><span class="value" id="cp-decomp-depth">--</span></div>
        <div class="data-row"><span class="label">minimumvalve</span><span class="value" id="cp-minimumvalve">--</span></div>
      </div>
    </div>

    <div class="panel" style="margin-top:12px">
      <h2>Alarms</h2>
      <div id="alarm-list" class="alarm-list"><em style="color:#555">No active alarms</em></div>
    </div>
  </div>

  <!-- RIGHT: Controls -->
  <div>
    <div class="panel">
      <h2>Session Control</h2>
      <div class="session-start-form">
        <label>Depth (bar)</label>
        <input type="number" id="inp-depth" value="1.5" step="0.1" min="0.5" max="3">
        <label>Duration (min)</label>
        <input type="number" id="inp-duration" value="90" step="1" min="10" max="180">
        <label>Speed</label>
        <select id="inp-speed">
          <option value="1">1 - Slow</option>
          <option value="2" selected>2 - Medium</option>
          <option value="3">3 - Fast</option>
        </select>
      </div>
      <div class="btn-group">
        <button class="success" onclick="sessionStart()">Start</button>
        <button onclick="sessionPause()">Pause</button>
        <button onclick="sessionResume()">Resume</button>
        <button class="danger" onclick="sessionStop()">Stop</button>
      </div>
    </div>

    <div class="panel" style="margin-top:12px">
      <h2>Edge Case Triggers</h2>
      <div class="btn-group">
        <button class="danger" onclick="send('setCikis', {value:1})">Manual Exit</button>
        <button onclick="send('setCikis', {value:0})">Cancel Exit</button>
      </div>
      <div class="btn-group">
        <button onclick="send('toggleDoor')">Toggle Door Sensor</button>
      </div>
      <div class="btn-group">
        <button class="danger" onclick="send('simulateHighO2', {value:true})">High O2 ON</button>
        <button onclick="send('simulateHighO2', {value:false})">High O2 OFF</button>
      </div>
      <div class="btn-group">
        <button class="danger" onclick="send('simulateHighHumidity', {value:true})">High Humidity ON</button>
        <button onclick="send('simulateHighHumidity', {value:false})">High Humidity OFF</button>
      </div>
    </div>

    <div class="panel" style="margin-top:12px">
      <h2>Oxygen / Ventilation</h2>
      <div class="btn-group">
        <button onclick="send('setOksijen', {value:1})">Mask ON</button>
        <button onclick="send('setOksijen', {value:0})">Mask OFF</button>
      </div>
      <div class="btn-group">
        <button onclick="send('setOtomanuel', {value:0})">Auto Mode</button>
        <button onclick="send('setOtomanuel', {value:1})">Manual Mode</button>
      </div>
      <div style="margin-top:8px">
        <label style="color:#888">Ventilation:</label>
        <select onchange="send('setVentil', {value:this.value})">
          <option value="0">Off</option>
          <option value="1">Low</option>
          <option value="2">Medium</option>
          <option value="3">High</option>
        </select>
      </div>
    </div>

    <div class="panel" style="margin-top:12px">
      <h2>Comp/Decomp Parameters</h2>
      <div class="param-group">
        <label>comp_offset</label>
        <input type="number" id="p-comp-offset" value="12" step="1" onchange="sendParam('comp_offset', this.value)">
        <label>comp_gain</label>
        <input type="number" id="p-comp-gain" value="8" step="0.5" onchange="sendParam('comp_gain', this.value)">
        <label>comp_depth</label>
        <input type="number" id="p-comp-depth" value="100" step="5" onchange="sendParam('comp_depth', this.value)">
        <label>decomp_offset</label>
        <input type="number" id="p-decomp-offset" value="14" step="1" onchange="sendParam('decomp_offset', this.value)">
        <label>decomp_gain</label>
        <input type="number" id="p-decomp-gain" value="7" step="0.5" onchange="sendParam('decomp_gain', this.value)">
        <label>decomp_depth</label>
        <input type="number" id="p-decomp-depth" value="100" step="5" onchange="sendParam('decomp_depth', this.value)">
        <label>minimumvalve</label>
        <input type="number" id="p-minimumvalve" value="12" step="1" onchange="sendParam('minimumvalve', this.value)">
      </div>
      <div class="btn-group" style="margin-top:8px">
        <button onclick="send('resetCompParams')">Reset to Defaults</button>
      </div>
    </div>
  </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const sock = io();

// Connection status
sock.on('connect', () => {
  document.getElementById('connStatus').textContent = '[connected]';
  document.getElementById('connStatus').className = 'connected';
});
sock.on('disconnect', () => {
  document.getElementById('connStatus').textContent = '[disconnected]';
  document.getElementById('connStatus').className = 'disconnected';
});

// Live sensor data
sock.on('sensorData', (d) => {
  document.getElementById('s-pressure').textContent = d.pressure + ' FSW';
  document.getElementById('s-o2').textContent = d.o2 + '%';
  document.getElementById('s-temp').textContent = d.temperature + ' C';
  document.getElementById('s-humidity').textContent = d.humidity + '%';
});

// Live session status
const statusLabels = { 0: 'Idle', 1: 'Running', 2: 'Paused', 3: 'Stopped' };
const graphLabels = { 0: 'Descent', 1: 'Ascent', 2: 'Flat' };

sock.on('sessionStatus', (s) => {
  // Session info
  const statusEl = document.getElementById('ss-status');
  statusEl.textContent = statusLabels[s.status] || s.status;
  statusEl.className = 'value ' + (s.status === 1 ? 'highlight' : s.status === 2 ? 'warning' : '');

  const min = String(Math.floor((s.zaman || 0) / 60)).padStart(2, '0');
  const sec = String((s.zaman || 0) % 60).padStart(2, '0');
  document.getElementById('ss-time').textContent = min + ':' + sec;

  const total = s.toplamSure ? (s.toplamSure * 60) : 0;
  document.getElementById('ss-progress').textContent = total ? Math.round((s.zaman / total) * 100) + '%' : '--';

  document.getElementById('ss-graph').textContent = graphLabels[s.grafikdurum] || s.grafikdurum;
  document.getElementById('ss-step').textContent = s.adim || '--';
  document.getElementById('ss-mask').textContent = s.oksijen ? 'ON' : 'OFF';
  document.getElementById('ss-mask').className = 'value ' + (s.oksijen ? 'highlight' : '');
  document.getElementById('ss-mode').textContent = s.otomanuel ? 'Manual' : 'Auto';
  document.getElementById('ss-speed').textContent = s.speed || '--';
  document.getElementById('ss-door').textContent = s.doorSensorStatus ? 'Closed' : 'Open';
  document.getElementById('ss-exit').textContent = s.cikis ? 'YES' : 'no';
  document.getElementById('ss-exit').className = 'value ' + (s.cikis ? 'warning' : '');
  document.getElementById('ss-eop').textContent = s.eop ? 'YES' : 'no';

  // Sensor target
  document.getElementById('s-target').textContent = ((s.hedef || 0) / 33.4).toFixed(2) + ' FSW';
  document.getElementById('s-diff').textContent = (typeof s.bufferdifference === 'number' ? s.bufferdifference.toFixed(2) : '--');

  // Control values
  document.getElementById('cv-pcontrol').textContent = (s.pcontrol || 0).toFixed(1);
  document.getElementById('cv-rate-fsw').textContent = (s.pressRateFswPerMin || 0).toFixed(2);
  document.getElementById('cv-rate-bar').textContent = (s.pressRateBarPerMin || 0).toFixed(4);
  document.getElementById('cv-ventil').textContent = s.ventil || 0;
  document.getElementById('cv-vanacikis').textContent = s.vanacikis || 0;
  document.getElementById('cv-higho').textContent = s.higho ? 'YES' : 'no';
  document.getElementById('cv-higho').className = 'value ' + (s.higho ? 'warning' : '');

  // Comp/decomp display
  document.getElementById('cp-comp-offset').textContent = s.comp_offset;
  document.getElementById('cp-comp-gain').textContent = s.comp_gain;
  document.getElementById('cp-comp-depth').textContent = s.comp_depth;
  document.getElementById('cp-decomp-offset').textContent = s.decomp_offset;
  document.getElementById('cp-decomp-gain').textContent = s.decomp_gain;
  document.getElementById('cp-decomp-depth').textContent = s.decomp_depth;
  document.getElementById('cp-minimumvalve').textContent = s.minimumvalve;

  // Sync input values with server (only if not focused)
  syncInput('p-comp-offset', s.comp_offset);
  syncInput('p-comp-gain', s.comp_gain);
  syncInput('p-comp-depth', s.comp_depth);
  syncInput('p-decomp-offset', s.decomp_offset);
  syncInput('p-decomp-gain', s.decomp_gain);
  syncInput('p-decomp-depth', s.decomp_depth);
  syncInput('p-minimumvalve', s.minimumvalve);
});

function syncInput(id, val) {
  const el = document.getElementById(id);
  if (el && document.activeElement !== el) {
    el.value = val;
  }
}

// Alarms
sock.on('alarmStatus', (a) => {
  const list = document.getElementById('alarm-list');
  if (!a || !a.activeAlarms || a.activeAlarms.length === 0) {
    list.innerHTML = '<em style="color:#555">No active alarms</em>';
    return;
  }
  list.innerHTML = a.activeAlarms.map(al =>
    '<div class="alarm-item"><b>' + al.type + '</b> — ' + al.text + '</div>'
  ).join('');
});

// Controls
function send(action, extra) {
  sock.emit('demoControl', { action, ...extra });
}

function sendParam(param, value) {
  sock.emit('demoControl', { action: 'setCompParam', param, value: Number(value) });
}

function sessionStart() {
  const depth = parseFloat(document.getElementById('inp-depth').value);
  const duration = parseInt(document.getElementById('inp-duration').value);
  const speed = parseInt(document.getElementById('inp-speed').value);
  sock.emit('sessionStart', {
    setDerinlik: depth,
    toplamSure: duration,
    dalisSuresi: speed,
  });
}

function sessionPause() { sock.emit('sessionPause'); }
function sessionResume() { sock.emit('sessionResume'); }
function sessionStop() { sock.emit('sessionStop'); }
</script>
</body>
</html>
```

**Step 2: Verify**

```bash
ls public/demo.html
```

**Step 3: Commit**

```bash
git add public/demo.html
git commit -m "feat: create demo dashboard HTML with live data and edge case controls"
```

---

### Task 3: Verify End-to-End

**Step 1: Start the server in demo mode**

Ensure `demoMode` is enabled in DB config, then:

```bash
npm start
```

**Step 2: Open dashboard**

Open `http://localhost:4001/demo.html` in browser.

Verify:
- Connection status shows `[connected]`
- Sensor values update every second
- Session status shows `Idle`

**Step 3: Test session lifecycle**

1. Click "Start" — verify status changes to `Running`, time counts up, pressure ramps
2. Click "Pause" — verify status changes to `Paused`, time stops
3. Click "Resume" — verify status changes to `Running`, time resumes
4. Click "Stop" — verify session ends

**Step 4: Test edge cases**

1. Start a session, then click "Manual Exit" — verify `cikis` shows `YES`, pressure starts descending
2. Click "High O2 ON" — verify alarm appears in alarm list
3. Click "Toggle Door Sensor" — verify door status toggles
4. Change `comp_gain` input value — verify the live display value updates on next tick

**Step 5: Commit**

```bash
git commit --allow-empty -m "test: verified demo dashboard end-to-end"
```

---

## Execution Order

Tasks 1-2 are independent (can be parallelized). Task 3 depends on both.

| Task | Description | Risk |
|------|-------------|------|
| 1 | Socket.IO server + demoControl handler + broadcast | Medium — touches index.js main loop |
| 2 | Demo dashboard HTML | Low — new file, no existing code modified |
| 3 | End-to-end verification | Low — testing only |
