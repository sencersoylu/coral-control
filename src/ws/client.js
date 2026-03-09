const WebSocket = require('ws');
const { URL } = require('url');

let persistentWs = null;
let persistentUrl = null;
let pendingResolve = null;

function getOrCreateWs(url, id) {
	const fullUrl = new URL(url);
	fullUrl.searchParams.set('id', id);
	const urlStr = fullUrl.toString();

	if (persistentWs && persistentWs.readyState === WebSocket.OPEN && persistentUrl === urlStr) {
		return persistentWs;
	}

	if (persistentWs) {
		try { persistentWs.close(1000, 'reconnecting'); } catch {}
	}

	persistentUrl = urlStr;
	const ws = new WebSocket(urlStr);

	ws.on('message', (data) => {
		if (!pendingResolve) return;
		try {
			const msg = JSON.parse(data.toString());
			if (msg.type === 'system' && msg.event === 'peer_unavailable') {
				pendingResolve({ ok: false, reason: 'peer_unavailable', message: msg });
			} else {
				pendingResolve({ ok: true, message: msg });
			}
		} catch (e) {
			pendingResolve({ ok: true, raw: data.toString() });
		}
		pendingResolve = null;
	});

	ws.on('close', () => {
		persistentWs = null;
		if (pendingResolve) {
			pendingResolve({ ok: false, reason: 'connection_closed' });
			pendingResolve = null;
		}
	});

	ws.on('error', (err) => {
		console.error('WS client error:', err.message);
		if (pendingResolve) {
			pendingResolve({ ok: false, reason: 'error', error: err.message });
			pendingResolve = null;
		}
	});

	persistentWs = ws;
	return ws;
}

async function sendCommand({ url, my, to, command, mapped, timeoutMs = 2000 }) {
	return new Promise((resolve) => {
		const ws = getOrCreateWs(url, my);
		const payload = { type: 'command', to, command: mapped ?? command };

		const timer = setTimeout(() => {
			if (pendingResolve) {
				pendingResolve = null;
				resolve({ ok: false, reason: 'timeout' });
			}
		}, timeoutMs);

		pendingResolve = (result) => {
			clearTimeout(timer);
			resolve(result);
		};

		if (ws.readyState === WebSocket.OPEN) {
			ws.send(JSON.stringify(payload));
		} else {
			ws.once('open', () => {
				ws.send(JSON.stringify(payload));
			});
		}
	});
}

module.exports = { sendCommand };
