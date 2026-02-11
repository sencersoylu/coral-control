const express = require('express');
const db = require('../models');
const exporter = require('highcharts-export-server');
const dayjs = require('dayjs');

const router = express.Router();

// Initialize exporter with proper configuration

router.use([
	require('./sensors.js'),
	require('./auth.js'),
	require('./users.js'),
	require('./sessions.js'),
]);

// Test endpoint to create sample session profile
router.get('/testChart', async (req, res) => {
	try {
		// Create a sample profile for testing
		const sampleProfile = [
			[10, 0, 'air'], // 10 minutes descent to 0 bar
			[5, 2.4, 'air'], // 5 minutes descent to 2.4 bar (equivalent to 33 feet)
			[20, 2.4, 'o2'], // 20 minutes at depth with oxygen
			[15, 2.4, 'air'], // 15 minutes at depth with air
			[10, 2.4, 'o2'], // 10 minutes at depth with oxygen
			[20, 0, 'air'], // 20 minutes ascent to surface
		];

		// Initialize global.sessionStatus if it doesn't exist
		if (!global.sessionStatus) {
			global.sessionStatus = {};
		}

		// Set the sample profile to global sessionStatus
		global.sessionStatus.profile = sampleProfile;

		res.json({
			message:
				'Sample profile created successfully. You can now call /getChart to see the graph.',
			profile: sampleProfile,
		});
	} catch (error) {
		console.error('Test chart error:', error);
		res.status(500).json({ error: error.message });
	}
});

// Yeni hasta ekle
router.post('/patients', async (req, res) => {
	try {
		const { fullName, birthDate, gender } = req.body;
		const patient = await db.patients.create({
			fullName,
			birthDate,
			gender,
		});
		res.status(201).json(patient);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Hasta listesini getir
router.get('/patients', async (req, res) => {
	try {
		const patients = await db.patients.findAll();
		res.json(patients);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// ============================================================================
// O2 KALİBRASYON API ENDPOINT'LERİ
// ============================================================================

// O2 sensörü durumunu getir
router.get('/api/o2/status', (req, res) => {
	try {
		const status = global.getO2SensorStatus
			? global.getO2SensorStatus()
			: {
					error: 'O2 sensor functions not available',
			  };
		res.json(status);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// O2 kalibrasyonu adımı gerçekleştir
router.post('/api/o2/calibration/step', (req, res) => {
	try {
		const { step, measuredPercentage } = req.body;

		if (!global.performO2CalibrationStep) {
			return res
				.status(500)
				.json({ error: 'O2 calibration functions not available' });
		}

		const result = global.performO2CalibrationStep(step, measuredPercentage);
		res.json(result);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// O2 kalibrasyonunu sıfırla
router.post('/api/o2/calibration/reset', (req, res) => {
	try {
		if (!global.resetO2Calibration) {
			return res
				.status(500)
				.json({ error: 'O2 calibration functions not available' });
		}

		global.resetO2Calibration();
		res.json({
			success: true,
			message: 'O2 kalibrasyonu sıfırlandı',
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// O2 kalibrasyon verilerini getir
router.get('/api/o2/calibration', (req, res) => {
	try {
		const calibrationData = global.o2CalibrationData || {
			error: 'O2 calibration data not available',
		};
		res.json(calibrationData);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Manuel O2 kalibrasyon noktası ayarla
router.post('/api/o2/calibration/point', (req, res) => {
	try {
		const { point, rawValue, actualPercentage } = req.body;

		if (!global.setO2CalibrationPoint) {
			return res
				.status(500)
				.json({ error: 'O2 calibration functions not available' });
		}

		// Validate inputs
		if (!['0', '21', '100'].includes(point)) {
			return res
				.status(400)
				.json({ error: 'Invalid calibration point. Must be 0, 21, or 100' });
		}

		if (typeof rawValue !== 'number' || rawValue < 0 || rawValue > 16383) {
			return res
				.status(400)
				.json({ error: 'Invalid raw value. Must be between 0 and 16383' });
		}

		global.setO2CalibrationPoint(point, rawValue, actualPercentage);

		res.json({
			success: true,
			message: `O2 kalibrasyon noktası %${point} ayarlandı`,
			calibrationData: global.o2CalibrationData,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// O2 %100 değeri hesaplama
router.post('/api/o2/calculate-full', (req, res) => {
	try {
		const { currentValue } = req.body;

		if (!global.calculateO2Full) {
			return res
				.status(500)
				.json({ error: 'O2 calculation functions not available' });
		}

		if (typeof currentValue !== 'number') {
			return res.status(400).json({ error: 'Current value must be a number' });
		}

		const estimatedFullValue = global.calculateO2Full(currentValue);

		res.json({
			success: true,
			currentValue: currentValue,
			estimatedFullValue: estimatedFullValue,
			ratio: (100 / 21).toFixed(2),
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// O2 gerçek zamanlı veri endpoint'i
router.get('/api/o2/realtime', (req, res) => {
	try {
		// Global sensorData'dan O2 verilerini al
		const o2Data = {
			percentage: global.sensorData ? global.sensorData.o2 : 21.0,
			rawValue: global.sensorData ? global.sensorData.o2RawValue : 8000,
			timestamp: new Date().toISOString(),
			isCalibrated: global.o2CalibrationData
				? global.o2CalibrationData.isCalibrated
				: false,
		};

		res.json(o2Data);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
