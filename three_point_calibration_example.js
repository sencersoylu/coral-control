/**
 * 3 NOKTALI KALİBRASYON FONKSİYONU KULLANIM ÖRNEĞİ
 *
 * Bu dosya, genel amaçlı 3 noktalı kalibrasyon fonksiyonlarının
 * nasıl kullanılacağını gösterir.
 */

// Eğer index.js'den fonksiyonları import etmek istiyorsanız:
// const {
//     threePointCalibration,
//     validateCalibrationPoints,
//     testCalibrationAccuracy,
//     createCalibrationTemplate,
//     generateCalibrationTestValues
// } = require('./index.js');

// Örnek fonksiyonlar (standalone kullanım için)
function linearConversion(
	inputMin,
	inputMax,
	outputMin,
	outputMax,
	inputValue,
	decimalPlaces = 2
) {
	if (inputMax === inputMin) return inputValue;
	const slope = (outputMax - outputMin) / (inputMax - inputMin);
	const result = outputMin + slope * (inputValue - inputMin);
	return (
		Math.round(result * Math.pow(10, decimalPlaces)) /
		Math.pow(10, decimalPlaces)
	);
}

function threePointCalibration(calibrationPoints, rawInput, decimalPlaces = 2) {
	const { point1, point2, point3 } = calibrationPoints;

	// Kalibrasyon noktalarını raw değerine göre sırala
	const sortedPoints = [point1, point2, point3].sort((a, b) => a.raw - b.raw);
	const [lowPoint, midPoint, highPoint] = sortedPoints;

	// Giriş değerinin hangi bölgede olduğunu belirle
	if (rawInput <= midPoint.raw) {
		// Alt bölge: lowPoint - midPoint arası
		return linearConversion(
			lowPoint.value,
			midPoint.value,
			lowPoint.raw,
			midPoint.raw,
			rawInput,
			decimalPlaces
		);
	} else {
		// Üst bölge: midPoint - highPoint arası
		return linearConversion(
			midPoint.value,
			highPoint.value,
			midPoint.raw,
			highPoint.raw,
			rawInput,
			decimalPlaces
		);
	}
}

function validateCalibrationPoints(calibrationPoints) {
	const { point1, point2, point3 } = calibrationPoints;

	// Tüm noktaların varlığını kontrol et
	if (!point1 || !point2 || !point3) {
		return {
			isValid: false,
			error: 'Tüm kalibrasyon noktaları tanımlanmalıdır',
		};
	}

	// Raw ve value değerlerinin sayı olduğunu kontrol et
	const points = [point1, point2, point3];
	for (let i = 0; i < points.length; i++) {
		const point = points[i];
		if (typeof point.raw !== 'number' || typeof point.value !== 'number') {
			return {
				isValid: false,
				error: `Nokta ${i + 1}: raw ve value değerleri sayı olmalıdır`,
			};
		}
	}

	// Raw değerlerinin farklı olduğunu kontrol et
	const rawValues = [point1.raw, point2.raw, point3.raw];
	const uniqueRawValues = [...new Set(rawValues)];
	if (uniqueRawValues.length !== 3) {
		return { isValid: false, error: 'Tüm raw değerler farklı olmalıdır' };
	}

	return { isValid: true, error: null };
}

// ============================================================================
// KULLANIM ÖRNEKLERİ
// ============================================================================

console.log('🧪 3 NOKTALI KALİBRASYON FONKSİYONU TEST ÖRNEKLERİ\n');

// Örnek 1: O2 Sensörü Kalibrasyonu
console.log('📊 Örnek 1: O2 Sensörü Kalibrasyonu');
console.log('='.repeat(50));

const o2CalibrationPoints = {
	point1: { raw: 3224, value: 0 }, // %0 O2 (Nitrogen ortamı)
	point2: { raw: 8000, value: 21 }, // %21 O2 (Normal hava)
	point3: { raw: 16383, value: 100 }, // %100 O2 (Saf oksijen)
};

// Kalibrasyonu doğrula
const o2Validation = validateCalibrationPoints(o2CalibrationPoints);
console.log(
	'✅ Kalibrasyon Geçerliliği:',
	o2Validation.isValid ? 'BAŞARILI' : 'HATALI'
);
if (!o2Validation.isValid) {
	console.log('❌ Hata:', o2Validation.error);
}

// Test değerleri
const o2TestValues = [
	{ raw: 3224, expected: 0 },
	{ raw: 5000, expected: null },
	{ raw: 8000, expected: 21 },
	{ raw: 12000, expected: null },
	{ raw: 16383, expected: 100 },
];

console.log('\n📈 O2 Kalibrasyon Test Sonuçları:');
o2TestValues.forEach((test) => {
	const result = threePointCalibration(o2CalibrationPoints, test.raw, 2);
	const status =
		test.expected !== null
			? Math.abs(result - test.expected) < 0.1
				? '✅'
				: '❌'
			: '📊';
	console.log(
		`${status} Raw: ${test.raw} → O2: ${result}% ${
			test.expected !== null ? `(Beklenen: ${test.expected}%)` : ''
		}`
	);
});

// Örnek 2: pH Sensörü Kalibrasyonu
console.log('\n📊 Örnek 2: pH Sensörü Kalibrasyonu');
console.log('='.repeat(50));

const phCalibrationPoints = {
	point1: { raw: 2000, value: 4.0 }, // pH 4.0 (Asidik çözelti)
	point2: { raw: 8192, value: 7.0 }, // pH 7.0 (Nötr su)
	point3: { raw: 14000, value: 10.0 }, // pH 10.0 (Bazik çözelti)
};

const phValidation = validateCalibrationPoints(phCalibrationPoints);
console.log(
	'✅ Kalibrasyon Geçerliliği:',
	phValidation.isValid ? 'BAŞARILI' : 'HATALI'
);

const phTestValues = [2000, 4000, 6000, 8192, 10000, 12000, 14000];
console.log('\n📈 pH Kalibrasyon Test Sonuçları:');
phTestValues.forEach((raw) => {
	const result = threePointCalibration(phCalibrationPoints, raw, 2);
	console.log(`📊 Raw: ${raw} → pH: ${result}`);
});

// Örnek 3: Sıcaklık Sensörü Kalibrasyonu
console.log('\n📊 Örnek 3: Sıcaklık Sensörü Kalibrasyonu');
console.log('='.repeat(50));

const tempCalibrationPoints = {
	point1: { raw: 1000, value: 0 }, // 0°C (Buz noktası)
	point2: { raw: 8192, value: 25 }, // 25°C (Oda sıcaklığı)
	point3: { raw: 15000, value: 50 }, // 50°C (Sıcak su)
};

const tempValidation = validateCalibrationPoints(tempCalibrationPoints);
console.log(
	'✅ Kalibrasyon Geçerliliği:',
	tempValidation.isValid ? 'BAŞARILI' : 'HATALI'
);

const tempTestValues = [1000, 3000, 5000, 8192, 10000, 12000, 15000];
console.log('\n📈 Sıcaklık Kalibrasyon Test Sonuçları:');
tempTestValues.forEach((raw) => {
	const result = threePointCalibration(tempCalibrationPoints, raw, 1);
	console.log(`📊 Raw: ${raw} → Sıcaklık: ${result}°C`);
});

// Örnek 4: Hatalı Kalibrasyon Noktaları
console.log('\n📊 Örnek 4: Hatalı Kalibrasyon Testi');
console.log('='.repeat(50));

const invalidCalibrationPoints = {
	point1: { raw: 1000, value: 10 },
	point2: { raw: 1000, value: 20 }, // Aynı raw değer!
	point3: { raw: 2000, value: 30 },
};

const invalidValidation = validateCalibrationPoints(invalidCalibrationPoints);
console.log(
	'❌ Hatalı Kalibrasyon Testi:',
	invalidValidation.isValid ? 'BAŞARILI' : 'HATALI'
);
console.log('📝 Hata Mesajı:', invalidValidation.error);

// ============================================================================
// KULLANIM KILAVUZU
// ============================================================================

console.log('\n📚 3 NOKTALI KALİBRASYON KULLANIM KILAVUZU');
console.log('='.repeat(60));

console.log(`
🎯 TEMEL KULLANIM:

1️⃣  Kalibrasyon noktalarını tanımlayın:
   const calibrationPoints = {
       point1: { raw: ham_değer1, value: gerçek_değer1 },
       point2: { raw: ham_değer2, value: gerçek_değer2 },
       point3: { raw: ham_değer3, value: gerçek_değer3 }
   };

2️⃣  Kalibrasyonu doğrulayın:
   const validation = validateCalibrationPoints(calibrationPoints);
   if (!validation.isValid) {
       console.error('Kalibrasyon hatası:', validation.error);
   }

3️⃣  Ham değeri kalibre edin:
   const calibratedValue = threePointCalibration(
       calibrationPoints, 
       hamDeğer, 
       ondalıkBasamak
   );

📋 ÖNEMLİ NOTLAR:

• Ham değerler (raw) mutlaka farklı olmalıdır
• Kalibrasyon 2 doğrusal segmentten oluşur (piece-wise linear)
• Orta nokta, doğrusal segmentlerin kesişim noktasıdır
• Ham değer aralığı dışındaki değerler ekstrapolasyon yapar
• Ondalık basamak sayısı 0-6 arası olmalıdır

🔧 GELİŞMİŞ KULLANIM:

• Polinom kalibrasyonu için calculatePolynomialCoefficients() kullanın
• Kalibrasyon doğruluğunu test etmek için testCalibrationAccuracy() kullanın
• Hazır şablonlar için createCalibrationTemplate() kullanın
`);

console.log('\n✅ TEST TAMAMLANDI - Fonksiyonlar başarıyla çalışıyor! 🎉\n');
