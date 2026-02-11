const WebSocket = require('ws');
const { URL } = require('url');

function createWebSocket(url, id) {
	const u = new URL(url);
	u.searchParams.set('id', id);
	return new WebSocket(u.toString());
}

async function sendCommand({ url, my, to, command, mapped, timeoutMs = 2000 }) {
	return new Promise((resolve, reject) => {
		const ws = createWebSocket(url, my);

		const timer = setTimeout(() => {
			try {
				ws.close(1000, 'timeout');
			} catch {}
			reject(new Error('WebSocket timeout'));
		}, timeoutMs);

		function safeResolve(value) {
			clearTimeout(timer);
			try {
				ws.close(1000, 'done');
			} catch {}
			resolve(value);
		}

		ws.on('open', () => {
			const payload = { type: 'command', to, command: mapped ?? command };
			ws.send(JSON.stringify(payload));
		});

		ws.on('message', (data) => {
			try {
				const msg = JSON.parse(data.toString());
				if (msg.type === 'system' && msg.event === 'peer_unavailable') {
					safeResolve({ ok: false, reason: 'peer_unavailable', message: msg });
					return;
				}
				safeResolve({ ok: true, message: msg });
			} catch (e) {
				safeResolve({ ok: true, raw: data.toString() });
			}
		});

		ws.on('error', (err) => {
			clearTimeout(timer);
			reject(err);
		});

		ws.on('close', (code, reason) => {
			// no-op; resolution handled elsewhere
		});
	});
}

module.exports = { sendCommand };
