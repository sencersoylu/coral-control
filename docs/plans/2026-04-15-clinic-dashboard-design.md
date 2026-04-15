# Multi-Cabin Clinic Dashboard Design

## Goal
Web-based real-time monitoring dashboard for clinics with multiple hyperbaric chambers. Shows all cabins in a 2x2 grid with live sensor data, pressure chart, camera feed, intercom, and alarms.

## Key Decisions
- **Platform:** Web (single HTML file served from any cabin's express.static)
- **Data source:** Direct socket.io connection to each cabin's ioServer (port 4001)
- **Config:** Add/remove cabins via settings panel, stored in localStorage
- **Layout:** 2x2 grid, optimized for 4K (3840x2160), responsive down to 1080p
- **Scope:** Full package — sensors, chart, camera (WebRTC WHEP), intercom (PTT), alarms

## Layout (2x2 Grid)

Each panel ~1920x1080 at 4K. Responsive scaling for smaller screens.

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│ Kabin 1                  ● Connected │ Kabin 2                  ● Connected │
│ ┌────────────────┐  Basınç: 1.42 bar │ ┌────────────────┐  Basınç: 0 bar   │
│ │                │  Hedef:  1.50 bar  │ │                │  Durum: Idle      │
│ │   KAMERA       │  O2: 21%  T: 23°C │ │   KAMERA       │                   │
│ │   (960x540)    │  Nem: 45%          │ │   (960x540)    │                   │
│ │                │  Durum: Running    │ │                │                   │
│ │                │  12:34/65:00  %52  │ │                │                   │
│ └────────────────┘  Hız:2 Mask:ON    │ └────────────────┘                   │
│ [PTT] [cam1-4]      Grafik: Düz     │ [PTT] [cam1-4]                      │
│ ┌────────────────────────────────┐   │ ┌────────────────────────────────┐   │
│ │ Pressure Chart (target+real)   │   │ │ (empty — no session)           │   │
│ └────────────────────────────────┘   │ └────────────────────────────────┘   │
│ ⚠ highO2: High O₂ level             │ No active alarms                    │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ Kabin 3                              │ Kabin 4 / + Add Cabin               │
│ ...                                  │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Panel Inner Layout (~1920x1080 each)
- **Header** (40px): Cabin name + status badge + connection indicator
- **Upper zone** (540px): Camera (left, 960x540 16:9) + sensor/session data grid (right)
- **Camera control bar** (40px): PTT button + camera selector (cam1/2/3/4)
- **Chart** (300px): Canvas pressure chart — target vs real + O2 zones (blue)
- **Alarm bar** (80px): Active alarms, scrollable

### Responsive Behavior
- 4K (3840x2160): 2x2 grid, each panel ~1920x1080
- 2K (2560x1440): 2x2 grid, panels scale down proportionally
- 1080p (1920x1080): 2x2 grid, compact mode — smaller camera, condensed data
- Below 1080p: Single column scroll (unlikely for clinic use)

## Cabin Configuration

Settings panel (gear icon in top-right corner). Per cabin:
- Cabin name (e.g., "Kabin 1")
- Server address (IP:port, e.g., `192.168.1.10:4001`)
- Media server address (WHEP endpoint, e.g., `192.168.1.10:8889`)
- Signaling server address (intercom, e.g., `ws://192.168.1.10:8080/ws`)
- Camera IDs (default: cam1, cam2, cam3, cam4)

Stored in localStorage. Add/edit/remove via UI.

## Data Flow Per Cabin

```
Cabin Server (ioServer :4001)
├─ socket.io events received:
│   ├─ sensorData    → pressure, O2, temperature, humidity
│   ├─ sessionStatus → status, zaman, hedef, grafikdurum, oksijen, adim, etc.
│   ├─ sessionProfile → profile array for chart
│   └─ alarmStatus   → active alarms list
└─ socket.io events sent:
    └─ requestSessionProfile → request current profile on connect

Media Server (:8889)
└─ WebRTC WHEP → /cam1/whep, /cam2/whep, etc.
    → RTCPeerConnection → <video> element

Signaling Server (ws://:8080/ws)
└─ WebSocket → PTT intercom audio
    → RTCPeerConnection with audio track
```

## Camera (WebRTC WHEP)

Same approach as mobile app's mediaService:
1. Create RTCPeerConnection with addTransceiver('video', {direction: 'recvonly'})
2. Create offer, set local description
3. POST offer SDP to `http://{mediaServer}:8889/{camId}/whep`
4. Set remote description from response
5. Render remote stream in <video> element

Camera selector buttons (cam1-4) switch active stream. Click camera for larger view (modal/overlay).

## Intercom (PTT)

Same approach as mobile app's mediaService PTT:
1. Open WebSocket to signaling server
2. On PTT button press: getUserMedia({audio: true}), create RTCPeerConnection
3. Exchange SDP/ICE via WebSocket signaling
4. On PTT release: close audio track, cleanup peer connection
5. Visual indicator: mic active state + audio level meter

## Alarms

- Listen to `alarmStatus` event per cabin
- Show active alarms in alarm bar with type + text
- Browser Notification API for new alarms
- Audio alert (beep) on critical alarms (highO2, patientEmergency)
- Visual flash on cabin header when alarm active

## Technology

- Single HTML file: `public/clinic-dashboard.html`
- Socket.IO client from CDN
- WebRTC native browser API
- Canvas for pressure charts
- CSS Grid for 2x2 layout
- localStorage for cabin config
- No framework, no build step

## Server-Side Changes

None required. Existing ioServer broadcasts all needed events.

## Out of Scope (v1)
- Session start/stop control from dashboard
- Patient management
- Historical session reports
- User authentication
- Recording/playback of camera
