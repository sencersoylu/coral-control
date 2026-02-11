const db = require('../src/models');

(async () => {
	try {
		// Ensure database tables exist
		await db.sequelize.sync();

		const username = 'sencersoylu';
		const name = 'Sencer SOYLU';
		const password = '54215413';
		const role = 'admin';

		const existingUser = await db.users.findOne({ where: { username } });
		if (existingUser) {
			// Update role and password to ensure admin access
			existingUser.role = role;
			existingUser.password = password; // will be hashed by beforeUpdate hook
			await existingUser.save();
			console.log(`Updated existing user "${username}" to role=${role}.`);
		} else {
			await db.users.create({ username, name, password, role });
			console.log(`Created admin user "${username}" successfully.`);
		}

		console.log('Done.');
		process.exit(0);
	} catch (err) {
		console.error('Failed to create/update admin user:', err && err.message ? err.message : err);
		process.exit(1);
	}
})();


