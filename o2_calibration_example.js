/**
 * O2 KALİBRASYON KULLANIM ÖRNEĞİ VE TEST SCRİPTİ
 *
 * Bu dosya O2 kalibrasyonu nasıl yapılacağını gösterir
 * ve API endpoint'lerini test etmek için kullanılabilir.
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4001/api/o2';

// ============================================================================
// KULLANIM ÖRNEKLERİ
// ============================================================================

/**
 * 3 Noktalı O2 Kalibrasyonu Adımları:
 *
 * 1. %0 Kalibrasyon (Nitrogen ortamı):
 *    - Sensörü nitrogen gazına maruz bırakın
 *    - step1_zero adımını çağırın
 *
 * 2. %21 Kalibrasyon (Normal hava):
 *    - Sensörü normal havaya maruz bırakın
 *    - step2_air adımını çağırın
 *    - Bu adımda %100 değeri otomatik tahmin edilir
 *
 * 3. %100 Kalibrasyon (Saf oksijen):
 *    - Sensörü saf oksijene maruz bırakın
 *    - step3_pure adımını çağırın
 *    - Kalibrasyon tamamlanır
 */

// ============================================================================
// TEST FONKSİYONLARI
// ============================================================================

async function testO2Status() {
	console.log('\n=== O2 Sensör Durumu ===');
	try {
		const response = await axios.get(`${API_BASE}/status`);
		console.log('✅ O2 Sensör Durumu:', JSON.stringify(response.data, null, 2));
	} catch (error) {
		console.error('❌ Hata:', error.response?.data || error.message);
	}
}

async function testO2Realtime() {
	console.log('\n=== O2 Gerçek Zamanlı Veri ===');
	try {
		const response = await axios.get(`${API_BASE}/realtime`);
		console.log('✅ O2 Anlık Veri:', JSON.stringify(response.data, null, 2));
	} catch (error) {
		console.error('❌ Hata:', error.response?.data || error.message);
	}
}

async function testO2CalibrationReset() {
	console.log('\n=== O2 Kalibrasyon Sıfırlama ===');
	try {
		const response = await axios.post(`${API_BASE}/calibration/reset`);
		console.log('✅ Kalibrasyon Sıfırlandı:', response.data);
	} catch (error) {
		console.error('❌ Hata:', error.response?.data || error.message);
	}
}

async function testO2CalibrationStep(step, measuredPercentage = null) {
	console.log(`\n=== O2 Kalibrasyon Adımı: ${step} ===`);
	try {
		const payload = { step };
		if (measuredPercentage !== null) {
			payload.measuredPercentage = measuredPercentage;
		}

		const response = await axios.post(`${API_BASE}/calibration/step`, payload);
		console.log('✅ Adım Sonucu:', JSON.stringify(response.data, null, 2));
	} catch (error) {
		console.error('❌ Hata:', error.response?.data || error.message);
	}
}

async function testO2CalibrationData() {
	console.log('\n=== O2 Kalibrasyon Verileri ===');
	try {
		const response = await axios.get(`${API_BASE}/calibration`);
		console.log(
			'✅ Kalibrasyon Verileri:',
			JSON.stringify(response.data, null, 2)
		);
	} catch (error) {
		console.error('❌ Hata:', error.response?.data || error.message);
	}
}

async function testO2CalculateFull() {
	console.log('\n=== O2 %100 Değer Hesaplama ===');
	try {
		const currentValue = 8000; // %21 için örnek değer
		const response = await axios.post(`${API_BASE}/calculate-full`, {
			currentValue: currentValue,
		});
		console.log(
			'✅ %100 Hesaplama Sonucu:',
			JSON.stringify(response.data, null, 2)
		);
	} catch (error) {
		console.error('❌ Hata:', error.response?.data || error.message);
	}
}

async function testManualCalibrationPoint() {
	console.log('\n=== Manuel Kalibrasyon Noktası ===');
	try {
		const response = await axios.post(`${API_BASE}/calibration/point`, {
			point: '21',
			rawValue: 8000,
			actualPercentage: 20.9, // Gerçek ölçülen değer
		});
		console.log(
			'✅ Manuel Kalibrasyon:',
			JSON.stringify(response.data, null, 2)
		);
	} catch (error) {
		console.error('❌ Hata:', error.response?.data || error.message);
	}
}

// ============================================================================
// KOMPLE KALİBRASYON TEST SENARİOSU
// ============================================================================

async function fullCalibrationTest() {
	console.log('\n🧪 KOMPLE O2 KALİBRASYON TEST SENARİOSU BAŞLADI\n');

	// 1. Mevcut durumu kontrol et
	await testO2Status();

	// 2. Gerçek zamanlı veriyi göster
	await testO2Realtime();

	// 3. Kalibrasyon verilerini göster
	await testO2CalibrationData();

	// 4. Kalibrasyonu sıfırla
	await testO2CalibrationReset();

	// 5. %100 değer hesaplamasını test et
	await testO2CalculateFull();

	// 6. 3 Noktalı kalibrasyon adımlarını simüle et
	console.log('\n📋 3 NOKTALI KALİBRASYON SİMÜLASYONU');

	// Adım 1: %0 (Nitrogen)
	await testO2CalibrationStep('step1_zero');

	// Adım 2: %21 (Normal hava)
	await testO2CalibrationStep('step2_air', 20.9);

	// Adım 3: %100 (Saf oksijen)
	await testO2CalibrationStep('step3_pure', 99.5);

	// 7. Final durumu kontrol et
	await testO2Status();
	await testO2CalibrationData();

	console.log('\n✅ KOMPLE TEST SENARİOSU TAMAMLANDI');
}

// ============================================================================
// KULLANIM KILAVUZU
// ============================================================================

function printUsageGuide() {
	console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                           O2 KALİBRASYON KILAVUZU                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║ 🎯 3 NOKTALI KALİBRASYON ADIMI:                                              ║
║                                                                              ║
║ 1️⃣  %0 Kalibrasyon (Nitrogen)                                               ║
║     • Sensörü nitrogen gazına maruz bırakın                                  ║
║     • POST /api/o2/calibration/step {"step": "step1_zero"}                   ║
║                                                                              ║
║ 2️⃣  %21 Kalibrasyon (Hava)                                                  ║
║     • Sensörü normal havaya maruz bırakın                                    ║
║     • POST /api/o2/calibration/step {"step": "step2_air"}                    ║
║                                                                              ║
║ 3️⃣  %100 Kalibrasyon (Saf Oksijen)                                          ║
║     • Sensörü saf oksijene maruz bırakın                                     ║
║     • POST /api/o2/calibration/step {"step": "step3_pure"}                   ║
║                                                                              ║
║ 📊 DİĞER API ENDPOINT'LERİ:                                                  ║
║                                                                              ║
║ • GET  /api/o2/status           - Sensör durumu                             ║
║ • GET  /api/o2/realtime         - Anlık veri                               ║
║ • GET  /api/o2/calibration      - Kalibrasyon verileri                     ║
║ • POST /api/o2/calibration/reset - Kalibrasyonu sıfırla                    ║
║ • POST /api/o2/calculate-full   - %100 değeri hesapla                      ║
║                                                                              ║
║ 🔧 MANUEL KALİBRASYON:                                                       ║
║                                                                              ║
║ • POST /api/o2/calibration/point                                            ║
║   {                                                                          ║
║     "point": "21",          // "0", "21", veya "100"                       ║
║     "rawValue": 8000,       // Sensör analog değeri                        ║
║     "actualPercentage": 20.9 // Gerçek ölçülen O2 yüzdesi                 ║
║   }                                                                          ║
║                                                                              ║
║ 📝 NOTLAR:                                                                   ║
║                                                                              ║
║ • Kalibrasyon öncesi sensörün stabil olmasını bekleyin                      ║
║ • Her adım arasında en az 30 saniye bekleyin                               ║
║ • %21 değerinden %100 değeri otomatik hesaplanır                           ║
║ • Ham değerler 0-16383 arasında olmalıdır (14-bit ADC)                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
    `);
}

// ============================================================================
// MAIN FONKSİYON
// ============================================================================

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		printUsageGuide();
		console.log('\n🚀 Komple test için: node o2_calibration_example.js test');
		console.log('📖 Kılavuz için: node o2_calibration_example.js guide');
		return;
	}

	switch (args[0]) {
		case 'test':
			await fullCalibrationTest();
			break;
		case 'guide':
			printUsageGuide();
			break;
		case 'status':
			await testO2Status();
			break;
		case 'realtime':
			await testO2Realtime();
			break;
		case 'reset':
			await testO2CalibrationReset();
			break;
		case 'step1':
			await testO2CalibrationStep('step1_zero');
			break;
		case 'step2':
			await testO2CalibrationStep(
				'step2_air',
				args[1] ? parseFloat(args[1]) : null
			);
			break;
		case 'step3':
			await testO2CalibrationStep(
				'step3_pure',
				args[1] ? parseFloat(args[1]) : null
			);
			break;
		case 'calculate':
			await testO2CalculateFull();
			break;
		case 'manual':
			await testManualCalibrationPoint();
			break;
		default:
			console.log('❌ Bilinmeyen komut:', args[0]);
			printUsageGuide();
	}
}

// Script çalıştırılırsa main fonksiyonunu çağır
if (require.main === module) {
	main().catch(console.error);
}

module.exports = {
	testO2Status,
	testO2Realtime,
	testO2CalibrationReset,
	testO2CalibrationStep,
	testO2CalibrationData,
	testO2CalculateFull,
	testManualCalibrationPoint,
	fullCalibrationTest,
	printUsageGuide,
};
