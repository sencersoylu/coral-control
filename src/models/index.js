const Sequelize = require('sequelize');

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: './coral.sqlite',
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.sensors = require('./sensor.model.js')(sequelize, Sequelize);
db.config = require('./config.model.js')(sequelize, Sequelize);
db.patients = require('./patient.model.js')(sequelize, Sequelize);
db.sensorData = require('./sensorData.model.js')(sequelize, Sequelize);
db.users = require('./user.model.js')(sequelize, Sequelize);
db.hyperbaricProfiles = require('./hyperbaricProfile.model.js')(
	sequelize,
	Sequelize
);
db.hyperbaricProfileSteps = require('./hyperbaricProfileStep.model.js')(
	sequelize,
	Sequelize
);
db.sessionRecords = require('./sessionRecord.model.js')(sequelize, Sequelize);
db.sessionSensorLogs = require('./sessionSensorLog.model.js')(
	sequelize,
	Sequelize
);

// Associations
db.hyperbaricProfiles.hasMany(db.hyperbaricProfileSteps, {
	foreignKey: 'profileId',
	as: 'steps',
	onDelete: 'CASCADE',
});
db.hyperbaricProfileSteps.belongsTo(db.hyperbaricProfiles, {
	foreignKey: 'profileId',
	as: 'profile',
});

db.hyperbaricProfiles.belongsTo(db.users, {
	foreignKey: 'createdByUserId',
	as: 'createdBy',
});
db.users.hasMany(db.hyperbaricProfiles, {
	foreignKey: 'createdByUserId',
	as: 'profiles',
});

// Session Record associations
db.sessionRecords.hasMany(db.sessionSensorLogs, {
	foreignKey: 'sessionRecordId',
	as: 'sensorLogs',
	onDelete: 'CASCADE',
});
db.sessionSensorLogs.belongsTo(db.sessionRecords, {
	foreignKey: 'sessionRecordId',
	as: 'sessionRecord',
});

db.sessionRecords.belongsTo(db.users, {
	foreignKey: 'startedByUserId',
	as: 'startedBy',
});
db.users.hasMany(db.sessionRecords, {
	foreignKey: 'startedByUserId',
	as: 'sessions',
});

module.exports = db;
