const express = require('express');
const router = express.Router();
const db = require('../models/index');
const { errorResponse, successResponse } = require('../helpers/index');

const defaultConfigValues = {
	projectID: 'ARC-02',
	chamberType: 'monoplace',
	pressureLimit: null,
	sessionCounterLimit: null,
	sessionTimeLimit: null,
	o2SensorLastCalibration: null,
	o2SensorLastChange: null,
	o2GeneratorLastMaintenance: null,
	chamberLastMaintenance: null,
	sessionCounter: null,
	installationDate: null,
	lastSessionDate: null,
	// Valve Control
	compOffset: 14,
	compGain: 8,
	compDepth: 100,
	decompOffset: 14,
	decompGain: 7,
	decompDepth: 100,
	minimumValve: 12,
	humidityAlarmLevel: 70,
	// Last Session
	lastSessionDepth: 1.4,
	lastSessionDuration: 60,
	lastSessionSpeed: 1,
	// O2 Calibration
	o2Point0Raw: 0,
	o2Point0Percentage: 0,
	o2Point21Raw: 828,
	o2Point21Percentage: 21,
	o2Point100Raw: 16383,
	o2Point100Percentage: 100,
	o2CalibrationDate: null,
	o2AlarmValuePercentage: 23.5,
	o2AlarmOn: false,
	// Filter Alpha
	filterAlphaPressure: 0.35,
	filterAlphaO2: 0.2,
	filterAlphaTemperature: 0.25,
	filterAlphaHumidity: 0.25,
	// Alarm
	highO2Level: 23,
	// Oxygen Break
	oxygenDuration: 15,
	airBreakDuration: 5,
	// PLC
	plcIpAddress: '192.168.77.100',
	plcPort: 4000,
	// Demo
	demoMode: false,
	// Default Session
	defaultDalisSuresi: 10,
	defaultCikisSuresi: 10,
	defaultToplamSure: 60,
	defaultSetDerinlik: 1.4,
	defaultSpeed: 1,
	// Valve Analog
	compressionValveAnalog: 9000,
	decompressionValveAnalog: 3500,
	// Cloud Sync
	cloudApiUrl: '',
	chamberApiKey: '',
	// Network & Signaling
	signalingUrl: 'ws://192.168.1.12:8080/ws',
	wsCommandUrl: 'ws://192.168.77.100:8080/ws',
	serverId: 'server-1',
	targetId: 'raspi-1',
	// Auth
	jwtSecret: 'coral-secret',
	// Server
	serverPort: 4001,
	// Intervals (ms)
	sensorUpdateInterval: 10000,
	heartbeatInterval: 30000,
};

// GET /config/getConfig
router.get('/config/getConfig', async (req, res) => {
	try {
		let config = await db.config.findOne({ where: { id: 1 } });
		if (!config) {
			config = await db.config.create(defaultConfigValues);
		}
		successResponse(req, res, config);
	} catch (error) {
		errorResponse(req, res, error.message);
	}
});

// POST /config/updateConfig
router.post('/config/updateConfig', async (req, res) => {
	try {
		let config = await db.config.findOne({ where: { id: 1 } });
		if (!config) {
			config = await db.config.create(defaultConfigValues);
		}
		await config.update(req.body);
		global.appConfig = config.toJSON();
		if (typeof global.applyConfigToApp === 'function') {
			global.applyConfigToApp();
		}
		if (global.cloudReporter) {
			global.cloudReporter.updateConfig(config.toJSON());
		}
		successResponse(req, res, config);
	} catch (error) {
		errorResponse(req, res, error.message);
	}
});

// POST /config/resetConfig
router.post('/config/resetConfig', async (req, res) => {
	try {
		let config = await db.config.findOne({ where: { id: 1 } });
		if (!config) {
			config = await db.config.create(defaultConfigValues);
		} else {
			await config.update(defaultConfigValues);
		}
		global.appConfig = config.toJSON();
		if (typeof global.applyConfigToApp === 'function') {
			global.applyConfigToApp();
		}
		if (global.cloudReporter) {
			global.cloudReporter.updateConfig(config.toJSON());
		}
		successResponse(req, res, config);
	} catch (error) {
		errorResponse(req, res, error.message);
	}
});

// PATCH /config/updateConfigField
router.patch('/config/updateConfigField', async (req, res) => {
	try {
		const { field, value } = req.body;
		if (!field) {
			return res.status(400).json({ error: 'field is required' });
		}
		let config = await db.config.findOne({ where: { id: 1 } });
		if (!config) {
			config = await db.config.create(defaultConfigValues);
		}
		await config.update({ [field]: value });
		global.appConfig = config.toJSON();
		if (typeof global.applyConfigToApp === 'function') {
			global.applyConfigToApp();
		}
		if (global.cloudReporter) {
			global.cloudReporter.updateConfig(config.toJSON());
		}
		successResponse(req, res, config);
	} catch (error) {
		errorResponse(req, res, error.message);
	}
});

// POST /config/updateO2Calibration
router.post('/config/updateO2Calibration', async (req, res) => {
	try {
		const {
			o2Point0Raw, o2Point0Percentage,
			o2Point21Raw, o2Point21Percentage,
			o2Point100Raw, o2Point100Percentage,
			o2AlarmValuePercentage, o2AlarmOn,
		} = req.body;

		let config = await db.config.findOne({ where: { id: 1 } });
		if (!config) {
			config = await db.config.create(defaultConfigValues);
		}

		const updates = {};
		if (o2Point0Raw !== undefined) updates.o2Point0Raw = o2Point0Raw;
		if (o2Point0Percentage !== undefined) updates.o2Point0Percentage = o2Point0Percentage;
		if (o2Point21Raw !== undefined) updates.o2Point21Raw = o2Point21Raw;
		if (o2Point21Percentage !== undefined) updates.o2Point21Percentage = o2Point21Percentage;
		if (o2Point100Raw !== undefined) updates.o2Point100Raw = o2Point100Raw;
		if (o2Point100Percentage !== undefined) updates.o2Point100Percentage = o2Point100Percentage;
		if (o2AlarmValuePercentage !== undefined) updates.o2AlarmValuePercentage = o2AlarmValuePercentage;
		if (o2AlarmOn !== undefined) updates.o2AlarmOn = o2AlarmOn;
		updates.o2CalibrationDate = new Date();

		await config.update(updates);
		global.appConfig = config.toJSON();
		if (typeof global.applyConfigToApp === 'function') {
			global.applyConfigToApp();
		}
		if (global.cloudReporter) {
			global.cloudReporter.updateConfig(config.toJSON());
		}
		successResponse(req, res, config);
	} catch (error) {
		errorResponse(req, res, error.message);
	}
});

// POST /config/updateControlParams
router.post('/config/updateControlParams', async (req, res) => {
	try {
		const {
			compOffset, compGain, compDepth,
			decompOffset, decompGain, decompDepth,
			minimumValve, humidityAlarmLevel,
			compressionValveAnalog, decompressionValveAnalog,
		} = req.body;

		let config = await db.config.findOne({ where: { id: 1 } });
		if (!config) {
			config = await db.config.create(defaultConfigValues);
		}

		const updates = {};
		if (compOffset !== undefined) updates.compOffset = compOffset;
		if (compGain !== undefined) updates.compGain = compGain;
		if (compDepth !== undefined) updates.compDepth = compDepth;
		if (decompOffset !== undefined) updates.decompOffset = decompOffset;
		if (decompGain !== undefined) updates.decompGain = decompGain;
		if (decompDepth !== undefined) updates.decompDepth = decompDepth;
		if (minimumValve !== undefined) updates.minimumValve = minimumValve;
		if (humidityAlarmLevel !== undefined) updates.humidityAlarmLevel = humidityAlarmLevel;
		if (compressionValveAnalog !== undefined) updates.compressionValveAnalog = compressionValveAnalog;
		if (decompressionValveAnalog !== undefined) updates.decompressionValveAnalog = decompressionValveAnalog;

		await config.update(updates);
		global.appConfig = config.toJSON();
		if (typeof global.applyConfigToApp === 'function') {
			global.applyConfigToApp();
		}
		if (global.cloudReporter) {
			global.cloudReporter.updateConfig(config.toJSON());
		}
		successResponse(req, res, config);
	} catch (error) {
		errorResponse(req, res, error.message);
	}
});

// POST /config/updateDefaultSessionParams
router.post('/config/updateDefaultSessionParams', async (req, res) => {
	try {
		const {
			defaultDalisSuresi, defaultCikisSuresi,
			defaultToplamSure, defaultSetDerinlik, defaultSpeed,
		} = req.body;

		let config = await db.config.findOne({ where: { id: 1 } });
		if (!config) {
			config = await db.config.create(defaultConfigValues);
		}

		const updates = {};
		if (defaultDalisSuresi !== undefined) updates.defaultDalisSuresi = defaultDalisSuresi;
		if (defaultCikisSuresi !== undefined) updates.defaultCikisSuresi = defaultCikisSuresi;
		if (defaultToplamSure !== undefined) updates.defaultToplamSure = defaultToplamSure;
		if (defaultSetDerinlik !== undefined) updates.defaultSetDerinlik = defaultSetDerinlik;
		if (defaultSpeed !== undefined) updates.defaultSpeed = defaultSpeed;

		await config.update(updates);
		global.appConfig = config.toJSON();
		if (typeof global.applyConfigToApp === 'function') {
			global.applyConfigToApp();
		}
		if (global.cloudReporter) {
			global.cloudReporter.updateConfig(config.toJSON());
		}
		successResponse(req, res, config);
	} catch (error) {
		errorResponse(req, res, error.message);
	}
});

module.exports = router;
