module.exports = (sequelize, Sequelize) => {
	const SessionSensorLog = sequelize.define(
		'SessionSensorLog',
		{
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			sessionRecordId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				comment: 'Seans kaydı ID',
			},
			timestamp: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
			sessionTime: {
				type: Sequelize.INTEGER,
				allowNull: false,
				comment: 'Seans başlangıcından geçen süre (saniye)',
			},
			pressure: {
				type: Sequelize.FLOAT,
				allowNull: true,
				comment: 'Gerçek basınç (bar)',
			},
			targetPressure: {
				type: Sequelize.FLOAT,
				allowNull: true,
				comment: 'Hedef basınç (bar)',
			},
			isManualMode: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
				comment: 'Manuel mod (true) veya Otomatik mod (false)',
			},
			o2: {
				type: Sequelize.FLOAT,
				allowNull: true,
				comment: 'O2 yüzdesi',
			},
			temperature: {
				type: Sequelize.FLOAT,
				allowNull: true,
				comment: 'Sıcaklık (°C)',
			},
			humidity: {
				type: Sequelize.FLOAT,
				allowNull: true,
				comment: 'Nem (%)',
			},
		},
		{
			indexes: [
				{
					fields: ['sessionRecordId'],
				},
				{
					fields: ['timestamp'],
				},
			],
			timestamps: false, // Kendi timestamp alanımızı kullanıyoruz
		}
	);

	return SessionSensorLog;
};
