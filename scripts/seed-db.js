const db = require('../src/models');

async function seedDatabase() {
	console.log('Seeding database...');

	// --- Sensors (from production DB 2026-03-08) ---
	const sensorCount = await db.sensors.count();
	if (sensorCount === 0) {
		const sensors = [
			{
				sensorID: 1,
				sensorName: 'pressure',
				sensorText: 'Pressure',
				sensorMemory: 0,
				sensorSymbol: 'bar',
				sensorOffset: 0,
				sensorLowerLimit: 0,
				sensorUpperLimit: 3.25,
				sensorAnalogUpper: 16383,
				sensorAnalogLower: 3356,
				sensorDecimal: 2,
			},
			{
				sensorID: 2,
				sensorName: 'temperature',
				sensorText: 'Temperature',
				sensorMemory: 0,
				sensorSymbol: '\u00b0C',
				sensorOffset: 0,
				sensorLowerLimit: 0,
				sensorUpperLimit: 55,
				sensorAnalogUpper: 4095,
				sensorAnalogLower: 820,
				sensorDecimal: 1,
			},
			{
				sensorID: 3,
				sensorName: 'humidity',
				sensorText: 'Humidity',
				sensorMemory: 0,
				sensorSymbol: '%',
				sensorOffset: 0,
				sensorLowerLimit: 0,
				sensorUpperLimit: 100,
				sensorAnalogUpper: 4095,
				sensorAnalogLower: 820,
				sensorDecimal: 0,
			},
			{
				sensorID: 4,
				sensorName: 'o2',
				sensorText: 'O2',
				sensorMemory: 0,
				sensorSymbol: '%',
				sensorOffset: 0,
				sensorLowerLimit: 0,
				sensorUpperLimit: 100,
				sensorAnalogUpper: 16383,
				sensorAnalogLower: 3224,
				sensorDecimal: 1,
			},
		];
		for (const s of sensors) {
			await db.sensors.create(s);
		}
		console.log('  Sensors: 4 records inserted');
	} else {
		console.log('  Sensors: already populated (' + sensorCount + ' records)');
	}

	// --- Users (pre-hashed passwords from production DB) ---
	const userCount = await db.users.count();
	if (userCount === 0) {
		const users = [
			{
				username: 'sencersoylu',
				password: '$2a$10$x68gB3Ss7O4azAPswspxvuNuwrEbE7ndIAIfzjj0L5iPT4UuWmM7G',
				name: 'Sencer SOYLU',
				role: 'admin',
			},
			{
				username: 'Operator',
				password: '$2a$10$gBcOHqHLjj6nl4TcGqaDKOtsJRGmMpckXKz6yKfFZRuRknIhtfwlq',
				name: 'Operator',
				role: 'user',
			},
		];
		for (const u of users) {
			// Use hooks: false to skip beforeCreate password re-hashing
			await db.users.create(u, { hooks: false });
		}
		console.log('  Users: 2 records inserted (admin + operator)');
	} else {
		console.log('  Users: already populated (' + userCount + ' records)');
	}

	// --- Config ---
	const configCount = await db.config.count();
	if (configCount === 0) {
		await db.config.create({
			projectID: 'ARC-02',
			chamberType: 'monoplace',
			compOffset: 14,
			compGain: 8,
			compDepth: 100,
			decompOffset: 14,
			decompGain: 7,
			decompDepth: 100,
			minimumValve: 12,
			humidityAlarmLevel: 70,
			lastSessionDepth: 1.5,
			lastSessionDuration: 65,
			lastSessionSpeed: 2,
			o2Point0Raw: 0,
			o2Point0Percentage: 0,
			o2Point21Raw: 828,
			o2Point21Percentage: 21,
			o2Point100Raw: 16383,
			o2Point100Percentage: 100,
			o2AlarmValuePercentage: 23.5,
			o2AlarmOn: 0,
			filterAlphaPressure: 0.35,
			filterAlphaO2: 0.2,
			filterAlphaTemperature: 0.25,
			filterAlphaHumidity: 0.25,
			highO2Level: 23,
			oxygenDuration: 15,
			airBreakDuration: 5,
			plcIpAddress: '192.168.77.100',
			plcPort: 4000,
			demoMode: 1,
			defaultDalisSuresi: 10,
			defaultCikisSuresi: 10,
			defaultToplamSure: 60,
			defaultSetDerinlik: 1.4,
			defaultSpeed: 1,
			compressionValveAnalog: 9000,
			decompressionValveAnalog: 3500,
			cloudApiUrl: '',
			chamberApiKey: '',
			signalingUrl: 'ws://192.168.1.12:8080/ws',
			wsCommandUrl: 'ws://192.168.77.100:8080/ws',
			serverId: 'server-1',
			targetId: 'raspi-1',
			jwtSecret: 'coral-secret',
			serverPort: 4001,
			sensorUpdateInterval: 10000,
			heartbeatInterval: 30000,
		});
		console.log('  Config: default config inserted');
	} else {
		console.log('  Config: already populated');
	}

	console.log('Seeding complete.');
}

module.exports = seedDatabase;

// Run directly: node scripts/seed-db.js
if (require.main === module) {
	(async () => {
		try {
			await db.sequelize.sync({ alter: true });
			await seedDatabase();
			process.exit(0);
		} catch (err) {
			console.error('Seed error:', err);
			process.exit(1);
		}
	})();
}
