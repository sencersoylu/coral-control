module.exports = (sequelize, Sequelize) => {
	const o2CalibrationLog = sequelize.define(
		'o2CalibrationLog',
		{
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			// '21' | '100' | 'sensor_change'
			type: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			rawValue: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			percentage: {
				type: Sequelize.FLOAT,
				allowNull: true,
			},
			performedBy: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			note: {
				type: Sequelize.STRING,
				allowNull: true,
			},
		},
		{}
	);

	return o2CalibrationLog;
};
