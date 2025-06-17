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
	
	const a = ((Number(lowValue) - Number(highValue)) / (Number(lowPLC) - Number(highPLC))) * 10000;
	const b = Number(lowValue) - (Number(lowPLC) * a) / 10000;
		const result = (Number(value) * a) / 10000 + b;
		

	if (Number(value) < Number(lowPLC)) return 0;
	else return Number.parseFloat(Number(result).toFixed(fix));
}

// Function to read all sensor calibration data and return as object
async function getAllSensorCalibrationData() {
	try {
		const db = require('../models');
		const allSensors = await db.sensors.findAll();
		const calibrationData = {};
		
		allSensors.forEach(sensor => {
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
				sensorDecimal: sensor.sensorDecimal
			};
		});
		
		return calibrationData;
	} catch (error) {
		console.error('Error reading sensor calibration data:', error);
		throw error;
	}
}

module.exports = { successResponse, errorResponse, linearConversion, getAllSensorCalibrationData };
