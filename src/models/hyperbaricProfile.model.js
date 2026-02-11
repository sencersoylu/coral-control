module.exports = (sequelize, Sequelize) => {
	const HyperbaricProfile = sequelize.define(
		'HyperbaricProfile',
		{
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			maxDepth: {
				type: Sequelize.REAL(2, 1),
				allowNull: false,
				defaultValue: 0,
			},
			description: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			profileDuration: {
				// minutes
				type: Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			o2Duration: {
				// total oxygen time in minutes
				type: Sequelize.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			createdByUserId: {
				type: Sequelize.INTEGER,
				allowNull: true,
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

	return HyperbaricProfile;
};
