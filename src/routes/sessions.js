const express = require('express');
const db = require('../models');
const dayjs = require('dayjs');
const { sendSessionReport, buildSessionReportPdf } = require('../reports');

const router = express.Router();

/**
 * Tüm seans kayıtlarını listele
 * GET /api/sessions
 * Query params: limit, offset, status, startDate, endDate
 */
router.get('/api/sessions', async (req, res) => {
	try {
		const {
			limit = 50,
			offset = 0,
			status,
			startDate,
			endDate,
		} = req.query;

		const where = {};

		if (status) {
			where.status = status;
		}

		if (startDate) {
			where.startedAt = { ...where.startedAt, [db.Sequelize.Op.gte]: new Date(startDate) };
		}

		if (endDate) {
			where.startedAt = { ...where.startedAt, [db.Sequelize.Op.lte]: new Date(endDate) };
		}

		const sessions = await db.sessionRecords.findAndCountAll({
			where,
			limit: parseInt(limit),
			offset: parseInt(offset),
			order: [['startedAt', 'DESC']],
			include: [
				{
					model: db.users,
					as: 'startedBy',
					attributes: ['id', 'name', 'username'],
				},
			],
		});

		res.json({
			total: sessions.count,
			limit: parseInt(limit),
			offset: parseInt(offset),
			data: sessions.rows,
		});
	} catch (error) {
		console.error('Error fetching sessions:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Belirli bir seans kaydının detaylarını getir
 * GET /api/sessions/:id
 */
router.get('/api/sessions/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const { includeLogs = 'true' } = req.query;

		const include = [
			{
				model: db.users,
				as: 'startedBy',
				attributes: ['id', 'name', 'username'],
			},
		];

		// Sensör loglarını dahil et (varsayılan olarak dahil)
		if (includeLogs === 'true') {
			include.push({
				model: db.sessionSensorLogs,
				as: 'sensorLogs',
				order: [['sessionTime', 'ASC']],
			});
		}

		const session = await db.sessionRecords.findByPk(id, { include });

		if (!session) {
			return res.status(404).json({ error: 'Seans kaydı bulunamadı' });
		}

		res.json(session);
	} catch (error) {
		console.error('Error fetching session:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Seans istatistikleri
 * GET /api/sessions/stats
 */
router.get('/api/sessions/stats', async (req, res) => {
	try {
		const totalSessions = await db.sessionRecords.count();
		const completedSessions = await db.sessionRecords.count({
			where: { status: 'completed' },
		});
		const stoppedSessions = await db.sessionRecords.count({
			where: { status: 'stopped' },
		});

		// Son 7 günün seansları
		const lastWeekSessions = await db.sessionRecords.count({
			where: {
				startedAt: {
					[db.Sequelize.Op.gte]: dayjs().subtract(7, 'day').toDate(),
				},
			},
		});

		// Ortalama seans süresi (saniye)
		const avgDuration = await db.sessionRecords.findOne({
			attributes: [
				[db.Sequelize.fn('AVG', db.Sequelize.col('totalDuration')), 'avgDuration'],
			],
			where: {
				endedAt: { [db.Sequelize.Op.ne]: null },
			},
		});

		res.json({
			totalSessions,
			completedSessions,
			stoppedSessions,
			lastWeekSessions,
			avgDuration: avgDuration?.dataValues?.avgDuration || 0,
		});
	} catch (error) {
		console.error('Error fetching session stats:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Belirli bir seansın sensör loglarını getir (sayfalama ile)
 * GET /api/sessions/:id/logs
 */
router.get('/api/sessions/:id/logs', async (req, res) => {
	try {
		const { id } = req.params;
		const { limit = 1000, offset = 0 } = req.query;

		const logs = await db.sessionSensorLogs.findAndCountAll({
			where: { sessionRecordId: id },
			limit: parseInt(limit),
			offset: parseInt(offset),
			order: [['sessionTime', 'ASC']],
		});

		res.json({
			total: logs.count,
			limit: parseInt(limit),
			offset: parseInt(offset),
			data: logs.rows,
		});
	} catch (error) {
		console.error('Error fetching session logs:', error);
		res.status(500).json({ error: error.message });
	}
});

// ---------------------------------------------------------------------------
// Mobil History ekranı uçları (hiper-flow). Mevcut /api/sessions uçlarından
// bağımsız; response şekli stack-flow History kontratıyla aynı.
// ---------------------------------------------------------------------------

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

// DB status -> mobil status ('started'/'paused' devam eden seanstır)
const mapStatus = (status) =>
	status === 'started' || status === 'paused' ? 'running' : status;

const toSummary = (record) => ({
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
});

/**
 * Özet liste — sensör logları response'a girmez.
 * GET /api/session-history?limit&offset
 */
router.get('/api/session-history', async (req, res) => {
	try {
		const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
		const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

		const rows = await db.sessionRecords.findAll({
			order: [['startedAt', 'DESC']],
			limit,
			offset,
			include: [
				{
					model: db.users,
					as: 'startedBy',
					attributes: ['id', 'name'],
				},
			],
		});

		const data = rows.map((record) => {
			const events = record.events || [];
			return {
				...toSummary(record),
				pauseCount: events.filter((e) => e.type === 'pause').length,
			};
		});

		res.json({ success: true, data });
	} catch (error) {
		console.error('Error fetching session history:', error);
		res.status(500).json({ success: false, errorMessage: error.message });
	}
});

/**
 * Detay — özet alanlar + olaylar + 10 sn'e seyreltilmiş örnekler.
 * samples satırı: [t, hedefBar, basınçBar, sıcaklık, nem, o2]
 * GET /api/session-history/:id
 */
router.get('/api/session-history/:id', async (req, res) => {
	try {
		const record = await db.sessionRecords.findByPk(req.params.id, {
			include: [
				{
					model: db.users,
					as: 'startedBy',
					attributes: ['id', 'name'],
				},
			],
		});

		if (!record) {
			return res
				.status(404)
				.json({ success: false, errorMessage: 'Seans kaydı bulunamadı' });
		}

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

		// 1 Hz logları 10 sn'e seyrelt; son örnek her zaman dahil
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

		res.json({
			success: true,
			data: {
				...toSummary(record),
				events: record.events || [],
				samples,
			},
		});
	} catch (error) {
		console.error('Error fetching session history detail:', error);
		res.status(500).json({ success: false, errorMessage: error.message });
	}
});

/**
 * Seans raporunu PDF olarak indir (önizleme / manuel).
 * GET /api/session-history/:id/report.pdf
 */
router.get('/api/session-history/:id/report.pdf', async (req, res) => {
	try {
		const result = await buildSessionReportPdf(req.params.id);
		if (!result) {
			return res
				.status(404)
				.json({ success: false, errorMessage: 'Seans kaydı bulunamadı' });
		}
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader(
			'Content-Disposition',
			`inline; filename="seans-raporu-${req.params.id}.pdf"`
		);
		res.send(result.pdf);
	} catch (error) {
		console.error('Error building session report PDF:', error);
		res.status(500).json({ success: false, errorMessage: error.message });
	}
});

/**
 * Seans raporunu Resend ile e-posta gönder.
 * POST /api/session-history/:id/send-report  body: { email? }
 */
router.post('/api/session-history/:id/send-report', async (req, res) => {
	try {
		const { email } = req.body || {};
		const result = await sendSessionReport(req.params.id, email);
		res.json({ success: true, data: result });
	} catch (error) {
		console.error('Error sending session report:', error);
		res.status(500).json({ success: false, errorMessage: error.message });
	}
});

module.exports = router;
