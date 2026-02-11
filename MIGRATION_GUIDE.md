# Veritabanı Migration Kılavuzu

Bu kılavuz, modelleri güncelledikten sonra veritabanını verileri kaybetmeden nasıl güncelleyeceğinizi açıklar.

## 🎯 Amaç

Model değişikliklerini veritabanına uygularken **mevcut verileri korumak** ve sadece eksik kolonları eklemek.

## 📋 Kullanım

### 1. Migration Script'ini Çalıştırma

```bash
npm run db:migrate
```

veya

```bash
node scripts/migrate-db.js
```

### 2. Ne Yapar?

Migration script'i şunları yapar:

1. ✅ Mevcut tabloları kontrol eder
2. ✅ Eksik kolonları tespit eder
3. ✅ Sadece eksik kolonları ekler (verileri korur)
4. ✅ Yeni tabloları oluşturur (varsa)
5. ✅ Mevcut verileri korur

### 3. Örnek Senaryo

**Önceki Model:**
```javascript
// sensor.model.js
{
  sensorID: INTEGER,
  sensorName: STRING,
  sensorText: STRING,
  // ... diğer alanlar
}
```

**Güncellenmiş Model:**
```javascript
// sensor.model.js
{
  sensorID: INTEGER,
  sensorName: STRING,
  sensorText: STRING,
  rawData: INTEGER,        // YENİ
  sensorReal: REAL(2,1),   // YENİ
  // ... diğer alanlar
}
```

**Migration Sonrası:**
- ✅ Mevcut veriler korunur
- ✅ `rawData` kolonu eklenir (NULL değerlerle)
- ✅ `sensorReal` kolonu eklenir (NULL değerlerle)
- ✅ Hiçbir veri kaybı olmaz

## 🔧 Yeni Kolon Ekleme

### Adım 1: Modeli Güncelle

`src/models/sensor.model.js` dosyasına yeni kolonu ekleyin:

```javascript
module.exports = (sequelize, Sequelize) => {
  const sensor = sequelize.define('sensor', {
    // ... mevcut alanlar
    yeniKolon: Sequelize.STRING,  // YENİ KOLON
  });
  return sensor;
};
```

### Adım 2: Migration Script'ini Güncelle

`scripts/migrate-db.js` dosyasına yeni kolon kontrolü ekleyin:

```javascript
// yeniKolon kontrolü
if (!sensorsTableDesc.yeniKolon) {
  console.log('  ➕ yeniKolon kolonu ekleniyor...');
  await queryInterface.addColumn(sensorsTableName, 'yeniKolon', {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: null,
  });
  console.log('  ✅ yeniKolon kolonu eklendi');
} else {
  console.log('  ✓ yeniKolon kolonu zaten mevcut');
}
```

### Adım 3: Migration'ı Çalıştır

```bash
npm run db:migrate
```

## ⚠️ Önemli Notlar

### ✅ Güvenli İşlemler

- **Yeni kolon ekleme**: Güvenli, veriler korunur
- **NULL değerlere izin verme**: Güvenli, mevcut kayıtlar etkilenmez
- **Yeni tablo oluşturma**: Güvenli, mevcut tablolar etkilenmez

### ⚠️ Dikkatli Olunması Gerekenler

- **Kolon silme**: Veri kaybına yol açar (migration script'inde yok)
- **Kolon tipi değiştirme**: Veri kaybına yol açabilir
- **NOT NULL constraint ekleme**: Mevcut NULL değerler hata verebilir

### 🔒 Veri Yedekleme

Önemli değişikliklerden önce **mutlaka veritabanını yedekleyin**:

```bash
# SQLite için
cp coral.sqlite coral.sqlite.backup
```

## 📝 Migration Script Yapısı

```javascript
// 1. Tablo kontrolü
const tableDesc = await queryInterface.describeTable(tableName);

// 2. Kolon kontrolü
if (!tableDesc.kolonAdi) {
  // 3. Kolon ekleme
  await queryInterface.addColumn(tableName, 'kolonAdi', {
    type: Sequelize.DATA_TYPE,
    allowNull: true,
    defaultValue: null,
  });
}
```

## 🐛 Sorun Giderme

### Hata: "Table already exists"
- Normal bir durum, tablo zaten mevcut demektir
- Migration devam eder

### Hata: "Column already exists"
- Kolon zaten eklenmiş demektir
- Migration o kolonu atlar ve devam eder

### Hata: "Cannot read property 'getTableName'"
- Model henüz yüklenmemiş olabilir
- `db.sequelize.sync()` çalıştırın

## 📚 Ek Kaynaklar

- [Sequelize Migrations](https://sequelize.org/docs/v6/other-topics/migrations/)
- [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html)

## 💡 İpuçları

1. **Küçük değişiklikler**: Her değişiklikten sonra migration çalıştırın
2. **Test ortamında dene**: Önce test veritabanında deneyin
3. **Yedek al**: Önemli değişikliklerden önce mutlaka yedek alın
4. **Logları kontrol et**: Migration çıktılarını dikkatle okuyun

## 🚀 Hızlı Başlangıç

```bash
# 1. Veritabanını yedekle (opsiyonel ama önerilir)
cp coral.sqlite coral.sqlite.backup

# 2. Migration'ı çalıştır
npm run db:migrate

# 3. Sonuçları kontrol et
# Script size hangi kolonların eklendiğini gösterecek
```

---

**Not**: Bu migration script'i sadece **kolon ekleme** işlemleri için güvenlidir. Kolon silme veya tip değiştirme işlemleri için manuel SQL sorguları gerekebilir.

