/**
 * Seans raporu servisi: veri yükleme + HTML + PDF + Resend ile e-posta.
 * Hatalar fırlatılır; çağıran taraf (route veya auto-send) ele alır.
 */
const axios = require('axios');
const dayjs = require('dayjs');
const db = require('../models');
const { buildSessionReportHtml } = require('./sessionReportHtml');
const { htmlToPdf } = require('./pdf');

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

const mapStatus = (status) =>
	status === 'started' || status === 'paused' ? 'running' : status;

/**
 * Rapor/detay için seans verisini yükler (kayıt + olaylar + 10 sn örnekler).
 */
async function loadSessionReportData(id) {
	const record = await db.sessionRecords.findByPk(id, {
		include: [
			{ model: db.users, as: 'startedBy', attributes: ['id', 'name'] },
		],
	});
	if (!record) return null;

	const logs = await db.sessionSensorLogs.findAll({
		where: { sessionRecordId: record.id },
		attributes: [
			'sessionTime',
			'targetPressure',
			'pressure',
			'temperature',
			'humidity',
			'o2',
		],
		order: [['sessionTime', 'ASC']],
	});

	const samples = [];
	for (let i = 0; i < logs.length; i++) {
		const log = logs[i];
		if (log.sessionTime % 10 !== 0 && i !== logs.length - 1) continue;
		samples.push([
			log.sessionTime,
			r2(log.targetPressure),
			r2(log.pressure),
			r2(log.temperature),
			r2(log.humidity),
			r2(log.o2),
		]);
	}

	return {
		id: record.id,
		startTime: record.startedAt,
		endTime: record.endedAt,
		status: mapStatus(record.status),
		targetPressure: record.targetDepth,
		duration: record.totalDuration,
		speed: record.speed,
		startedBy: record.startedBy
			? { id: record.startedBy.id, name: record.startedBy.name }
			: null,
		events: record.events || [],
		samples,
	};
}

/**
 * Seans raporunu PDF olarak üretir.
 * @returns {Promise<{data: Object, pdf: Buffer}|null>}
 */
async function buildSessionReportPdf(id) {
	const data = await loadSessionReportData(id);
	if (!data) return null;
	const html = buildSessionReportHtml(data);
	const pdf = await htmlToPdf(html);
	return { data, pdf };
}

/**
 * Raporu Resend üzerinden e-posta ile gönderir.
 * @param {number} id - Seans kaydı ID
 * @param {string} [toOverride] - Alıcı (boşsa config.reportRecipientEmail)
 */
async function sendSessionReport(id, toOverride) {
	const cfg = global.appConfig || {};
	const apiKey = cfg.resendApiKey;
	const from = cfg.reportFromEmail;
	const to = toOverride || cfg.reportRecipientEmail;

	if (!apiKey) throw new Error('Resend API anahtarı ayarlı değil (config.resendApiKey)');
	if (!from) throw new Error('Gönderen adres ayarlı değil (config.reportFromEmail)');
	if (!to) throw new Error('Alıcı adres belirtilmedi');

	const result = await buildSessionReportPdf(id);
	if (!result) throw new Error('Seans kaydı bulunamadı');

	const { data, pdf } = result;
	const dateStr = dayjs(data.startTime).format('DD/MM/YYYY HH:mm');

	const response = await axios.post(
		'https://api.resend.com/emails',
		{
			from,
			to: [to],
			subject: `Hyperbaric Session Report — #${data.id} (${dateStr})`,
			html: `<p>Hello,</p>
<p>Please find attached the report for the hyperbaric session dated ${dateStr}.</p>
<ul>
<li>Session No: #${data.id}</li>
<li>Status: ${data.status}</li>
<li>Target Pressure: ${data.targetPressure != null ? data.targetPressure.toFixed(2) : '—'} bar</li>
<li>Planned Duration: ${data.duration ?? '—'} min</li>
</ul>
<p>Coral Control</p>`,
			attachments: [
				{
					filename: `session-report-${data.id}.pdf`,
					content: pdf.toString('base64'),
				},
			],
		},
		{
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			timeout: 30000,
		}
	);

	return { emailId: response.data?.id, to, sessionId: data.id };
}

module.exports = { loadSessionReportData, buildSessionReportPdf, sendSessionReport };
