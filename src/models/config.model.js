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
			compOffset: { type: Sequelize.INTEGER, defaultValue: 14 },
			compGain: { type: Sequelize.INTEGER, defaultValue: 8 },
			compDepth: { type: Sequelize.INTEGER, defaultValue: 100 },
			decompOffset: { type: Sequelize.INTEGER, defaultValue: 14 },
			decompGain: { type: Sequelize.INTEGER, defaultValue: 7 },
			decompDepth: { type: Sequelize.INTEGER, defaultValue: 100 },
			minimumValve: { type: Sequelize.INTEGER, defaultValue: 12 },
			humidityAlarmLevel: { type: Sequelize.INTEGER, defaultValue: 70 },
			// Last Session Settings
			lastSessionDepth: { type: Sequelize.FLOAT, defaultValue: 1.4 },
			lastSessionDuration: { type: Sequelize.INTEGER, defaultValue: 60 },
			lastSessionSpeed: { type: Sequelize.INTEGER, defaultValue: 1 },
		},
		{}
	);

	return config;
};
