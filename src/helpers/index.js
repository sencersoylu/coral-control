const axios = require('axios');

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

module.exports = {
	successResponse,
	errorResponse,
	linearConversion,
	getAllSensorCalibrationData,
	checkInternetConnection,
	checkSystemHealth,
};
