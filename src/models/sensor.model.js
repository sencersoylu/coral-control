module.exports = (sequelize, Sequelize) => {
	const sensor = sequelize.define(
		'sensor',
		{
			sensorID: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			sensorName: Sequelize.STRING,
			sensorText: Sequelize.STRING,
			sensorMemory: Sequelize.INTEGER,
			sensorSymbol: Sequelize.STRING,
			sensorOffset: Sequelize.INTEGER,
			sensorLowerLimit: Sequelize.REAL(2,1),
			sensorUpperLimit: Sequelize.REAL(2,1),
			sensorAnalogUpper: Sequelize.INTEGER,
			sensorAnalogLower: Sequelize.INTEGER,
			sensorDecimal: Sequelize.INTEGER,
		},
		{}
	);

	return sensor;
};
