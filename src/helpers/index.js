const axios = require('axios');
const jwt = require('jsonwebtoken');

const successResponse = (req, res, data, code = 200) =>
	res.send({
		code,
		data,
		success: true,
	});

const errorResponse = (
	req,
	res,
	errorMessage = 'Something went wrong',
	code = 500,
	error = {}
) =>
	res.status(500).json({
		code,
		errorMessage,
		error,
		data: null,
		success: false,
	});

function linearConversion(
	lowValue,
	highValue,
	lowPLC,
	highPLC,
	value,
	fix = 1
) {
	const a =
		((Number(lowValue) - Number(highValue)) /
			(Number(lowPLC) - Number(highPLC))) *
		10000;
	const b = Number(lowValue) - (Number(lowPLC) * a) / 10000;
	const result = (Number(value) * a) / 10000 + b;

	if (Number(value) < Number(lowPLC)) return 0;
	else return Number.parseFloat(Number(result).toFixed(fix));
}

// Function to check internet connection
async function checkInternetConnection(timeout = 5000) {
	try {
		const https = require('https');

		return new Promise((resolve) => {
			const request = https.request(
				{
					hostname: '8.8.8.8', // Google's DNS server
					port: 443,
					path: '/',
					method: 'HEAD',
					timeout: timeout,
				},
				(response) => {
					resolve({
						isConnected: true,
						status: response.statusCode,
						message: 'Internet connection is available',
					});
				}
			);

			request.on('error', (error) => {
				resolve({
					isConnected: false,
					status: null,
					message: 'No internet connection',
					error: error.message,
				});
			});

			request.on('timeout', () => {
				request.destroy();
				resolve({
					isConnected: false,
					status: null,
					message: 'Connection timeout',
					error: 'Request timed out',
				});
			});

			request.end();
		});
	} catch (error) {
		return {
			isConnected: false,
			status: null,
			message: 'Error checking internet connection',
			error: error.message,
		};
	}
}

// Function to read all sensor calibration data and return as object
async function getAllSensorCalibrationData() {
	try {
		const db = require('../models');
		const allSensors = await db.sensors.findAll();
		const calibrationData = {};

		allSensors.forEach((sensor) => {
			calibrationData[sensor.sensorID] = {
				sensorName: sensor.sensorName,
				sensorText: sensor.sensorText,
				sensorMemory: sensor.sensorMemory,
				sensorSymbol: sensor.sensorSymbol,
				sensorOffset: sensor.sensorOffset,
				sensorLowerLimit: sensor.sensorLowerLimit,
				sensorUpperLimit: sensor.sensorUpperLimit,
				sensorAnalogUpper: sensor.sensorAnalogUpper,
				sensorAnalogLower: sensor.sensorAnalogLower,
				sensorDecimal: sensor.sensorDecimal,
			};
		});

		return calibrationData;
	} catch (error) {
		console.error('Error reading sensor calibration data:', error);
		throw error;
	}
}

// Genel sistem durumu kontrolü
const checkSystemHealth = async (deviceId) => {
	try {
		const response = await axios.get(
			`http://localhost:3000/api/v1/public/${deviceId}/heartbeat`
		);

		console.log('✅ Sistem aktif:', response.data);
		return response.data;
	} catch (error) {
		console.error('❌ Sistem heartbeat hatası:', error.message);
		throw error;
	}
};

// Sensör rawData ve sensorReal değerlerini güncelle
const updateSensorData = async (sensorId, rawData, sensorReal) => {
	try {
		const db = require('../models');
		const sensor = await db.sensors.findByPk(sensorId);

		if (!sensor) {
			throw new Error(`Sensör bulunamadı: ID ${sensorId}`);
		}

		// rawData güncelle
		if (rawData !== undefined && rawData !== null) {
			if (typeof rawData !== 'number') {
				throw new Error('rawData bir sayı olmalıdır');
			}
			sensor.rawData = rawData;
		}

		// sensorReal güncelle
		if (sensorReal !== undefined && sensorReal !== null) {
			if (typeof sensorReal !== 'number') {
				throw new Error('sensorReal bir sayı olmalıdır');
			}
			sensor.sensorReal = sensorReal;
		}

		await sensor.save();
		return sensor;
	} catch (error) {
		console.error('Sensör verisi güncellenirken hata:', error);
		throw error;
	}
};

// Toplu sensör güncelleme fonksiyonu
// updateSensor(pressure_raw_data, pressure_real_data, temperature_raw_data, temperature_real_data, o2_raw_data, o2_real_data, humidity_raw_data, humidity_real_data)
const updateSensor = async (
	pressureRawData,
	pressureRealData,
	temperatureRawData,
	temperatureRealData,
	o2RawData,
	o2RealData,
	humidityRawData,
	humidityRealData
) => {
	try {
		const db = require('../models');

		// Sensör verilerini hazırla
		const sensorUpdates = {};
		const updates = [];
		const errors = [];

		// Pressure sensörü
		if (
			pressureRawData !== undefined &&
			pressureRawData !== null &&
			pressureRealData !== undefined &&
			pressureRealData !== null
		) {
			sensorUpdates.pressure = {
				rawData: pressureRawData,
				sensorReal: pressureRealData,
			};
		} else if (pressureRawData !== undefined && pressureRawData !== null) {
			sensorUpdates.pressure = { rawData: pressureRawData };
		} else if (pressureRealData !== undefined && pressureRealData !== null) {
			sensorUpdates.pressure = { sensorReal: pressureRealData };
		}

		// Temperature sensörü
		if (
			temperatureRawData !== undefined &&
			temperatureRawData !== null &&
			temperatureRealData !== undefined &&
			temperatureRealData !== null
		) {
			sensorUpdates.temperature = {
				rawData: temperatureRawData,
				sensorReal: temperatureRealData,
			};
		} else if (
			temperatureRawData !== undefined &&
			temperatureRawData !== null
		) {
			sensorUpdates.temperature = { rawData: temperatureRawData };
		} else if (
			temperatureRealData !== undefined &&
			temperatureRealData !== null
		) {
			sensorUpdates.temperature = { sensorReal: temperatureRealData };
		}

		// O2 sensörü
		if (
			o2RawData !== undefined &&
			o2RawData !== null &&
			o2RealData !== undefined &&
			o2RealData !== null
		) {
			sensorUpdates.o2 = {
				rawData: o2RawData,
				sensorReal: o2RealData,
			};
		} else if (o2RawData !== undefined && o2RawData !== null) {
			sensorUpdates.o2 = { rawData: o2RawData };
		} else if (o2RealData !== undefined && o2RealData !== null) {
			sensorUpdates.o2 = { sensorReal: o2RealData };
		}

		// Humidity sensörü
		if (
			humidityRawData !== undefined &&
			humidityRawData !== null &&
			humidityRealData !== undefined &&
			humidityRealData !== null
		) {
			sensorUpdates.humidity = {
				rawData: humidityRawData,
				sensorReal: humidityRealData,
			};
		} else if (humidityRawData !== undefined && humidityRawData !== null) {
			sensorUpdates.humidity = { rawData: humidityRawData };
		} else if (humidityRealData !== undefined && humidityRealData !== null) {
			sensorUpdates.humidity = { sensorReal: humidityRealData };
		}

		// Eğer hiçbir sensör verisi yoksa hata döndür
		if (Object.keys(sensorUpdates).length === 0) {
			throw new Error(
				'En az bir sensör verisi gönderilmelidir (pressure, temperature, o2, humidity)'
			);
		}

		// Her sensörü güncelle
		const sensorNames = ['pressure', 'temperature', 'o2', 'humidity'];
		for (const sensorName of sensorNames) {
			const sensorData = sensorUpdates[sensorName];
			if (!sensorData) continue;

			// Sensörü bul
			const sensor = await db.sensors.findOne({
				where: { sensorName: sensorName },
			});

			if (!sensor) {
				errors.push(`${sensorName}: Sensör bulunamadı`);
				continue;
			}

			// rawData güncelle
			if (sensorData.rawData !== undefined && sensorData.rawData !== null) {
				if (typeof sensorData.rawData !== 'number') {
					errors.push(`${sensorName}: rawData bir sayı olmalıdır`);
					continue;
				}
				sensor.rawData = sensorData.rawData;
			}

			// sensorReal güncelle
			if (
				sensorData.sensorReal !== undefined &&
				sensorData.sensorReal !== null
			) {
				if (typeof sensorData.sensorReal !== 'number') {
					errors.push(`${sensorName}: sensorReal bir sayı olmalıdır`);
					continue;
				}
				sensor.sensorReal = sensorData.sensorReal;
			}

			// Kaydet
			await sensor.save();
			updates.push({
				sensorName: sensorName,
				sensorID: sensor.sensorID,
				rawData: sensor.rawData,
				sensorReal: sensor.sensorReal,
			});
		}

		// Eğer hiçbir güncelleme başarılı olmadıysa hata fırlat
		if (updates.length === 0) {
			throw new Error(`Güncelleme başarısız: ${errors.join(', ')}`);
		}

		return {
			success: true,
			updated: updates,
			errors: errors.length > 0 ? errors : undefined,
		};
	} catch (error) {
		console.error('Toplu sensör güncelleme hatası:', error);
		throw error;
	}
};

module.exports = {
	successResponse,
	errorResponse,
	linearConversion,
	getAllSensorCalibrationData,
	checkInternetConnection,
	checkSystemHealth,
	updateSensorData,
	updateSensor,
	authenticateJWT: function (req, res, next) {
		try {
			const authHeader = req.headers['authorization'] || '';
			const token = authHeader.startsWith('Bearer ')
				? authHeader.slice(7)
				: null;
			if (!token) return res.status(401).json({ error: 'Missing token' });
			const secret = process.env.JWT_SECRET || 'coral-secret';
			const payload = jwt.verify(token, secret);
			req.user = payload;
			next();
		} catch (err) {
			return res
				.status(401)
				.json({ error: 'Invalid or expired token', details: err.message });
		}
	},
	authorizeRoles: function (...roles) {
		return function (req, res, next) {
			const role = req.user && req.user.role;
			if (!role) return res.status(401).json({ error: 'Unauthorized' });
			if (!roles.includes(role))
				return res.status(403).json({ error: 'Forbidden' });
			return next();
		};
	},
	generateUserToken: function (user) {
		const secret = process.env.JWT_SECRET || 'coral-secret';
		return jwt.sign(
			{
				id: user.id,
				username: user.username,
				name: user.name,
				role: user.role,
			},
			secret,
			{ expiresIn: '7d' }
		);
	},
};
