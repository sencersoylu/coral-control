const express = require('express');
const router = express.Router();
const db = require('../models/index');
const { errorResponse, successResponse } = require('../helpers/index');

router.get('/sensors/list', async (req, res) => {
	try {
		const sensors = await db.sensors.findAll();
		successResponse(req, res, sensors);
	} catch (error) {
		errorResponse(req, res, error);
	}
});

router.put('/sensors/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const {
			sensorName,
			sensorText,
			sensorMemory,
			sensorSymbol,
			sensorOffset,
			sensorLowerLimit,
			sensorUpperLimit,
			sensorAnalogUpper,
			sensorAnalogLower,
			sensorDecimal,
			rawData,
			sensorReal,
		} = req.body || {};

		const sensor = await db.sensors.findByPk(id);
		if (!sensor) {
			return res.status(404).json({ error: 'Sensör bulunamadı' });
		}

		// Update fields if provided
		if (sensorName !== undefined) sensor.sensorName = sensorName;
		if (sensorText !== undefined) sensor.sensorText = sensorText;
		if (sensorMemory !== undefined) sensor.sensorMemory = sensorMemory;
		if (sensorSymbol !== undefined) sensor.sensorSymbol = sensorSymbol;
		if (sensorOffset !== undefined) sensor.sensorOffset = sensorOffset;
		if (sensorLowerLimit !== undefined)
			sensor.sensorLowerLimit = sensorLowerLimit;
		if (sensorUpperLimit !== undefined)
			sensor.sensorUpperLimit = sensorUpperLimit;
		if (sensorAnalogUpper !== undefined)
			sensor.sensorAnalogUpper = sensorAnalogUpper;
		if (sensorAnalogLower !== undefined)
			sensor.sensorAnalogLower = sensorAnalogLower;
		if (sensorDecimal !== undefined) sensor.sensorDecimal = sensorDecimal;
		if (rawData !== undefined) sensor.rawData = rawData;
		if (sensorReal !== undefined) sensor.sensorReal = sensorReal;

		await sensor.save();
		successResponse(req, res, sensor);
	} catch (error) {
		errorResponse(req, res, error);
	}
});

// Update sensor rawData and sensorReal
router.put('/sensors/:id/data', async (req, res) => {
	try {
		const { id } = req.params;
		const { rawData, sensorReal } = req.body;

		if (rawData === undefined && sensorReal === undefined) {
			return res.status(400).json({
				error:
					'rawData veya sensorReal değerlerinden en az biri gönderilmelidir',
			});
		}

		const sensor = await db.sensors.findByPk(id);
		if (!sensor) {
			return res.status(404).json({ error: 'Sensör bulunamadı' });
		}

		// Update rawData if provided
		if (rawData !== undefined) {
			if (typeof rawData !== 'number') {
				return res.status(400).json({ error: 'rawData bir sayı olmalıdır' });
			}
			sensor.rawData = rawData;
		}

		// Update sensorReal if provided
		if (sensorReal !== undefined) {
			if (typeof sensorReal !== 'number') {
				return res.status(400).json({ error: 'sensorReal bir sayı olmalıdır' });
			}
			sensor.sensorReal = sensorReal;
		}

		await sensor.save();
		successResponse(req, res, sensor);
	} catch (error) {
		errorResponse(req, res, error);
	}
});

// Bulk update sensors rawData and sensorReal
// Body format: { pressure: { rawData: 10000, sensorReal: 1.5 }, temperature: { rawData: 8000, sensorReal: 25.3 }, o2: { rawData: 9000, sensorReal: 21.0 }, humidity: { rawData: 7000, sensorReal: 45.0 } }
router.put('/sensors/bulk-update-data', async (req, res) => {
	try {
		const { pressure, temperature, o2, humidity } = req.body || {};

		// Validate that at least one sensor data is provided
		if (!pressure && !temperature && !o2 && !humidity) {
			return res.status(400).json({
				error:
					'En az bir sensör verisi gönderilmelidir (pressure, temperature, o2, humidity)',
			});
		}

		const sensorNames = ['pressure', 'temperature', 'o2', 'humidity'];
		const updates = [];
		const errors = [];

		// Process each sensor
		for (const sensorName of sensorNames) {
			const sensorData = req.body[sensorName];
			if (!sensorData) continue;

			// Validate sensor data structure
			if (
				sensorData.rawData === undefined &&
				sensorData.sensorReal === undefined
			) {
				errors.push(
					`${sensorName}: rawData veya sensorReal değerlerinden en az biri gönderilmelidir`
				);
				continue;
			}

			// Find sensor by name
			const sensor = await db.sensors.findOne({
				where: { sensorName: sensorName },
			});

			if (!sensor) {
				errors.push(`${sensorName}: Sensör bulunamadı`);
				continue;
			}

			// Update rawData if provided
			if (sensorData.rawData !== undefined) {
				if (typeof sensorData.rawData !== 'number') {
					errors.push(`${sensorName}: rawData bir sayı olmalıdır`);
					continue;
				}
				sensor.rawData = sensorData.rawData;
			}

			// Update sensorReal if provided
			if (sensorData.sensorReal !== undefined) {
				if (typeof sensorData.sensorReal !== 'number') {
					errors.push(`${sensorName}: sensorReal bir sayı olmalıdır`);
					continue;
				}
				sensor.sensorReal = sensorData.sensorReal;
			}

			// Save sensor
			await sensor.save();
			updates.push({
				sensorName: sensorName,
				sensorID: sensor.sensorID,
				rawData: sensor.rawData,
				sensorReal: sensor.sensorReal,
			});
		}

		// If there are errors but also some successful updates
		if (errors.length > 0 && updates.length === 0) {
			return res.status(400).json({
				error: 'Güncelleme başarısız',
				errors: errors,
			});
		}

		// Return results
		successResponse(req, res, {
			updated: updates,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		errorResponse(req, res, error);
	}
});

module.exports = router;
