#!/usr/bin/env node
const { sendCommand } = require('./src/ws/client');

function parseArgs() {
	const args = process.argv.slice(2);
	const out = {};
	for (let i = 0; i < args.length; i += 2) {
		const k = args[i]?.replace(/^--/, '');
		const v = args[i + 1];
		if (k) out[k] = v;
	}
	return out;
}

(async () => {
	const {
		url = process.env.SIGNALING_URL || 'ws://192.168.1.12:8080/ws',
		my = process.env.MY_ID || 'node-cli-1',
		to = process.env.TO_ID || 'raspi-1',
		cmd = process.env.CMD || 'play',
	} = parseArgs();

	const mapped =
		cmd === 'play' ? 'play_door_close' : cmd === 'stop' ? 'stop_effect' : cmd;

	try {
		const result = await sendCommand({ url, my, to, command: cmd, mapped });
		console.log(JSON.stringify(result));
		process.exit(result.ok ? 0 : 2);
	} catch (err) {
		console.error('sendCommand error:', err.message);
		process.exit(1);
	}
})();
