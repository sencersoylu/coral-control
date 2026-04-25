const express = require('express');
const router = express.Router();
const db = require('../models/index');
const {
	successResponse,
	errorResponse,
	authenticateJWT,
} = require('../helpers/index');

// Tüm O2 kalibrasyon endpoint'leri JWT korumalı
router.use('/api/o2', authenticateJWT);

// Yardımcı: config satırını getir / oluştur
async function getOrCreateConfig() {
	let config = await db.config.findOne({ where: { id: 1 } });
	if (!config) config = await db.config.create({});
	return config;
}

// POST /api/o2/calibrate/21
router.post('/api/o2/calibrate/21', async (req, res) => {
	try {
		const { rawValue: bodyRaw, note } = req.body || {};
		const rawValue =
			typeof bodyRaw === 'number'
				? bodyRaw
				: global.sensorData && typeof global.sensorData.o2RawValue === 'number'
				? global.sensorData.o2RawValue
				: null;

		if (rawValue == null) {
			return res.status(400).json({ error: 'rawValue not provided and no live sensor reading available' });
		}
		if (rawValue < 0 || rawValue > 16383) {
			return res.status(400).json({ error: 'rawValue must be between 0 and 16383' });
		}

		// Mevcut davranışı koru: setO2CalibrationPoint tüm noktaları rawValue'dan türetir
		if (typeof global.setO2CalibrationPoint !== 'function') {
			return errorResponse(req, res, 'O2 calibration function not available');
		}
		await global.setO2CalibrationPoint('21', rawValue, 21);

		const now = new Date();
		const config = await getOrCreateConfig();
		await config.update({ o2Point21LastCalibration: now });
		global.appConfig = config.toJSON();
		if (typeof global.applyConfigToApp === 'function') global.applyConfigToApp();

		const log = await db.o2CalibrationLogs.create({
			type: '21',
			rawValue,
			percentage: 21,
			performedBy: req.user && req.user.id ? req.user.id : null,
			note: note || null,
		});

		successResponse(req, res, { config, log });
	} catch (err) {
		errorResponse(req, res, err.message);
	}
});

// POST /api/o2/calibrate/100
router.post('/api/o2/calibrate/100', async (req, res) => {
	try {
		const { rawValue: bodyRaw, note } = req.body || {};
		const rawValue =
			typeof bodyRaw === 'number'
				? bodyRaw
				: global.sensorData && typeof global.sensorData.o2RawValue === 'number'
				? global.sensorData.o2RawValue
				: null;

		if (rawValue == null) {
			return res.status(400).json({ error: 'rawValue not provided and no live sensor reading available' });
		}
		if (rawValue < 0 || rawValue > 16383) {
			return res.status(400).json({ error: 'rawValue must be between 0 and 16383' });
		}

		if (typeof global.setO2CalibrationPoint !== 'function') {
			return errorResponse(req, res, 'O2 calibration function not available');
		}
		// Proje konvansiyonu: setO2CalibrationPoint çağrısını koru
		await global.setO2CalibrationPoint('100', rawValue, 100);

		const now = new Date();
		const config = await getOrCreateConfig();
		await config.update({ o2Point100LastCalibration: now });
		global.appConfig = config.toJSON();
		if (typeof global.applyConfigToApp === 'function') global.applyConfigToApp();

		const log = await db.o2CalibrationLogs.create({
			type: '100',
			rawValue,
			percentage: 100,
			performedBy: req.user && req.user.id ? req.user.id : null,
			note: note || null,
		});

		successResponse(req, res, { config, log });
	} catch (err) {
		errorResponse(req, res, err.message);
	}
});

// POST /api/o2/sensor-change
router.post('/api/o2/sensor-change', async (req, res) => {
	try {
		const { note } = req.body || {};
		const now = new Date();

		const config = await getOrCreateConfig();
		await config.update({ o2SensorLastChange: now });
		global.appConfig = config.toJSON();
		if (typeof global.applyConfigToApp === 'function') global.applyConfigToApp();

		const log = await db.o2CalibrationLogs.create({
			type: 'sensor_change',
			rawValue: null,
			percentage: null,
			performedBy: req.user && req.user.id ? req.user.id : null,
			note: note || null,
		});

		successResponse(req, res, { config, log });
	} catch (err) {
		errorResponse(req, res, err.message);
	}
});

// GET /api/o2/status
router.get('/api/o2/status', async (req, res) => {
	try {
		const config = await getOrCreateConfig();
		const c = config.toJSON();
		const status = {
			point21LastCalibration: c.o2Point21LastCalibration || null,
			point100LastCalibration: c.o2Point100LastCalibration || null,
			sensorLastChange: c.o2SensorLastChange || null,
			currentRaw:
				global.sensorData && typeof global.sensorData.o2RawValue === 'number'
					? global.sensorData.o2RawValue
					: null,
			currentPercentage:
				global.sensorData && typeof global.sensorData.o2 === 'number'
					? global.sensorData.o2
					: null,
			isCalibrated: !!(global.o2CalibrationData && global.o2CalibrationData.isCalibrated),
			o2AlarmValuePercentage: c.o2AlarmValuePercentage,
			o2AlarmOn: !!c.o2AlarmOn,
		};
		successResponse(req, res, status);
	} catch (err) {
		errorResponse(req, res, err.message);
	}
});

// GET /api/o2/logs?limit=50&type=21
router.get('/api/o2/logs', async (req, res) => {
	try {
		let limit = parseInt(req.query.limit, 10);
		if (!Number.isFinite(limit) || limit <= 0) limit = 50;
		if (limit > 200) limit = 200;

		const where = {};
		if (req.query.type) {
			const t = String(req.query.type);
			if (!['21', '100', 'sensor_change'].includes(t)) {
				return res.status(400).json({ error: "type must be one of '21', '100', 'sensor_change'" });
			}
			where.type = t;
		}

		const logs = await db.o2CalibrationLogs.findAll({
			where,
			order: [['createdAt', 'DESC']],
			limit,
		});
		successResponse(req, res, logs);
	} catch (err) {
		errorResponse(req, res, err.message);
	}
});

module.exports = router;
