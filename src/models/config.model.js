module.exports = (sequelize, Sequelize) => {
	const config = sequelize.define(
		'config',
		{
			projectID: Sequelize.STRING,
			chamberType: Sequelize.STRING,
			pressureLimit: Sequelize.INTEGER,
			sessionCounterLimit: Sequelize.INTEGER,
			sessionTimeLimit: Sequelize.INTEGER,
			o2SensorLastCalibration: Sequelize.DATE,
			o2SensorLastChange: Sequelize.DATE,
			o2GeneratorLastMaintenance: Sequelize.DATE,
			chamberLastMaintenance: Sequelize.DATE,
			sessionCounter: Sequelize.INTEGER,
			installationDate: Sequelize.DATE,
			lastSessionDate: Sequelize.DATE,
			// Valve Control Parameters
			compOffset: { type: Sequelize.FLOAT, defaultValue: 14 },
			compGain: { type: Sequelize.FLOAT, defaultValue: 8 },
			compDepth: { type: Sequelize.FLOAT, defaultValue: 100 },
			decompOffset: { type: Sequelize.FLOAT, defaultValue: 14 },
			decompGain: { type: Sequelize.FLOAT, defaultValue: 7 },
			decompDepth: { type: Sequelize.FLOAT, defaultValue: 100 },
			minimumValve: { type: Sequelize.INTEGER, defaultValue: 12 },
			humidityAlarmLevel: { type: Sequelize.INTEGER, defaultValue: 70 },
			// Last Session Settings
			lastSessionDepth: { type: Sequelize.FLOAT, defaultValue: 1.4 },
			lastSessionDuration: { type: Sequelize.INTEGER, defaultValue: 60 },
			lastSessionSpeed: { type: Sequelize.INTEGER, defaultValue: 1 },
			// O2 Calibration
			o2Point0Raw: { type: Sequelize.INTEGER, defaultValue: 0 },
			o2Point0Percentage: { type: Sequelize.FLOAT, defaultValue: 0 },
			o2Point21Raw: { type: Sequelize.INTEGER, defaultValue: 828 },
			o2Point21Percentage: { type: Sequelize.FLOAT, defaultValue: 21 },
			o2Point100Raw: { type: Sequelize.INTEGER, defaultValue: 16383 },
			o2Point100Percentage: { type: Sequelize.FLOAT, defaultValue: 100 },
			o2CalibrationDate: Sequelize.DATE,
			o2AlarmValuePercentage: { type: Sequelize.FLOAT, defaultValue: 23.5 },
			o2AlarmOn: { type: Sequelize.BOOLEAN, defaultValue: false },
			// Filter Alpha
			filterAlphaPressure: { type: Sequelize.FLOAT, defaultValue: 0.35 },
			filterAlphaO2: { type: Sequelize.FLOAT, defaultValue: 0.2 },
			filterAlphaTemperature: { type: Sequelize.FLOAT, defaultValue: 0.25 },
			filterAlphaHumidity: { type: Sequelize.FLOAT, defaultValue: 0.25 },
			// Alarm
			highO2Level: { type: Sequelize.FLOAT, defaultValue: 23 },
			// Oxygen Break
			oxygenDuration: { type: Sequelize.INTEGER, defaultValue: 15 },
			airBreakDuration: { type: Sequelize.INTEGER, defaultValue: 5 },
			// PLC
			plcIpAddress: { type: Sequelize.STRING, defaultValue: '192.168.77.100' },
			plcPort: { type: Sequelize.INTEGER, defaultValue: 4000 },
			// Demo
			demoMode: { type: Sequelize.BOOLEAN, defaultValue: false },
			// Default Session
			defaultDalisSuresi: { type: Sequelize.INTEGER, defaultValue: 10 },
			defaultCikisSuresi: { type: Sequelize.INTEGER, defaultValue: 10 },
			defaultToplamSure: { type: Sequelize.INTEGER, defaultValue: 60 },
			defaultSetDerinlik: { type: Sequelize.FLOAT, defaultValue: 1.4 },
			defaultSpeed: { type: Sequelize.INTEGER, defaultValue: 1 },
			// Valve Analog
			compressionValveAnalog: { type: Sequelize.INTEGER, defaultValue: 9000 },
			decompressionValveAnalog: { type: Sequelize.INTEGER, defaultValue: 3500 },
			// Cloud Sync
			cloudApiUrl: { type: Sequelize.STRING, defaultValue: '' },
			chamberApiKey: { type: Sequelize.STRING, defaultValue: '' },
			// Network & Signaling
			signalingUrl: { type: Sequelize.STRING, defaultValue: 'ws://192.168.1.12:8080/ws' },
			wsCommandUrl: { type: Sequelize.STRING, defaultValue: 'ws://192.168.77.100:8080/ws' },
			serverId: { type: Sequelize.STRING, defaultValue: 'server-1' },
			targetId: { type: Sequelize.STRING, defaultValue: 'raspi-1' },
			// Auth
			jwtSecret: { type: Sequelize.STRING, defaultValue: 'coral-secret' },
			// Server
			serverPort: { type: Sequelize.INTEGER, defaultValue: 4001 },
			// Intervals (ms)
			sensorUpdateInterval: { type: Sequelize.INTEGER, defaultValue: 10000 },
			heartbeatInterval: { type: Sequelize.INTEGER, defaultValue: 30000 },
		},
		{}
	);

	return config;
};
