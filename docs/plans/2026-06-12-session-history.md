# Seans Geçmişi (History) — Tasarım

## Amaç
Seansların basınç/sıcaklık/nem/O2 verilerini hedef profille birlikte kaydetmek,
pause/resume/stop/complete olaylarını tutmak ve mobil uygulamada (hiper-flow-dikey)
History ekranında göstermek. stack-control / stack-flow'daki kanıtlanmış yapı temel alınır.

## Mevcut Durum
- `SessionRecords` + `SessionSensorLogs` (1 Hz) modelleri ve kayıt akışı ÇALIŞIYOR
  (11 seans, 2056 log mevcut).
- Eksikler: doğal bitişte kayıt kapanmıyor (hep `started` kalıyor), pause/resume
  olayları kaydedilmiyor, açılışta yarım kalan kayıtlar temizlenmiyor, mobil ekran yok.
- Profil tabloları boş — profil otomatik üretiliyor; hedef eğri `targetPressure`
  olarak loglarda zaten saniyelik mevcut. Ayrıca profil bağlamaya gerek yok.

## Backend (coral-control-arc)
1. `sessionRecord.model.js`: `events` TEXT JSON kolonu
   (`[{type:'pause'|'resume'|'stop'|'complete', t:saniye, pressure:bar}]`).
2. `index.js`:
   - `addSessionEvent(type)` yardımcı fonksiyonu (id'yi senkron yakalar, hata yutar).
   - sessionPause → event 'pause' + kayıt status 'paused'
   - sessionResume → event 'resume' + status 'started'
   - sessionStop → event 'stop' (mevcut `completeSessionRecord('stopped')` korunur)
   - Doğal bitiş (endOfSession) → event 'complete' + `completeSessionRecord('completed')`
   - Açılışta: `endedAt IS NULL` kayıtlar `interrupted` olarak kapatılır.
3. `routes/sessions.js` — mobil kontratına uygun yeni uçlar (mevcutlar korunur):
   - `GET /api/session-history?limit&offset` → özet liste
     (`{id,startTime,endTime,status,targetPressure,duration,speed,pauseCount}`,
     status `started/paused`→`running` olarak haritalanır)
   - `GET /api/session-history/:id` → detay: özet alanlar + `events` +
     `samples: [[t, hedefBar, basınçBar, sıcaklık, nem, o2], ...]`
     (SessionSensorLogs'tan 10 sn'e seyreltilmiş — eski seanslar da çalışır)

## Frontend (hiper-flow-dikey) — stack-flow'dan port, tema token'lı
1. `src/services/sessionsService.ts` — tipler + `getSessions` / `getSessionDetail`.
2. `src/components/historyChart/` — `chartMath.ts` (saf geometri),
   `HistoryChart.tsx` (hedef kesikli + gerçek basınç + pause bantları),
   `MiniSeriesChart.tsx` (sıcaklık/O2/nem mini serileri). Renkler appTheme'den
   (4 temada — Stone dahil — uyumlu).
3. `src/screens/main/History/` — sol liste (tarih, süre, hedef bar, durum noktası,
   pause rozeti) + sağ detay (özet çipler, grafik, mini seriler).
4. Navigasyon: `MainStackParamList`'e `History`, `MainStack`'e ekran,
   Sidebar'a History sekmesi (Dashboard15/22 + Settings handleTabPress).

## Hata Yönetimi
- Kayıt fonksiyonları hiçbir hatayı kontrol döngüsüne fırlatmaz (log + devam).
- Mobil: liste/detay için ayrı hata + retry durumları.
