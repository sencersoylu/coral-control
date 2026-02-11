module.exports = (sequelize, Sequelize) => {
	const HyperbaricProfileStep = sequelize.define(
		'HyperbaricProfileStep',
		{
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			profileId: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			depth: {
				type: Sequelize.REAL(2, 1),
				allowNull: false,
				defaultValue: 0,
			},
			duration: {
				// minutes
				type: Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			gasType: {
				type: Sequelize.ENUM('o2', 'air'),
				allowNull: false,
				defaultValue: 'air',
			},
			createdAt: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
			updatedAt: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
		},
		{}
	);

	return HyperbaricProfileStep;
};
