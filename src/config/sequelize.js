// Use the same Sequelize instance and models as the app
const db = require('../models');

(async () => {
	try {
		await db.sequelize.authenticate();
		console.log('DB connection OK.');

		// Safe sync: create tables if they do not exist
		// This will NOT drop or alter existing tables/data
		await db.sequelize.sync();
		console.log('DB synced (non-destructive). Existing data preserved.');

		// Ensure Users table has lastLoginAt column (idempotent)
		try {
			const qi = db.sequelize.getQueryInterface();
			const tableNameMaybe = typeof db.users.getTableName === 'function' ? db.users.getTableName() : 'Users';
			const usersTable = typeof tableNameMaybe === 'object' ? (tableNameMaybe.tableName || 'Users') : tableNameMaybe;
			const desc = await qi.describeTable(usersTable);
			if (!desc.lastLoginAt) {
				await qi.addColumn(usersTable, 'lastLoginAt', {
					type: db.Sequelize.DATE,
					allowNull: true,
				});
				console.log(`Added column lastLoginAt to table ${usersTable}.`);
			} else {
				console.log(`Column lastLoginAt already exists on table ${usersTable}.`);
			}
		} catch (e) {
			console.warn('Could not ensure lastLoginAt column:', e && e.message ? e.message : e);
		}

		// Optional: quick visibility into sensors count without modifying anything
		try {
			const count = await db.sensors.count();
			console.log(`Sensors table present. Existing records: ${count}`);
		} catch (e) {
			// sensors table may not exist in some setups; ignore
		}

		process.exit(0);
	} catch (err) {
		console.error('DB init error:', err && err.message ? err.message : err);
		process.exit(1);
	}
})();
