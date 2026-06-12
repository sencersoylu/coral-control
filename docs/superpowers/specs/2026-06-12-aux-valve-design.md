# Auxiliary Valve (M250/M251) Otomatik Kontrol — Tasarım

**Tarih:** 2026-06-12
**Durum:** Onaylandı

## Amaç

Sistemdeki auxiliary valve, PLC üzerinde iki coil ile sürülüyor:

- **M0250** = 1 → vana açılır
- **M0251** = 1 → vana kapanır

İstenen davranış:

1. **Otomatik açma:** Seans sırasında, çıkış (dekompresyon) fazında basınç son 0.10 bar'a indiğinde M0250 otomatik tetiklenir.
2. **Otomatik kapatma:** Seans bittiğinde M0251 tetiklenir, vana kapanır.
3. **Manuel kontrol:** Mobil uygulamadan `chamberControl` üzerinden manuel aç/kapat yapılabilir.

## Kararlar (kullanıcı ile netleştirildi)

| Konu | Karar |
|---|---|
| Tetik koşulu | Profil sonuna yakınken (çıkış süresi içinde) basınç ≤ 0.10 bar |
| Coil sürme şekli | "1 yaz ve bırak" — pulse yok, karşıt coil sıfırlanmaz |
| Manuel kontrol | Evet, `auxValveOpen` / `auxValveClose` chamberControl tipleri eklenecek |
| Eşik değeri | Kod içinde sabit (`0.10` bar), config'e taşınmayacak (YAGNI) |
| Demo mod | Kapsam dışı — demo döngüsü PLC'ye yazmıyor |

## Tasarım

Tüm değişiklikler `index.js` içinde, mevcut kalıplar takip edilerek yapılır
(bkz. M0305/M0306 handler'ları, `doorOpen()`/`oxygenOpen()` helper'ları).

### 1. Helper fonksiyonlar

`doorOpen()`/`oxygenClose()` civarına (≈ `index.js:2890`):

```js
function auxValveOpen() {
    socket.emit('writeBit', { register: 'M0250', value: 1 });
}

function auxValveClose() {
    socket.emit('writeBit', { register: 'M0251', value: 1 });
}

function auxValveSessionReset() {
    socket.emit('writeBit', { register: 'M0250', value: 0 });
    socket.emit('writeBit', { register: 'M0251', value: 0 });
    sessionStatus.auxValveOpened = false;
}
```

### 2. Otomatik açma (ana kontrol döngüsü)

Ana kontrol döngüsünde, seans sonu kontrolünün hemen üstüne (≈ `index.js:2191`):

```js
// Auxiliary valve: çıkış fazında son 0.10 bar'a inince aç
if (
    sessionStatus.status == 1 &&
    !sessionStatus.auxValveOpened &&
    Array.isArray(sessionStatus.profile) &&
    sessionStatus.zaman >= sessionStatus.profile.length - sessionStatus.cikisSuresi * 60 &&
    sessionStatus.pressure <= 0.1
) {
    auxValveOpen();
    sessionStatus.auxValveOpened = true;
}
```

Notlar:

- `sessionStatus.pressure` bar cinsindendir (`main_fsw / 33.4`).
- `cikisSuresi` dakika, `profile` dizisi saniye bazlıdır → `cikisSuresi * 60`.
- `auxValveOpened` one-shot bayrağıdır; seans başına bir kez tetiklenir.
- Manuel durdurma (`sessionStop()`) profili kısalttığı için aynı koşul orada da
  doğal olarak çalışır — ayrı bir kod yolu gerekmez.

### 3. Otomatik kapatma (seans sonu)

Mevcut `eop` bloğunda (≈ `index.js:2198`), `sessionStartBit(0)` çağrısının yanına:

```js
auxValveClose();
```

`eop` bloğu hem doğal seans bitişini hem de manuel durdurma sonrası yüzeye
dönüşü yakaladığı için tek kapatma noktası yeterlidir.

### 4. Temiz başlangıç

Üç seans başlatma noktasının her birine `auxValveSessionReset()` çağrısı eklenir:

- `dashSocket.on('sessionStart')` — `index.js:751`
- `chamberControl` içinde `dt.type == 'sessionStart'` — `index.js:~1157`
- `socket.on('sessionStart')` — `index.js:~1482`

Böylece her seans temiz kenarla başlar; önceki seanstan kalan coil değerleri
sorun yaratmaz.

### 5. Manuel kontrol (chamberControl)

M0305/M0306 kalıbıyla, `chamberControl` handler zincirine (≈ `index.js:1279`):

```js
} else if (dt.type == 'auxValveOpen') {
    auxValveOpen();
} else if (dt.type == 'auxValveClose') {
    auxValveClose();
}
```

## Hata yönetimi

- PLC bağlantısı koptuğunda `socket.emit` sessizce başarısız olur — mevcut
  `writeBit` çağrılarıyla aynı davranış, ek işlem yapılmaz.
- `auxValveOpened` bayrağı `sessionStatus` üzerinde tutulur; seans sonu reset
  bloğu `sessionStatus`'u sıfırladığında bayrak da doğal olarak temizlenir
  (yine de `auxValveSessionReset()` açıkça `false` yazar).

## Test

Projede otomatik test altyapısı yok. Doğrulama manuel yapılır:

1. Seans başlat → M0250/M0251 = 0 yazıldığını PLC tarafında doğrula.
2. Seans başında basınç < 0.10 bar iken M0250'nin **tetiklenmediğini** doğrula
   (çıkış fazı koşulu sayesinde).
3. Çıkış fazında basınç 0.10 bar'ın altına inince M0250 = 1 yazıldığını doğrula
   (bir kez, tekrar tekrar değil).
4. Seans bitince (eop) M0251 = 1 yazıldığını doğrula.
5. Manuel durdurma (sessionStop) senaryosunda da 3–4'ün çalıştığını doğrula.
6. Uygulamadan `auxValveOpen`/`auxValveClose` komutlarının çalıştığını doğrula.

## Açık nokta / gelecek iş

- "1 yaz ve bırak" seçimi nedeniyle açma sonrası M0250, kapatma sonrası M0251
  set kalır; iki coil aynı anda 1 olabilir. Seans başı sıfırlama bunu pratikte
  çözer. PLC tarafında sorun olursa karşılıklı sıfırlamaya geçilir.
- Eşik (0.10 bar) ileride gerekirse config DB'ye taşınabilir.
