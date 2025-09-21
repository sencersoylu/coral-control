// Profil Yönetimi JavaScript Fonksiyonları
// [dakika, basınç, tip] veri yapısını yöneten sistem

class ProfileManager {
    constructor() {
        this.profile = [];
        this.hedeflenen = [[], []];
        this.manuel = [];
        this.currentStep = 0;
    }

    /**
     * Yeni profil adımı oluşturur
     * @param {number} minutes - Dakika cinsinden süre
     * @param {number} pressure - Basınç değeri  
     * @param {string} type - "air" veya "o" (oksijen)
     * @returns {Array} [dakika, basınç, tip] formatında array
     */
    createProfileStep(minutes, pressure, type = "air") {
        // Validation
        if (typeof minutes !== 'number' || minutes <= 0) {
            throw new Error('Dakika değeri pozitif bir sayı olmalıdır');
        }
        if (typeof pressure !== 'number' || pressure < 0) {
            throw new Error('Basınç değeri negatif olamaz');
        }
        if (!["air", "o"].includes(type)) {
            throw new Error('Tip değeri "air" veya "o" olmalıdır');
        }

        return [parseFloat(minutes.toFixed(4)), parseFloat(pressure.toFixed(4)), type];
    }

    /**
     * Profile yeni adım ekler
     * @param {number} minutes 
     * @param {number} pressure 
     * @param {string} type 
     */
    addStep(minutes, pressure, type = "air") {
        const step = this.createProfileStep(minutes, pressure, type);
        this.profile.push(step);
        return step;
    }

    /**
     * Belirli indekse adım ekler
     * @param {number} index - Ekleme pozisyonu
     * @param {number} minutes 
     * @param {number} pressure 
     * @param {string} type 
     */
    insertStep(index, minutes, pressure, type = "air") {
        const step = this.createProfileStep(minutes, pressure, type);
        this.profile.splice(index, 0, step);
        return step;
    }

    /**
     * Profil adımını günceller
     * @param {number} index - Güncellenecek adım indeksi
     * @param {number} minutes 
     * @param {number} pressure 
     * @param {string} type 
     */
    updateStep(index, minutes, pressure, type) {
        if (index < 0 || index >= this.profile.length) {
            throw new Error('Geçersiz adım indeksi');
        }
        
        const step = this.createProfileStep(minutes, pressure, type);
        this.profile[index] = step;
        return step;
    }

    /**
     * Profil adımını siler
     * @param {number} index 
     */
    removeStep(index) {
        if (index < 0 || index >= this.profile.length) {
            throw new Error('Geçersiz adım indeksi');
        }
        return this.profile.splice(index, 1)[0];
    }

    /**
     * Profili temizler
     */
    clearProfile() {
        this.profile = [];
        this.hedeflenen = [[], []];
        this.manuel = [];
        this.currentStep = 0;
    }

    /**
     * Toplam profil süresini hesaplar
     * @returns {number} Toplam dakika
     */
    getTotalDuration() {
        return this.profile.reduce((total, step) => total + step[0], 0);
    }

    /**
     * Maksimum basınç değerini bulur
     * @returns {number} Maksimum basınç
     */
    getMaxPressure() {
        if (this.profile.length === 0) return 0;
        return Math.max(...this.profile.map(step => step[1]));
    }

    /**
     * Profili zaman serisine dönüştürür (Highcharts için)
     * @returns {Array} [{x: zaman, y: basınç}, ...] formatında array
     */
    toTimeSeries() {
        const series = [];
        let cumulativeTime = 0;
        let previousPressure = 0;

        this.profile.forEach((step, index) => {
            const [duration, pressure, type] = step;
            const stepDurationInSeconds = duration * 60;

            // Her saniye için interpolasyon
            for (let second = 1; second <= stepDurationInSeconds; second++) {
                const timeInMinutes = (cumulativeTime + second) / 60;
                const progressRatio = second / stepDurationInSeconds;
                const interpolatedPressure = previousPressure + 
                    ((pressure - previousPressure) * progressRatio);

                const dataPoint = {
                    x: parseFloat(timeInMinutes.toFixed(4)),
                    y: type === "air" ? null : parseFloat(interpolatedPressure.toFixed(4))
                };

                series.push(dataPoint);
            }

            previousPressure = pressure;
            cumulativeTime += stepDurationInSeconds;
        });

        return series;
    }

    /**
     * Hedeflenen değerleri hesaplar
     */
    calculateTargetValues() {
        this.hedeflenen = [[], []];
        let cumulativeTime = 0;
        let previousPressure = 0;

        this.profile.forEach((step, stepIndex) => {
            const [duration, pressure, type] = step;
            const stepDurationInSeconds = duration * 60;

            for (let second = 1; second <= stepDurationInSeconds; second++) {
                const progressRatio = second / stepDurationInSeconds;
                const interpolatedPressure = previousPressure + 
                    ((pressure - previousPressure) * progressRatio);

                this.hedeflenen[0].push(parseFloat(interpolatedPressure.toFixed(4)));
                this.hedeflenen[1].push(stepIndex + 1);
            }

            previousPressure = pressure;
            cumulativeTime += stepDurationInSeconds;
        });
    }

    /**
     * Dinamik profil değişikliği yapar (PHP'deki durum 3'e benzer)
     * @param {number} startTime - Başlangıç zamanı (saniye)
     * @param {number} endTime - Bitiş zamanı (saniye)
     * @param {number} newPressure - Yeni basınç değeri
     * @param {number} stepDuration - Adım süresi (saniye)
     */
    dynamicProfileChange(startTime, endTime, newPressure, stepDuration) {
        if (!this.hedeflenen[0] || this.hedeflenen[0].length === 0) {
            this.calculateTargetValues();
        }

        const stepIndex = this.hedeflenen[1][startTime];
        if (!stepIndex) return;

        const currentStep = this.profile[stepIndex - 1];
        if (!currentStep) return;

        const [originalDuration, originalPressure, type] = currentStep;
        const elapsedTime = (endTime - startTime) / 60; // dakikaya çevir

        // Eğim hesapla
        let slope = 0;
        if (stepIndex > 1) {
            const prevStep = this.profile[stepIndex - 2];
            slope = (originalPressure - prevStep[1]) / originalDuration;
        }

        // Mevcut adımı güncelle
        this.profile[stepIndex - 1] = [
            parseFloat((stepDuration / 60).toFixed(4)),
            originalPressure,
            type
        ];

        // Yeni adımları ekle
        this.insertStep(stepIndex, Math.abs(elapsedTime), newPressure, "air");
        
        if (slope !== 0) {
            const remainingTime = (originalPressure - newPressure) / slope;
            this.insertStep(stepIndex + 1, Math.abs(remainingTime), originalPressure, "air");
        }

        // Hedeflenen değerleri yeniden hesapla
        this.calculateTargetValues();
    }

    /**
     * Profili JSON formatında export eder
     * @returns {string} JSON string
     */
    exportProfile() {
        return JSON.stringify({
            profile: this.profile,
            totalDuration: this.getTotalDuration(),
            maxPressure: this.getMaxPressure(),
            timestamp: new Date().toISOString()
        }, null, 2);
    }

    /**
     * JSON'dan profil yükler
     * @param {string} jsonString 
     */
    importProfile(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.profile && Array.isArray(data.profile)) {
                this.profile = data.profile;
                this.calculateTargetValues();
            }
        } catch (error) {
            throw new Error('Geçersiz profil verisi: ' + error.message);
        }
    }

    /**
     * Profil validasyonu yapar
     * @returns {Object} {isValid: boolean, errors: string[]}
     */
    validateProfile() {
        const errors = [];
        
        if (this.profile.length === 0) {
            errors.push('Profil boş olamaz');
        }

        this.profile.forEach((step, index) => {
            if (!Array.isArray(step) || step.length !== 3) {
                errors.push(`Adım ${index + 1}: Geçersiz format`);
                return;
            }

            const [minutes, pressure, type] = step;
            
            if (typeof minutes !== 'number' || minutes <= 0) {
                errors.push(`Adım ${index + 1}: Geçersiz süre değeri`);
            }
            
            if (typeof pressure !== 'number' || pressure < 0) {
                errors.push(`Adım ${index + 1}: Geçersiz basınç değeri`);
            }
            
            if (!["air", "o"].includes(type)) {
                errors.push(`Adım ${index + 1}: Geçersiz tip değeri`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Profili [zaman, hedefbasınç, air/o2] formatında array'e dönüştürür
     * @returns {Array} [[zaman, hedefbasınç, air/o2], ...] formatında array
     */
    toTimeBasedArray() {
        const timeBasedArray = [];
        let cumulativeTime = 0;

        this.profile.forEach((step) => {
            const [duration, pressure, type] = step;
            cumulativeTime += duration;
            
            // [kümülatif zaman, hedef basınç, tip] formatında ekle
            timeBasedArray.push([
                parseFloat(cumulativeTime.toFixed(4)),
                parseFloat(pressure.toFixed(4)),
                type
            ]);
        });

        return timeBasedArray;
    }

    /**
     * Profili saniye saniye [zaman, hedefbasınç, air/o2, adım] formatında array'e dönüştürür
     * @returns {Array} Her saniye için [[zaman(saniye), hedefbasınç, air/o2, adım], ...] formatında array
     */
    toTimeBasedArrayBySeconds() {
        const timeBasedArray = [];
        let cumulativeTimeInSeconds = 0;
        let previousPressure = 0;

        this.profile.forEach((step, stepIndex) => {
            const [duration, pressure, type] = step;
            const stepDurationInSeconds = Math.round(duration * 60);

            // Her saniye için interpolasyon yap
            for (let second = 1; second <= stepDurationInSeconds; second++) {
                const progressRatio = second / stepDurationInSeconds;
                const interpolatedPressure = previousPressure + 
                    ((pressure - previousPressure) * progressRatio);

                timeBasedArray.push([
                    cumulativeTimeInSeconds + second,  // Zaman saniye cinsinden
                    parseFloat(interpolatedPressure.toFixed(4)),  // İnterpolasyon yapılmış basınç
                    type,  // Mevcut adımın tipi
                    stepIndex + 1  // Adım numarası (1'den başlar)
                ]);
            }

            previousPressure = pressure;
            cumulativeTimeInSeconds += stepDurationInSeconds;
        });

        return timeBasedArray;
    }
}

// Utility fonksiyonları
const ProfileUtils = {
    /**
     * Hızlı profil oluşturma
     * @param {Array} steps - [[dakika, basınç, tip], ...] formatında array
     * @returns {ProfileManager} ProfileManager instance
     */
    createQuickProfile(steps) {
        const manager = new ProfileManager();
        steps.forEach(([minutes, pressure, type]) => {
            manager.addStep(minutes, pressure, type);
        });
        return manager;
    },

    /**
     * Profilleri karşılaştırır
     * @param {ProfileManager} profile1 
     * @param {ProfileManager} profile2 
     * @returns {Object} Karşılaştırma sonucu
     */
    compareProfiles(profile1, profile2) {
        return {
            duration1: profile1.getTotalDuration(),
            duration2: profile2.getTotalDuration(),
            maxPressure1: profile1.getMaxPressure(),
            maxPressure2: profile2.getMaxPressure(),
            stepCount1: profile1.profile.length,
            stepCount2: profile2.profile.length
        };
    },

    /**
     * Profil interpolasyonu yapar
     * @param {Array} step1 - [dakika, basınç, tip]
     * @param {Array} step2 - [dakika, basınç, tip]
     * @param {number} ratio - 0-1 arası interpolasyon oranı
     * @returns {Array} Interpolasyon sonucu
     */
    interpolateSteps(step1, step2, ratio) {
        const [min1, press1, type1] = step1;
        const [min2, press2, type2] = step2;
        
        return [
            min1 + (min2 - min1) * ratio,
            press1 + (press2 - press1) * ratio,
            ratio < 0.5 ? type1 : type2
        ];
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProfileManager, ProfileUtils };
}

// Kullanım örnekleri:
/*
// Yeni profil oluştur
const profile = new ProfileManager();

// Adım ekle
profile.addStep(5, 1.5, "air");     // 5 dakika, 1.5 bar, hava
profile.addStep(10, 2.5, "o");      // 10 dakika, 2.5 bar, oksijen
profile.addStep(5, 1.0, "air");     // 5 dakika, 1.0 bar, hava

// Profil bilgileri
console.log("Toplam süre:", profile.getTotalDuration(), "dakika");
console.log("Maksimum basınç:", profile.getMaxPressure(), "bar");

// Highcharts için veri
const chartData = profile.toTimeSeries();

// [zaman, hedefbasınç, air/o2] formatında array
const timeBasedData = profile.toTimeBasedArray();
console.log("Zaman bazlı array:", timeBasedData);

// Saniye saniye [zaman, hedefbasınç, air/o2, adım] formatında array
const secondBySecondData = profile.toTimeBasedArrayBySeconds();
console.log("Saniye saniye array:", secondBySecondData);

// Profil export/import
const jsonData = profile.exportProfile();
const newProfile = new ProfileManager();
newProfile.importProfile(jsonData);

// Hızlı profil oluşturma
const quickProfile = ProfileUtils.createQuickProfile([
    [5, 1.5, "air"],
    [10, 2.5, "o"],
    [5, 1.0, "air"]
]);
*/ 