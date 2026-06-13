/**
 * Seans raporu HTML şablonu. Grafik inline SVG olarak elle çizilir —
 * harici grafik kütüphanesi yok. Çıktı, headless Chromium ile A4 PDF'e
 * render edilmek üzere tasarlandı.
 */
const dayjs = require('dayjs');

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

const esc = (s) =>
	String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

const fmtClock = (t) => {
	const m = Math.floor(t / 60);
	const s = Math.floor(t % 60);
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const fmtDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—');

const STATUS_LABELS = {
	running: 'Running',
	completed: 'Completed',
	stopped: 'Stopped',
	interrupted: 'Interrupted',
};

const EVENT_LABELS = {
	pause: 'Paused',
	resume: 'Resumed',
	stop: 'Stopped',
	complete: 'Completed',
};

/**
 * Basınç grafiğini SVG olarak üretir.
 * samples: [[t, hedefBar, basınçBar, sıcaklık, nem, o2], ...]
 */
function buildChartSvg(samples, events, width = 1040, height = 380) {
	const PAD_L = 56;
	const PAD_R = 16;
	const PAD_T = 14;
	const PAD_B = 36;
	const w = width - PAD_L - PAD_R;
	const h = height - PAD_T - PAD_B;

	if (!samples.length) {
		return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
			<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#9aa3ad" font-size="16">No sensor data</text>
		</svg>`;
	}

	const tEnd = Math.max(samples[samples.length - 1][0], 1);
	const pMax =
		Math.max(0.5, ...samples.map((s) => s[2]), ...samples.map((s) => s[1])) * 1.1;
	const x = (t) => PAD_L + (t / tEnd) * w;
	const y = (v) => PAD_T + h - (v / pMax) * h;

	const pts = (idx) =>
		samples.map((s) => `${r2(x(s[0]))},${r2(y(s[idx]))}`).join(' ');

	const targetPts = pts(1);
	const actualPts = pts(2);
	const fillPts = `${r2(x(samples[0][0]))},${PAD_T + h} ${actualPts} ${r2(
		x(samples[samples.length - 1][0])
	)},${PAD_T + h}`;

	// Pause bantları: pause→resume çiftleri
	const bands = [];
	let open = null;
	for (const ev of events) {
		if (ev.type === 'pause' && !open) open = ev.t;
		else if (ev.type === 'resume' && open != null) {
			bands.push([open, ev.t]);
			open = null;
		}
	}
	if (open != null) bands.push([open, tEnd]);

	// Y ekseni 5 adım, X ekseni 10 dk (uzun seansta 20 dk)
	const ySteps = [0, 0.25, 0.5, 0.75, 1].map((f) => pMax * f);
	const xStep = tEnd > 3600 ? 1200 : 600;
	const xTicks = [];
	for (let t = 0; t <= tEnd; t += xStep) xTicks.push(t);

	const grid = ySteps
		.map(
			(v) => `
		<line x1="${PAD_L}" y1="${r2(y(v))}" x2="${PAD_L + w}" y2="${r2(y(v))}" stroke="#e3e7ec" stroke-width="1"/>
		<text x="${PAD_L - 8}" y="${r2(y(v)) + 4}" text-anchor="end" fill="#7a8694" font-size="12">${v.toFixed(2)}</text>`
		)
		.join('');

	const xLabels = xTicks
		.map(
			(t) => `
		<line x1="${r2(x(t))}" y1="${PAD_T}" x2="${r2(x(t))}" y2="${PAD_T + h}" stroke="#eef1f4" stroke-width="1"/>
		<text x="${r2(x(t))}" y="${height - 12}" text-anchor="middle" fill="#7a8694" font-size="12">${Math.round(t / 60)} min</text>`
		)
		.join('');

	const bandRects = bands
		.map(
			([t1, t2]) => `
		<rect x="${r2(x(t1))}" y="${PAD_T}" width="${Math.max(r2(x(t2) - x(t1)), 2)}" height="${h}" fill="#f5a623" opacity="0.16"/>
		<line x1="${r2(x(t1))}" y1="${PAD_T}" x2="${r2(x(t1))}" y2="${PAD_T + h}" stroke="#f5a623" stroke-width="1.5" stroke-dasharray="4,4"/>`
		)
		.join('');

	return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
		${grid}
		${xLabels}
		${bandRects}
		<polygon points="${fillPts}" fill="#1976d2" opacity="0.10"/>
		<polyline points="${actualPts}" fill="none" stroke="#1976d2" stroke-width="2.5"/>
		<polyline points="${targetPts}" fill="none" stroke="#00897b" stroke-width="2" stroke-dasharray="8,5"/>
	</svg>`;
}

function seriesStats(samples, idx) {
	const vals = samples.map((s) => s[idx]).filter((v) => Number.isFinite(v) && v !== 0);
	if (!vals.length) return null;
	return {
		min: Math.min(...vals),
		max: Math.max(...vals),
		avg: vals.reduce((a, b) => a + b, 0) / vals.length,
	};
}

/**
 * @param {Object} data - { id, startTime, endTime, status, targetPressure,
 *   duration, speed, startedBy, events, samples }
 * @returns {string} self-contained HTML
 */
function buildSessionReportHtml(data) {
	const { samples = [], events = [] } = data;
	const tEnd = samples.length ? samples[samples.length - 1][0] : 0;
	const maxP = samples.length ? Math.max(...samples.map((s) => s[2])) : 0;
	const o2 = seriesStats(samples, 5);
	const temp = seriesStats(samples, 3);
	const hum = seriesStats(samples, 4);
	const pauses = events.filter((e) => e.type === 'pause').length;

	const statRow = (label, st, unit) =>
		st
			? `<tr><td>${label}</td><td>${st.min.toFixed(1)} ${unit}</td><td>${st.avg.toFixed(1)} ${unit}</td><td>${st.max.toFixed(1)} ${unit}</td></tr>`
			: `<tr><td>${label}</td><td colspan="3">—</td></tr>`;

	const eventRows = events.length
		? events
				.map(
					(e) => `<tr>
			<td>${fmtClock(e.t)}</td>
			<td>${EVENT_LABELS[e.type] || esc(e.type)}${e.reason === 'deviation' ? ' (deviation)' : ''}</td>
			<td>${e.pressure != null ? `${e.pressure.toFixed(2)} bar` : '—'}</td>
		</tr>`
				)
				.join('')
		: '<tr><td colspan="3">No events recorded</td></tr>';

	return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<style>
	* { box-sizing: border-box; margin: 0; padding: 0; }
	body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #232a31; padding: 36px 40px; font-size: 13px; }
	.header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #1976d2; padding-bottom: 12px; margin-bottom: 20px; }
	.header h1 { font-size: 22px; color: #14334d; }
	.header .brand { font-size: 15px; font-weight: 700; color: #1976d2; letter-spacing: 1px; }
	.meta { color: #7a8694; font-size: 12px; margin-bottom: 18px; }
	.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
	.cell { border: 1px solid #e3e7ec; border-radius: 8px; padding: 10px 12px; }
	.cell .k { color: #7a8694; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
	.cell .v { font-size: 16px; font-weight: 700; margin-top: 3px; }
	h2 { font-size: 14px; color: #14334d; margin: 18px 0 8px; }
	.legend { font-size: 11px; color: #7a8694; margin: 6px 0 0; }
	.legend span { display: inline-block; margin-right: 18px; }
	.swatch { display: inline-block; width: 18px; height: 4px; border-radius: 2px; vertical-align: middle; margin-right: 6px; }
	table { width: 100%; border-collapse: collapse; margin-top: 6px; }
	th, td { border: 1px solid #e3e7ec; padding: 7px 10px; text-align: left; }
	th { background: #f4f7fa; color: #51606e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
	.footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e3e7ec; color: #9aa3ad; font-size: 11px; display: flex; justify-content: space-between; }
	.chart-box { border: 1px solid #e3e7ec; border-radius: 8px; padding: 8px; }
</style>
</head>
<body>
	<div class="header">
		<h1>Hyperbaric Session Report</h1>
		<div class="brand">CORAL</div>
	</div>
	<div class="meta">Session #${esc(data.id)} · ${fmtDate(data.startTime)}${data.startedBy ? ` · Operator: ${esc(data.startedBy.name)}` : ''}</div>

	<div class="grid">
		<div class="cell"><div class="k">Start</div><div class="v">${fmtDate(data.startTime)}</div></div>
		<div class="cell"><div class="k">End</div><div class="v">${fmtDate(data.endTime)}</div></div>
		<div class="cell"><div class="k">Status</div><div class="v">${STATUS_LABELS[data.status] || esc(data.status)}</div></div>
		<div class="cell"><div class="k">Pauses</div><div class="v">${pauses}</div></div>
		<div class="cell"><div class="k">Planned Duration</div><div class="v">${data.duration ?? '—'} min</div></div>
		<div class="cell"><div class="k">Actual Duration</div><div class="v">${fmtClock(tEnd)}</div></div>
		<div class="cell"><div class="k">Target Pressure</div><div class="v">${data.targetPressure != null ? data.targetPressure.toFixed(2) : '—'} bar</div></div>
		<div class="cell"><div class="k">Max Pressure</div><div class="v">${maxP.toFixed(2)} bar</div></div>
	</div>

	<h2>Pressure Chart</h2>
	<div class="chart-box">
		${buildChartSvg(samples, events)}
		<div class="legend">
			<span><i class="swatch" style="background:#00897b"></i>Target pressure</span>
			<span><i class="swatch" style="background:#1976d2"></i>Actual pressure</span>
			<span><i class="swatch" style="background:#f5a623"></i>Paused</span>
		</div>
	</div>

	<h2>Environment Values</h2>
	<table>
		<tr><th>Sensor</th><th>Min</th><th>Average</th><th>Max</th></tr>
		${statRow('O₂', o2, '%')}
		${statRow('Temperature', temp, '°C')}
		${statRow('Humidity', hum, '%')}
	</table>

	<h2>Events</h2>
	<table>
		<tr><th>Time</th><th>Event</th><th>Pressure</th></tr>
		${eventRows}
	</table>

	<div class="footer">
		<span>Coral Control — automatically generated report</span>
		<span>${dayjs().format('DD/MM/YYYY HH:mm')}</span>
	</div>
</body>
</html>`;
}

module.exports = { buildSessionReportHtml };
