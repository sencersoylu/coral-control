const express = require('express');
const db = require('../models');
const dayjs = require('dayjs');

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

module.exports = router;
