# Socket.io Haberleşme Optimizasyon Planı

**Tarih:** 2026-03-10
**Kapsam:** coral-control-arc (backend) ↔ hiper-flow-dikey (frontend)

---

## 🔴 Kritik Sorunlar

### 1. `bufferdifference[]` + `olcum[]` büyüyen array'ler payload'da
- **Konum:** Backend `index.js:1636-1638` — her saniye büyüyor, 300 elemana kadar
- **Etki:** Session'da sensorData payload'u 2KB → 10KB+ büyür
- **Frontend kullanıyor mu:** HAYIR
- **Çözüm:** Backend'de sensorData emit'inden bu alanları çıkar. sessionStatus objesinin emit edilecek halini ayrı bir "slim" obje olarak hazırla.

### 2. sessionStatus çift store'a yazılıyor
- **Konum:** Frontend `useSocketSensorData.ts:78-79`
  - `sensorsStore.updateFromSocketData()` → `sensorsStore.sessionStatus = data`
  - `sessionStatusStore.updateSessionStatus()` → `sessionStatusStore.sessionStatus = {..., ...data}`
- **Etki:** Her socket event'te 2x state update, 2x subscriber notification, 2x re-render cycle
- **Çözüm:** sessionStatus'u sadece `sessionStatusStore`'da tut. `sensorsStore`'dan `sessionStatus` ve `doorStatus` alanlarını kaldır. Tüm consumer'ları `sessionStatusStore`'a yönlendir.

### 3. `lastSyncTime: new Date().toISOString()` her update'te değişiyor
- **Konum:** Frontend `sensorsStore.ts:299`
- **Etki:** Her update'te tüm state farklı görünür, shallow compare bozulur
- **Çözüm:** `lastSyncTime`'ı state'ten kaldır. Gerekiyorsa ayrı bir ref veya non-reactive değişkende tut.

### 4. Değişmeyen sensor değerleri yeni obje referansı alıyor
- **Konum:** Frontend `sensorsStore.ts:262-296`
- **Etki:** pressure 1.20 → 1.20 olsa bile yeni obje → `(s) => s.pressure` selectörü re-render tetikler
- **Çözüm:** Update öncesi değer karşılaştırması yap. Sadece değişen sensor'ü güncelle:
  ```typescript
  const newPressureValue = socketData.pressure.toFixed(2);
  const pressureChanged = newPressureValue !== state.pressure.value;
  return {
      ...(pressureChanged && { pressure: { ...state.pressure, value: newPressureValue, ... } }),
      // diğer sensorler aynı pattern
  };
  ```

### 5. `sessionResumed` / `sessionStopped` event'leri frontend'de dinlenmiyor
- **Konum:**
  - Backend `index.js:911` → `{ type: 'sessionResumed', data: { profile, currentTime } }`
  - Backend `index.js:920` → `{ type: 'sessionStopped', data: { profile, currentTime } }`
  - Frontend `useSocketSensorData.ts:85-158` → bu type'lar için handler YOK
- **Etki:** Resume/stop sonrası güncellenmiş profile frontend'e ulaşmıyor. Bir sonraki sensorData event'inde (1s sonra) sessionStatus.profile ile gelir ama o arada grafik eski profile ile çizilir.
- **Çözüm:** Frontend'de `handleChamberControl`'e `sessionResumed` ve `sessionStopped` handler'ları ekle. Profile'ı sessionStatusStore'a yaz.

---

## 🟡 Orta Seviye Sorunlar

### 6. PID ve internal değerler gereksiz gönderiliyor
- **Konum:** Backend `index.js:1366-1373` — sessionStatus objesinin tamamı emit ediliyor
- **Gereksiz alanlar:** `comp_offset`, `comp_gain`, `comp_depth`, `decomp_offset`, `decomp_gain`, `decomp_depth`, `pcontrol`, `ventil`, `main_fsw`, `fswd`, `hedeflenen[]`, `adimzaman[]`, `maxadim[]`, `adim`, `tempadim`, `lastdurum`, `wait`, `p2counter`, `diffrencesayac`, `alarmzaman`, `higho`, `highoc`, `higho2`, `ilksure`, `ilkfsw`, `otomanuel`, `minimumvalve`, `cikis`, `grafikdurum`, `starttime`, `pauseTime`, `pausetime`, `pauseDepteh`
- **Çözüm:** Backend'de emit öncesi slim payload oluştur:
  ```javascript
  const clientSessionStatus = {
      status: sessionStatus.status,
      zaman: sessionStatus.zaman,
      profile: sessionStatus.profile,
      hedef: sessionStatus.hedef,
      setDerinlik: sessionStatus.setDerinlik,
      toplamSure: sessionStatus.toplamSure,
      doorStatus: sessionStatus.doorStatus,
      doorSensorStatus: sessionStatus.doorSensorStatus,
      eop: sessionStatus.eop,
      chamberStatus: sessionStatus.chamberStatus,
      chamberStatusText: sessionStatus.chamberStatusText,
      patientWarningStatus: sessionStatus.patientWarningStatus,
      speed: sessionStatus.speed,
  };
  socket.emit('sensorData', { pressure, o2, temperature, humidity, sessionStatus: clientSessionStatus, doorStatus });
  ```

### 7. AcModal `JSON.stringify` ile emit — backend'de çalışmaz
- **Konum:** Frontend `AcModal.tsx:151-163`
  ```typescript
  socketService.emit('chamberControl', JSON.stringify({ type: 'acControl', data: {...} }));
  ```
- **Etki:** Backend'de `data.type === undefined` çünkü data bir string. AC kontrol komutu hiç çalışmıyor.
- **Çözüm:** `JSON.stringify` kaldır, direkt obje gönder:
  ```typescript
  socketService.emit('chamberControl', { type: 'acControl', data: {...} });
  ```
  Backend'e de `acControl` case'i ekle.

### 8. `ledColor` chamberControl type'ı backend'de case yok
- **Konum:** Frontend `LedModal.tsx:146`, `CctModal.tsx:112` — `{ type: 'ledColor', data: { color: rgb } }` gönderiyor
- **Backend:** `chamberControl` handler'da `ledColor` case'i yok
- **Etki:** Dead emit. LED kontrolü `writeMultipleRegisters` event'i ile register'a direkt yazılarak çalışıyor.
- **Çözüm:** Ya backend'e `ledColor` handler ekle, ya da frontend'den gereksiz emit'i kaldır.

### 9. AlarmManager clear'da socket emit yok
- **Konum:** Backend `alarm-manager.js:66-86` — `clear()` metodu alarm'ı Map'ten siler ama socket'e bildirim göndermez
- **Etki:** Backend'in kendi timeout'u veya cooldown bitimi ile alarm kapandığında frontend habersiz kalır. Alarm modal'ı açık kalabilir.
- **Çözüm:** AlarmManager `clear()` metoduna socket emit ekle:
  ```javascript
  clear(type) {
      if (!this.activeAlarms.has(type)) return false;
      // ... mevcut kod ...
      if (this.socket) {
          this.socket.emit('chamberControl', { type: 'alarmClear', data: { clearedType: type } });
      }
      return true;
  }
  ```

### 10. `profile` array her saniye yeni referansla geliyor
- **Konum:** Backend sessionStatus.profile obje referansı her emit'te aynı ama JSON serialize/deserialize sonrası yeni referans oluşuyor
- **Etki:** SessionProfileChart (memoized SVG generator) her saniye re-render
- **Çözüm:** (Sorun 6 ile birlikte çözülür — profile'ı sadece değiştiğinde göndermek ideal. Alternatif: frontend'de profile'ı deep compare ile cache'le)

---

## 🟢 Düşük Seviye Sorunlar

### 11. `sessionStarting` hem alarm hem direkt type olarak emit ediliyor
- **Konum:** Backend `index.js:858` → direkt `{ type: 'sessionStarting' }` + `index.js:1410` → `alarmSet('sessionStarting', ...)` → AlarmManager emit
- **Etki:** Duplicate emit, frontend sadece alarm yolunu dinliyor
- **Çözüm:** Direkt emit'i (`:858`) kaldır, sadece alarm yoluyla gönder.

### 12. `dalisSuresi`/`cikisSuresi` duplicate state
- **Konum:** sessionStatus içinde + sessionSettingsStore'da ayrıca tutuluyor
- **Etki:** Conceptual karışıklık, pratik sorun minimal
- **Çözüm:** Tek kaynak belirle — sessionStatus'tan al, sessionSettingsStore'dan kaldır.

### 13. sensorData string olarak geliyor
- **Konum:** Backend emit'i obje, ama frontend `JSON.parse(data)` yapıyor (`useSocketSensorData.ts:76`)
- **Etki:** Küçük CPU maliyeti, double serialization
- **Çözüm:** Socket.io zaten JSON serialize eder. Frontend'de parse kaldırılabilir veya backend'in gönderim formatı kontrol edilmeli.

---

## Uygulama Öncelik Sırası

| Adım | Sorunlar | Taraf | Zorluk | Etki |
|------|----------|-------|--------|------|
| 1 | #1, #6 | Backend | Orta | Payload %60-80 küçülür |
| 2 | #2, #3 | Frontend | Orta | Re-render sayısı yarıya iner |
| 3 | #4 | Frontend | Kolay | Değişmeyen sensorler re-render tetiklemez |
| 4 | #7 | Frontend | Kolay | AC kontrol çalışır hale gelir |
| 5 | #5 | Frontend | Kolay | Profile güncellemesi anında yansır |
| 6 | #9 | Backend | Kolay | Alarm senkronizasyonu düzelir |
| 7 | #10 | Frontend | Orta | SessionProfileChart gereksiz re-render durur |
| 8 | #8, #11 | Her iki taraf | Kolay | Dead code temizliği |
| 9 | #12, #13 | Her iki taraf | Kolay | Temizlik |

---

## Frontend SessionStatusData Interface Önerisi (Slim)

Sorun #6 uygulandıktan sonra frontend type'ı güncellenmeli:

```typescript
export interface SessionStatusData {
    status: number;          // 0=idle, 1=running, 2=paused
    zaman: number;           // elapsed seconds
    profile: any[];          // [duration, depth, phase] array
    hedef: number;           // target pressure
    setDerinlik: number;     // set depth (bar)
    toplamSure: number;      // total duration (seconds)
    doorStatus: number;      // 0/1
    doorSensorStatus: number;// hardware sensor
    eop: number;             // end of profile flag
    chamberStatus: number;   // device status
    chamberStatusText: string;
    patientWarningStatus: number;
    speed: number;           // 1-3
}
```

57 alan → 13 alan. Kullanılmayan 44 alan kaldırılır.
