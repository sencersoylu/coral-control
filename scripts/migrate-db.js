/**
 * Veritabanı Migration Script
 * Mevcut verileri koruyarak tabloları günceller
 */

const db = require('../src/models');
const Sequelize = require('sequelize');

async function migrateDatabase() {
	try {
		console.log('🔄 Veritabanı migration başlatılıyor...');
		await db.sequelize.authenticate();
		console.log('✅ Veritabanı bağlantısı başarılı');

		const queryInterface = db.sequelize.getQueryInterface();

		// ============================================
		// SENSORS TABLOSU GÜNCELLEMELERİ
		// ============================================
		console.log('\n📊 Sensors tablosu kontrol ediliyor...');
		const sensorsTableName = db.sensors.getTableName();
		const sensorsTableDesc = await queryInterface.describeTable(sensorsTableName);

		// rawData kolonu kontrolü
		if (!sensorsTableDesc.rawData) {
			console.log('  ➕ rawData kolonu ekleniyor...');
			await queryInterface.addColumn(sensorsTableName, 'rawData', {
				type: Sequelize.INTEGER,
				allowNull: true,
				defaultValue: null,
			});
			console.log('  ✅ rawData kolonu eklendi');
		} else {
			console.log('  ✓ rawData kolonu zaten mevcut');
		}

		// sensorReal kolonu kontrolü
		if (!sensorsTableDesc.sensorReal) {
			console.log('  ➕ sensorReal kolonu ekleniyor...');
			await queryInterface.addColumn(sensorsTableName, 'sensorReal', {
				type: Sequelize.REAL(2, 1),
				allowNull: true,
				defaultValue: null,
			});
			console.log('  ✅ sensorReal kolonu eklendi');
		} else {
			console.log('  ✓ sensorReal kolonu zaten mevcut');
		}

		// ============================================
		// USERS TABLOSU GÜNCELLEMELERİ
		// ============================================
		console.log('\n👤 Users tablosu kontrol ediliyor...');
		const usersTableName = db.users.getTableName();
		let usersTableDesc;
		try {
			usersTableDesc = await queryInterface.describeTable(usersTableName);
		} catch (e) {
			console.log('  ⚠️  Users tablosu henüz oluşturulmamış');
			usersTableDesc = {};
		}

		// lastLoginAt kolonu kontrolü
		if (usersTableDesc && !usersTableDesc.lastLoginAt) {
			console.log('  ➕ lastLoginAt kolonu ekleniyor...');
			await queryInterface.addColumn(usersTableName, 'lastLoginAt', {
				type: Sequelize.DATE,
				allowNull: true,
				defaultValue: null,
			});
			console.log('  ✅ lastLoginAt kolonu eklendi');
		} else if (usersTableDesc && usersTableDesc.lastLoginAt) {
			console.log('  ✓ lastLoginAt kolonu zaten mevcut');
		}

		// ============================================
		// CONFIG TABLOSU GÜNCELLEMELERİ
		// ============================================
		console.log('\n⚙️  Config tablosu kontrol ediliyor...');
		const configTableName = db.config.getTableName();
		let configTableDesc;
		try {
			configTableDesc = await queryInterface.describeTable(configTableName);
		} catch (e) {
			console.log('  ⚠️  Config tablosu henüz oluşturulmamış');
			configTableDesc = {};
		}

		const newConfigColumns = {
			cloudApiUrl: { type: Sequelize.STRING, defaultValue: '' },
			chamberApiKey: { type: Sequelize.STRING, defaultValue: '' },
			signalingUrl: { type: Sequelize.STRING, defaultValue: 'ws://192.168.1.12:8080/ws' },
			wsCommandUrl: { type: Sequelize.STRING, defaultValue: 'ws://192.168.77.100:8080/ws' },
			serverId: { type: Sequelize.STRING, defaultValue: 'server-1' },
			targetId: { type: Sequelize.STRING, defaultValue: 'raspi-1' },
			jwtSecret: { type: Sequelize.STRING, defaultValue: 'coral-secret' },
			serverPort: { type: Sequelize.INTEGER, defaultValue: 4001 },
			sensorUpdateInterval: { type: Sequelize.INTEGER, defaultValue: 10000 },
			heartbeatInterval: { type: Sequelize.INTEGER, defaultValue: 30000 },
		};

		for (const [colName, colDef] of Object.entries(newConfigColumns)) {
			if (configTableDesc && !configTableDesc[colName]) {
				console.log(`  ➕ ${colName} kolonu ekleniyor...`);
				await queryInterface.addColumn(configTableName, colName, {
					...colDef,
					allowNull: true,
				});
				console.log(`  ✅ ${colName} kolonu eklendi`);
			} else if (configTableDesc && configTableDesc[colName]) {
				console.log(`  ✓ ${colName} kolonu zaten mevcut`);
			}
		}

		// ============================================
		// TABLO SENKRONİZASYONU (Sadece yeni tablolar için)
		// ============================================
		console.log('\n🔄 Yeni tablolar oluşturuluyor (varsa)...');
		await db.sequelize.sync({ alter: false }); // alter: false verileri korur
		console.log('✅ Tablo senkronizasyonu tamamlandı');

		// ============================================
		// VERİ KONTROLÜ
		// ============================================
		console.log('\n📈 Mevcut veriler kontrol ediliyor...');
		try {
			const sensorCount = await db.sensors.count();
			console.log(`  ✓ Sensors tablosunda ${sensorCount} kayıt mevcut`);
		} catch (e) {
			console.log('  ⚠️  Sensors tablosu henüz oluşturulmamış');
		}

		try {
			const userCount = await db.users.count();
			console.log(`  ✓ Users tablosunda ${userCount} kayıt mevcut`);
		} catch (e) {
			console.log('  ⚠️  Users tablosu henüz oluşturulmamış');
		}

		console.log('\n✅ Migration başarıyla tamamlandı!');
		console.log('💾 Tüm veriler korundu.');
	} catch (error) {
		console.error('\n❌ Migration hatası:', error);
		throw error;
	} finally {
		await db.sequelize.close();
	}
}

// Script çalıştırılıyor
if (require.main === module) {
	migrateDatabase()
		.then(() => {
			console.log('\n✨ İşlem tamamlandı');
			process.exit(0);
		})
		.catch((error) => {
			console.error('\n💥 İşlem başarısız:', error);
			process.exit(1);
		});
}

module.exports = migrateDatabase;

