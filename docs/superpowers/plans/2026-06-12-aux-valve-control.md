# Auxiliary Valve (M250/M251) Kontrol Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auxiliary valve'i çıkış fazında basınç ≤ 0.10 bar olunca otomatik açan (M0250), seans sonunda otomatik kapatan (M0251), manuel kontrol ve durum geri bildirimi sunan kontrol mantığı.

**Architecture:** Tüm değişiklikler `index.js` içinde, mevcut kalıpları takip eder: coil yazma `socket.emit('writeBit', ...)` (bkz. M0305/M0306), durum okuma `(byte >> n) & 1` (bkz. `data[10]` statusByte), one-shot bayrak `sessionStatus` üzerinde. Spec: `docs/superpowers/specs/2026-06-12-aux-valve-design.md`.

**Tech Stack:** Node.js, Socket.IO (PLC köprüsü), tek dosya monolit (`index.js`).

**Test notu:** Projede test/lint altyapısı yok (CLAUDE.md). Her görevde doğrulama `node --check index.js` (sözdizimi) ile yapılır; davranış doğrulaması spec'teki manuel test listesiyle sahada yapılır.

---

### Task 1: Helper fonksiyonlar (auxValveOpen / auxValveClose / auxValveSessionReset)

**Files:**
- Modify: `index.js` (≈ satır 2888, `doorOpen()` ile `oxygenOpen()` arasına)

- [ ] **Step 1: Helper fonksiyonları ekle**

`index.js` içinde şu mevcut bloğu bul (≈ satır 2884–2893):

```js
function doorOpen() {
	console.log('door Opening');
	socket.emit('writeBit', { register: 'M0100', value: 0 });
	sessionStatus.doorStatus = 0;
}

function oxygenOpen() {
```

`doorOpen()` fonksiyonunun kapanış `}`'inden sonra, `function oxygenOpen()` satırından önce şunu ekle:

```js
function auxValveOpen() {
	console.log('Aux valve opening');
	socket.emit('writeBit', { register: 'M0250', value: 1 });
}

function auxValveClose() {
	console.log('Aux valve closing');
	socket.emit('writeBit', { register: 'M0251', value: 1 });
}

function auxValveSessionReset() {
	socket.emit('writeBit', { register: 'M0250', value: 0 });
	socket.emit('writeBit', { register: 'M0251', value: 0 });
	sessionStatus.auxValveOpened = false;
}
```

Not: Register adları 4 haneli yazılır (`M0250`, `M0251`) — M0305/M0306 kalıbıyla aynı. "1 yaz ve bırak" kararı gereği open/close fonksiyonları karşıt coil'e dokunmaz; temiz kenar `auxValveSessionReset()` ile seans başında sağlanır.

- [ ] **Step 2: Sözdizimi doğrula**

Run: `node --check index.js`
Expected: çıktı yok (exit 0)

- [ ] **Step 3: Commit**

```bash
git add index.js
git commit -m "feat: aux valve helper fonksiyonları (M0250/M0251)"
```

---

### Task 2: data[18] bit 4/5 vana durum okuma + sessionStatus yayını

**Files:**
- Modify: `index.js` (≈ satır 869–872, `socket.on('data')` içindeki statusByte bloğu)
- Modify: `index.js` (≈ satır 1680–1681, 1 sn'lik `sessionStatus` broadcast payload'ı)

- [ ] **Step 1: data[18] bitlerini parse et**

`index.js` içinde şu mevcut bloğu bul (≈ satır 869–872):

```js
				const statusByte = dataObject.data[10];
				sessionStatus.patientWarningStatus = (statusByte >> 0) & 1;
				sessionStatus.doorSensorStatus = (statusByte >> 1) & 1;
				sessionStatus.smokeSensorStatus = (statusByte >> 2) & 1;
```

Hemen altına şunu ekle:

```js
				const auxValveByte = dataObject.data[18];
				sessionStatus.auxValveOpenStatus = (auxValveByte >> 4) & 1; // 1 = vana açık
				sessionStatus.auxValveClosedStatus = (auxValveByte >> 5) & 1; // 1 = vana kapalı
```

- [ ] **Step 2: Broadcast payload'ına alanları ekle**

`index.js` içinde 1 sn'lik broadcast döngüsündeki `global.ioServer.emit('sessionStatus', {...})` payload'ının sonunu bul (≈ satır 1680–1681):

```js
				higho: sessionStatus.higho,
				highHumidity: sessionStatus.highHumidity,
			});
```

Şöyle değiştir:

```js
				higho: sessionStatus.higho,
				highHumidity: sessionStatus.highHumidity,
				auxValveOpenStatus: sessionStatus.auxValveOpenStatus,
				auxValveClosedStatus: sessionStatus.auxValveClosedStatus,
			});
```

Not: `dashSocket` bağlantı anında (satır 722) tüm `sessionStatus` objesini gönderdiği için orada değişiklik gerekmez. Bu alanlar fiziksel durumu yansıtır, seans sonunda sıfırlanmaz.

- [ ] **Step 3: Sözdizimi doğrula**

Run: `node --check index.js`
Expected: çıktı yok (exit 0)

- [ ] **Step 4: Commit**

```bash
git add index.js
git commit -m "feat: aux valve durum geri bildirimi (data[18] bit 4/5) + yayın"
```

---

### Task 3: Seans başlangıcında coil sıfırlama (3 nokta)

**Files:**
- Modify: `index.js` ≈ satır 757 (`dashSocket.on('sessionStart')`)
- Modify: `index.js` ≈ satır 1165 (chamberControl `sessionStart`, `sessionStartBit(1)` yanı)
- Modify: `index.js` ≈ satır 1482 (`socket.on('sessionStart')`)

Üç seans başlatma noktasının her birine `auxValveSessionReset()` çağrısı eklenir (Task 1'de tanımlandı: M0250=0, M0251=0 yazar ve `sessionStatus.auxValveOpened = false` yapar).

- [ ] **Step 1: dashSocket sessionStart**

`index.js` ≈ satır 757–759'daki bloğu bul (`dashSocket.on('sessionStart', ...)` içinde):

```js
			sessionStatus.status = 1;
			sessionStatus.zaman = 0;
			sessionStatus.eop = 0;
```

Şöyle değiştir:

```js
			sessionStatus.status = 1;
			sessionStatus.zaman = 0;
			sessionStatus.eop = 0;
			auxValveSessionReset();
```

(Dikkat: aynı `sessionStatus.status = 1;` satırı dosyada birden çok yerde var — mutlaka `dashSocket.on('sessionStart'` handler'ı içindeki, `sessionStatus.zaman = 0;` ve `sessionStatus.eop = 0;` ile devam eden olanı değiştir.)

- [ ] **Step 2: chamberControl sessionStart**

`index.js` ≈ satır 1165'teki bloğu bul (chamberControl handler'ında, `saveLastSessionSettings(...)` çağrısından sonra):

```js
				sessionStartBit(1);
				sessionStatus.sessionStartTime = dayjs();
```

Şöyle değiştir:

```js
				sessionStartBit(1);
				auxValveSessionReset();
				sessionStatus.sessionStartTime = dayjs();
```

- [ ] **Step 3: socket sessionStart (eski handler)**

`index.js` ≈ satır 1478–1482'deki bloğu bul (`socket.on('sessionStart', ...)` içinde):

```js
			sessionStatus.speed = dt.dalisSuresi;
			applyDiveDurations(dt.setDerinlik, dt.dalisSuresi, 1);
			sessionStatus.toplamSure = dt.toplamSure;
			sessionStatus.setDerinlik = dt.setDerinlik;
			sessionStatus.status = 1;

			console.log(sessionStatus.dalisSuresi, sessionStatus.setDerinlik, 'air');
```

Şöyle değiştir:

```js
			sessionStatus.speed = dt.dalisSuresi;
			applyDiveDurations(dt.setDerinlik, dt.dalisSuresi, 1);
			sessionStatus.toplamSure = dt.toplamSure;
			sessionStatus.setDerinlik = dt.setDerinlik;
			sessionStatus.status = 1;
			auxValveSessionReset();

			console.log(sessionStatus.dalisSuresi, sessionStatus.setDerinlik, 'air');
```

- [ ] **Step 4: Sözdizimi doğrula**

Run: `node --check index.js`
Expected: çıktı yok (exit 0)

- [ ] **Step 5: Commit**

```bash
git add index.js
git commit -m "feat: seans başlangıcında aux valve coil ve bayrak sıfırlama"
```

---

### Task 4: Otomatik açma — çıkış fazında basınç ≤ 0.10 bar

**Files:**
- Modify: `index.js` (≈ satır 2191, ana kontrol döngüsündeki gerçek "Seans sonu kontrolü" bloğunun hemen üstü)

- [ ] **Step 1: One-shot otomatik açma kontrolünü ekle**

`index.js` içinde GERÇEK moddaki seans sonu kontrolünü bul (≈ satır 2191–2197). Dikkat: demo modda da `// Seans sonu kontrolü` yorumu var (≈ satır 2666, `main_fsw <= 0.5` içeren) — ONU DEĞİL, `sessionStatus.pressure < 0.01` içereni bul:

```js
		// Seans sonu kontrolü
		if (
			(sessionStatus.zaman > sessionStatus.profile.length - 30 ||
				sessionStatus.cikis == 1) &&
			sessionStatus.eop == 0 &&
			sessionStatus.pressure < 0.01
		) {
```

Bu bloğun hemen ÜSTÜNE şunu ekle:

```js
		// Aux valve: çıkış fazında basınç son 0.10 bar'a inince bir kez aç
		if (
			sessionStatus.status == 1 &&
			!sessionStatus.auxValveOpened &&
			Array.isArray(sessionStatus.profile) &&
			sessionStatus.zaman >=
				sessionStatus.profile.length - sessionStatus.cikisSuresi * 60 &&
			sessionStatus.pressure <= 0.1
		) {
			auxValveOpen();
			sessionStatus.auxValveOpened = true;
		}

```

Mantık notları:
- `sessionStatus.pressure` bar cinsinden (`main_fsw / 33.4`).
- `cikisSuresi` dakika, `profile` saniye bazlı dizi → `cikisSuresi * 60` ile profilin son (çıkış) dilimi hesaplanır. Bu koşul seans başındaki düşük basıncın yanlış tetiklemesini engeller.
- `auxValveOpened` one-shot bayrak: seans başına bir kez tetiklenir (Task 3'teki reset ile temizlenir).
- Manuel durdurmada (`sessionStop()`) profil kısaltıldığı için aynı koşul orada da doğal çalışır; ayrı kod yolu yok.

- [ ] **Step 2: Sözdizimi doğrula**

Run: `node --check index.js`
Expected: çıktı yok (exit 0)

- [ ] **Step 3: Commit**

```bash
git add index.js
git commit -m "feat: çıkış fazında 0.10 bar altında aux valve otomatik açma"
```

---

### Task 5: Otomatik kapatma — seans sonu (eop) bloğu

**Files:**
- Modify: `index.js` (≈ satır 2234–2237, gerçek eop bloğu içinde)

- [ ] **Step 1: eop bloğuna auxValveClose() ekle**

`index.js` içinde gerçek eop bloğundaki şu satırları bul (≈ satır 2234–2237; `decompValve(90)` içeren — demo bloğunda `oxygenClose()` vardır, o değil):

```js
			sessionStartBit(0);
			//doorOpen();
			compValve(0);
			decompValve(90);
```

Şöyle değiştir:

```js
			sessionStartBit(0);
			//doorOpen();
			compValve(0);
			decompValve(90);
			auxValveClose();
```

Not: eop bloğu hem doğal seans bitişini hem `sessionStop()` sonrası yüzeye dönüşü yakalar — tek kapatma noktası yeterli.

- [ ] **Step 2: Sözdizimi doğrula**

Run: `node --check index.js`
Expected: çıktı yok (exit 0)

- [ ] **Step 3: Commit**

```bash
git add index.js
git commit -m "feat: seans sonunda aux valve otomatik kapatma (M0251)"
```

---

### Task 6: Manuel kontrol — chamberControl handler'ları

**Files:**
- Modify: `index.js` (≈ satır 1279–1286, chamberControl else-if zinciri, M0305/M0306 handler'larının yanı)

- [ ] **Step 1: auxValveOpen/auxValveClose tiplerini ekle**

`index.js` içinde chamberControl zincirindeki şu bloğu bul (≈ satır 1279–1286):

```js
			} else if (dt.type == 'pttOn') {
				socket.emit('writeBit', { register: 'M0305', value: 1 });
			} else if (dt.type == 'pttOff') {
				socket.emit('writeBit', { register: 'M0305', value: 0 });
			} else if (dt.type == 'speakerOn') {
				socket.emit('writeBit', { register: 'M0306', value: 1 });
			} else if (dt.type == 'speakerOff') {
				socket.emit('writeBit', { register: 'M0306', value: 0 });
```

Şöyle değiştir (sona iki dal eklenir):

```js
			} else if (dt.type == 'pttOn') {
				socket.emit('writeBit', { register: 'M0305', value: 1 });
			} else if (dt.type == 'pttOff') {
				socket.emit('writeBit', { register: 'M0305', value: 0 });
			} else if (dt.type == 'speakerOn') {
				socket.emit('writeBit', { register: 'M0306', value: 1 });
			} else if (dt.type == 'speakerOff') {
				socket.emit('writeBit', { register: 'M0306', value: 0 });
			} else if (dt.type == 'auxValveOpen') {
				auxValveOpen();
			} else if (dt.type == 'auxValveClose') {
				auxValveClose();
```

Not: Manuel komutlar Task 1'deki helper'ları kullanır (writeBit'i doğrudan değil) — log'lu ve tek noktadan.

- [ ] **Step 2: Sözdizimi doğrula**

Run: `node --check index.js`
Expected: çıktı yok (exit 0)

- [ ] **Step 3: Commit**

```bash
git add index.js
git commit -m "feat: chamberControl auxValveOpen/auxValveClose manuel kontrol"
```

---

### Task 7: Saha doğrulaması (manuel test listesi)

**Files:** — (kod değişikliği yok)

Otomatik test altyapısı olmadığı için davranış doğrulaması PLC bağlı ortamda yapılır. Uygulamayı `npm start` ile başlat ve sırayla doğrula:

- [ ] **Step 1:** Seans başlat → PLC tarafında M0250 = 0 ve M0251 = 0 yazıldığını doğrula (auxValveSessionReset).
- [ ] **Step 2:** Seans başında basınç < 0.10 bar iken M0250'nin tetiklenMEdiğini doğrula (çıkış fazı koşulu).
- [ ] **Step 3:** Çıkış fazında basınç 0.10 bar altına inince konsolda bir kez "Aux valve opening" görüldüğünü ve M0250 = 1 yazıldığını doğrula (tekrar tetikleme yok).
- [ ] **Step 4:** Seans bitince (eop) konsolda "Aux valve closing" ve M0251 = 1 yazıldığını doğrula.
- [ ] **Step 5:** Manuel durdurma (sessionStop) senaryosunda Step 3–4'ün aynı şekilde çalıştığını doğrula.
- [ ] **Step 6:** Uygulamadan `chamberControl` ile `auxValveOpen`/`auxValveClose` gönderip vananın hareket ettiğini doğrula.
- [ ] **Step 7:** Vana fiziksel açılıp kapanırken `sessionStatus` yayınındaki `auxValveOpenStatus`/`auxValveClosedStatus` alanlarının doğru değiştiğini doğrula (data[18] bit 4/5).
