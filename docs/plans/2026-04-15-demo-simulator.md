# Demo Simulator Improvement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `read_demo()` a realistic simulator for development/testing without PLC and operator training.

**Architecture:** Replace instant pressure assignment with linear ramp interpolation, replace hardcoded O2 break timer with profile step-type detection (matching `read()`'s approach), fix session reset to include all missing fields, and clean up verbose demo logs.

**Tech Stack:** Node.js, existing `LowPassFilter`, `sessionStatus` globals

**Constraints:**
- `read()` function MUST NOT be modified
- Changes limited to `read_demo()` (line 2074-2583) and the `setInterval` demo block (lines 1427-1438)
- No test suite exists — verify manually by running in demo mode

---

### Task 1: Linear Ramp Pressure Simulation

Replace the instant pressure assignment with a linear ramp that moves `main_fsw` toward the profile target at a realistic rate each second.

**Files:**
- Modify: `index.js:2097-2128` (pressure simulation block inside `read_demo()`)

**Step 1: Replace pressure simulation block**

Find the current block (lines 2097-2128) that starts with:
```js
// Simulate pressure based on profile (demo mode)zaxaza
```

Replace the entire pressure simulation section (lines 2098-2128) with:

```js
		// Simulate pressure based on profile — linear ramp toward target
		let targetPressure = 0;
		if (
			sessionStatus.profile.length > sessionStatus.zaman &&
			sessionStatus.profile[sessionStatus.zaman]
		) {
			targetPressure = sessionStatus.profile[sessionStatus.zaman][1];
		} else if (
			sessionStatus.profile.length > 0 &&
			sessionStatus.profile[sessionStatus.profile.length - 1]
		) {
			targetPressure = sessionStatus.profile[sessionStatus.profile.length - 1][1];
		}

		sessionStatus.hedef = targetPressure * 33.4;

		// Linear ramp: move main_fsw toward target at max 0.5 FSW/sec
		const maxRatePerSec = 0.5;
		const diff = targetPressure - sessionStatus.main_fsw;
		if (Math.abs(diff) <= maxRatePerSec) {
			sessionStatus.main_fsw = targetPressure;
		} else {
			sessionStatus.main_fsw += Math.sign(diff) * maxRatePerSec;
		}

		sensorData['pressure'] = filters.pressure.update(sessionStatus.main_fsw);
		sessionStatus.pressure = sessionStatus.main_fsw;
		sessionStatus.fsw = sessionStatus.main_fsw;
```

Also remove the duplicate assignment block that currently sits at lines 2123-2128:
```js
		// Update session status with simulated data
		sessionStatus.pressure = sessionStatus.hedef / 33.4;
		sessionStatus.main_fsw = sessionStatus.hedef / 33.4;
		sensorData['pressure'] = filters.pressure.update(
			sessionStatus.hedef / 33.4
		);
```

**Step 2: Verify manually**

```bash
npm start
```
- Set `demoMode: true` in config
- Start a session and confirm pressure ramps up gradually instead of jumping to target
- Confirm pressure ramps down at end of profile

**Step 3: Commit**

```bash
git add index.js
git commit -m "feat(demo): linear ramp pressure simulation instead of instant jump"
```

---

### Task 2: Profile-Based O2 Break Detection

Replace the hardcoded 60-second O2 break timer with step-type detection from the profile, matching how `read()` does it (lines 1568-1634).

**Files:**
- Modify: `index.js:2167-2265` (O2 break section inside `read_demo()`)

**Step 1: Replace O2 break logic**

Remove the entire O2 break section (lines 2167-2265) — from the comment `// Oksijen molası kontrolü - Düz grafik durumunda (demo mode)` through the closing brace of its else block (line 2265).

Replace with profile step-type detection:

```js
		// O2 break detection — based on profile step type transitions (air ↔ o)
		if (
			sessionStatus.profile[sessionStatus.zaman] &&
			sessionStatus.profile[sessionStatus.zaman + 1] &&
			sessionStatus.profile[sessionStatus.zaman][2] == 'air' &&
			sessionStatus.profile[sessionStatus.zaman + 1][2] == 'o' &&
			sessionStatus.oksijen == 0
		) {
			sessionStatus.oksijen = 1;
			alarmSet('oxygenBreak', 'Oxygen Starting. Put the mask on.', 0);
		} else if (
			sessionStatus.lastdurum === 2 &&
			sessionStatus.cikis == 0 &&
			sessionStatus.grafikdurum == 0
		) {
			sessionStatus.oksijen = 0;
			sessionStatus.oksijenBaslangicZamani = 0;
			sessionStatus.oksijenBitisZamani = 0;
			alarmSet(
				'treatmenFinished',
				'Treatment Finished. Take the mask off. Decompression Starting.',
				0
			);
			oxygenClose();
		} else if (
			sessionStatus.profile[sessionStatus.zaman] &&
			sessionStatus.profile[sessionStatus.zaman + 1] &&
			sessionStatus.profile[sessionStatus.zaman][2] == 'o' &&
			sessionStatus.profile[sessionStatus.zaman + 1][2] == 'air' &&
			sessionStatus.oksijen == 1
		) {
			sessionStatus.oksijen = 0;
			alarmSet('oxygenBreak', 'Oxygen Stopped. Take the mask off.', 0);
		}
```

Note: No `sendCommand()` calls in demo mode — those are PLC/Raspberry Pi hardware commands.

**Step 2: Verify manually**

- Start a session with a profile that has both `"air"` and `"o"` steps
- Confirm alarm fires on air→o transition ("Put the mask on")
- Confirm alarm fires on o→air transition ("Take the mask off")
- Confirm decompression alarm fires when leaving flat section

**Step 3: Commit**

```bash
git add index.js
git commit -m "feat(demo): O2 break detection from profile step type instead of hardcoded timer"
```

---

### Task 3: Fix Session Reset — Add Missing Fields

The `read_demo()` reset block (lines 2484-2525) is missing fields that exist in the initial `sessionStatus` definition (line 234) and in `read()`'s reset block (lines 1989-2028).

**Files:**
- Modify: `index.js:2484-2525` (session reset object inside `read_demo()`)

**Step 1: Replace the reset object**

Replace the entire `sessionStatus = { ... }` block (lines 2484-2525) with a complete reset that includes all missing fields:

```js
				sessionStatus = {
					status: 0,
					zaman: 0,
					dalisSuresi: 10,
					cikisSuresi: 10,
					hedeflenen: [],
					cikis: 0,
					grafikdurum: 0,
					adim: 0,
					adimzaman: [],
					maxadim: [],
					hedef: 0,
					lastdurum: 0,
					wait: 0,
					p2counter: 0,
					tempadim: 0,
					profile: [],
					minimumvalve: 12,
					otomanuel: 0,
					alarmzaman: 0,
					diffrencesayac: 0,
					higho: 0,
					highoc: 0,
					higho2: false,
					pauseTime: 0,
					starttime: 0,
					pausetime: 0,
					ilksure: 0,
					ilkfsw: 0,
					fswd: 0,
					pauseDepteh: 0,
					doorSensorStatus: 0,
					doorStatus: 0,
					pressure: 0,
					patientWarning: false,
					o2: 0,
					bufferdifference: [],
					olcum: [],
					ventil: 0,
					vanacikis: 30,
					main_fsw: 0,
					pcontrol: 0,
					comp_offset: 12,
					comp_gain: 8,
					comp_depth: 100,
					decomp_offset: 14,
					decomp_gain: 7,
					decomp_depth: 100,
					chamberStatus: 1,
					chamberStatusText: '',
					chamberStatusTime: null,
					setDerinlik: 1,
					toplamSure: 0,
					eop: 0,
					uyariyenile: 0,
					duzGrafikBaslangicZamani: 0,
					sonOksijenMolasi: 0,
					oksijenMolasiAktif: false,
					sessionStartTime: dayjs(),
					oksijen: 0,
					oksijenBaslangicZamani: 0,
					oksijenBitisZamani: 0,
					speed: 1,
					highHumidity: false,
					humidityAlarmLevel: 70,
					deviationAlarm: false,
					pressRateFswPerMin: 0,
					pressRateBarPerMin: 0,
					patientWarningStatus: 0,
					cloudSessionId: null,
				};
```

**Step 2: Verify manually**

- Run a demo session to completion
- Start a second session — confirm no stale state from first session
- Check that `sessionStatus` matches initial state after reset

**Step 3: Commit**

```bash
git add index.js
git commit -m "fix(demo): complete session reset with all missing fields"
```

---

### Task 4: Clean Up Verbose Demo Logs

Remove or reduce the excessive `console.log` calls in `read_demo()`. Keep only meaningful state change logs.

**Files:**
- Modify: `index.js:2074-2583` (entire `read_demo()` function)

**Step 1: Remove verbose logs**

Remove these `console.log` calls throughout `read_demo()`:
- Line 2076-2083: status/zaman/grafikdurum dump on every tick — **remove**
- Line 2140: `hedef (demo)` — **remove**
- Lines 2186-2193, 2199-2205, 2229-2231, 2256-2263: O2 state change logs — **these will already be removed by Task 2**
- Lines 2233-2240: O2 timer state — **already removed by Task 2**
- Line 2319: `difference (demo)` — **remove**
- Lines 2320-2324: `pressure (demo)` — **remove**
- Line 2351: `avgDiff (demo)` — **remove**
- Lines 2373-2383: "Would open/close valve" logs — **remove entire valve simulation console.logs**
- Lines 2389-2398: Flat section valve logs — **remove**
- Line 2401: Descent valve log — **remove**
- Lines 2429-2434: Ventilation mode log — **remove**
- Line 2439: Exit decomp log — **remove**
- Lines 2448-2454: zaman/profile.length dump — **remove**
- Line 2543: Demo time — **keep** (useful for monitoring)

**Step 2: Verify manually**

- Run a demo session and confirm console output is clean
- Confirm the time display log still appears

**Step 3: Commit**

```bash
git add index.js
git commit -m "chore(demo): remove verbose console.log calls from read_demo"
```

---

## Execution Order

Tasks 1-4 are sequential — each builds on the previous.

| Task | Description | Risk |
|------|-------------|------|
| 1 | Linear ramp pressure | Low — isolated change |
| 2 | Profile-based O2 breaks | Medium — replaces complex timer logic |
| 3 | Session reset fields | Low — additive change |
| 4 | Clean up logs | Low — removal only |
