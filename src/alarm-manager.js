const dayjs = require('dayjs');

class AlarmManager {
	constructor({ socket, cloudReporter, getSensorData }) {
		this.socket = socket;
		this.cloudReporter = cloudReporter;
		this.getSensorData = getSensorData;
		this.activeAlarms = new Map();
		this.cooldowns = new Map();
		this.cooldownDefaults = {
			highO2: 10 * 60 * 1000,
			highHumidity: 10 * 60 * 1000,
			doorIsOpen: 30 * 1000,
			lowFfsTankPressure: 10 * 60 * 1000,
			lowFfsWaterLevel: 10 * 60 * 1000,
		};
	}

	setSocket(socket) {
		this.socket = socket;
	}

	raise(type, text, { duration = 0, cooldownMs } = {}) {
		if (this.activeAlarms.has(type)) return false;

		const cooldownExpiry = this.cooldowns.get(type);
		if (cooldownExpiry && Date.now() < cooldownExpiry) return false;

		const alarm = {
			status: 1,
			type,
			text,
			time: dayjs(),
			duration,
		};

		this.activeAlarms.set(type, alarm);

		if (this.socket) {
			this.socket.emit('chamberControl', {
				type: 'alarm',
				data: { ...alarm },
			});
		}

		if (this.cloudReporter) {
			const sensorData = this.getSensorData ? this.getSensorData() : {};
			this.cloudReporter.alert({
				alertType: type,
				alertMessage: text,
				severity: 'warning',
				sensorSnapshot: {
					pressure: sensorData?.pressure,
					o2: sensorData?.o2,
					temperature: sensorData?.temperature,
					humidity: sensorData?.humidity,
				},
			});
		}

		if (duration > 0) {
			setTimeout(() => this.clear(type), duration * 1000);
		}

		return true;
	}

	clear(type) {
		if (!this.activeAlarms.has(type)) return false;

		const alarm = this.activeAlarms.get(type);
		this.activeAlarms.delete(type);

		const cooldownMs = this.cooldownDefaults[type] || 0;
		if (cooldownMs > 0) {
			this.cooldowns.set(type, Date.now() + cooldownMs);
		}

		if (this.socket) {
			this.socket.emit('chamberControl', {
				type: 'alarmClear',
				data: { clearedType: type },
			});
		}

		if (this.cloudReporter) {
			this.cloudReporter.alertClear({
				alertType: alarm.type,
				alertMessage: alarm.text,
				severity: 'warning',
			});
		}

		return true;
	}

	clearAll() {
		for (const type of this.activeAlarms.keys()) {
			this.clear(type);
		}
	}

	// Operator dismissed the alarm on one tablet → dismiss on ALL tablets AND remove it (applying the
	// type's cooldown) so a persistent/recurring condition (high-O2, high-humidity, door, FFS) RE-WARNS
	// after the cooldown instead of being silenced forever; alarms with no cooldown (smoke, patient
	// emergency) re-raise next tick and cannot be permanently dismissed. Re-emits over the same
	// chamberControl path that delivers alarms, so both tablets close the modal instantly.
	acknowledge(type) {
		const types = type ? [type] : [...this.activeAlarms.keys()];
		let any = false;
		for (const t of types) {
			if (!this.activeAlarms.has(t)) continue;
			this.activeAlarms.delete(t);
			const cooldownMs = this.cooldownDefaults[t] || 0;
			if (cooldownMs > 0) this.cooldowns.set(t, Date.now() + cooldownMs);
			any = true;
			if (this.socket) {
				this.socket.emit('chamberControl', { type: 'alarmAck', data: { clearedType: t } });
			}
		}
		return any;
	}

	isActive(type) {
		return this.activeAlarms.has(type);
	}

	getStatus() {
		if (this.activeAlarms.size === 0) {
			return { status: 0, type: '', text: '', time: 0, duration: 0 };
		}
		const latest = [...this.activeAlarms.values()].pop();
		return { ...latest };
	}
}

module.exports = AlarmManager;
