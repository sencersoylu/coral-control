module.exports = (sequelize, Sequelize) => {
	const sensorData = sequelize.define(
		'sensorData',
		{
			sensorDataID: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			mainPressure: Sequelize.REAL(2, 1),
			mainTemperature: Sequelize.REAL(2, 1),
			mainHumidity: Sequelize.REAL(2, 1),
			mainCO2: Sequelize.REAL(2, 1),
			mainO2: Sequelize.REAL(2, 1),
			logDate: Sequelize.DATE,
			sessionID: Sequelize.INTEGER,
		},
		{}
	);

	return sensorData;
};
