module.exports = (sequelize, Sequelize) => {
	const SessionRecord = sequelize.define(
		'SessionRecord',
		{
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			startedAt: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
			endedAt: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			targetDepth: {
				type: Sequelize.FLOAT,
				allowNull: false,
				comment: 'Hedef derinlik (bar)',
			},
			speed: {
				type: Sequelize.INTEGER,
				allowNull: false,
				comment: 'Hız ayarı (1, 2, 3)',
			},
			totalDuration: {
				type: Sequelize.INTEGER,
				allowNull: false,
				comment: 'Toplam süre (dakika)',
			},
			descDuration: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: 'İniş süresi (saniye)',
			},
			ascDuration: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: 'Çıkış süresi (saniye)',
			},
			status: {
				type: Sequelize.STRING,
				allowNull: false,
				defaultValue: 'started',
				comment: 'started, paused, completed, stopped',
			},
			startedByUserId: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: 'Seansı başlatan kullanıcı ID',
			},
			// Olaylar [{type:'pause'|'resume'|'stop'|'complete', t:saniye, pressure:bar}]
			events: {
				type: Sequelize.TEXT,
				allowNull: true,
				get() {
					const value = this.getDataValue('events');
					if (!value || value === 'null') return [];
					try {
						return JSON.parse(value);
					} catch {
						return [];
					}
				},
				set(value) {
					this.setDataValue('events', JSON.stringify(value || []));
				},
			},
		},
		{
			indexes: [
				{
					fields: ['startedAt'],
				},
				{
					fields: ['status'],
				},
			],
		}
	);

	return SessionRecord;
};
