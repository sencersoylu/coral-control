'use strict';

class CloudReporter {
	constructor({ apiUrl, apiKey, enabled }) {
		this.apiUrl = apiUrl;
		this.apiKey = apiKey;
		this.enabled = !!enabled;
		this._heartbeatInterval = null;

		if (this.enabled) {
			console.log('[CloudReporter] Enabled — API:', this.apiUrl);
		} else {
			console.log('[CloudReporter] Disabled — CLOUD_API_URL or CHAMBER_API_KEY not set');
		}
	}

	async _request(method, path, body) {
		if (!this.enabled) return null;

		try {
			const url = `${this.apiUrl}${path}`;
			const res = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					'X-Chamber-Key': this.apiKey,
				},
				body: body ? JSON.stringify(body) : undefined,
			});

			if (!res.ok) {
				const text = await res.text().catch(() => '');
				console.error(`[CloudReporter] ${method} ${path} failed: ${res.status} ${text}`);
				return null;
			}

			const contentType = res.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				return await res.json();
			}
			return null;
		} catch (err) {
			console.error(`[CloudReporter] ${method} ${path} error:`, err.message);
			return null;
		}
	}

	/**
	 * 30sn aralıklarla heartbeat gönderir
	 * @param {number} interval - ms cinsinden interval (default 30000)
	 * @param {Function} getState - () => { sensorData, sessionStatus, alarmStatus, isConnectedPLC }
	 */
	startHeartbeat(interval, getState) {
		if (!this.enabled) return;

		this._heartbeatInterval = setInterval(async () => {
			const { sensorData, sessionStatus, alarmStatus, isConnectedPLC } = getState();
			await this.heartbeat(sensorData, sessionStatus, alarmStatus, isConnectedPLC);
		}, interval);

		console.log(`[CloudReporter] Heartbeat started (${interval / 1000}s interval)`);
	}

	stopHeartbeat() {
		if (this._heartbeatInterval) {
			clearInterval(this._heartbeatInterval);
			this._heartbeatInterval = null;
		}
	}

	async heartbeat(sensorData, sessionStatus, alarmStatus, isConnectedPLC) {
		return this._request('POST', '/api/heartbeat', {
			pressure: sensorData.pressure,
			o2: sensorData.o2,
			temperature: sensorData.temperature,
			humidity: sensorData.humidity,
			pressureFsw: sessionStatus.main_fsw,
			targetFsw: sessionStatus.hedef,
			compValvePosition: sessionStatus.pcontrol,
			decompValvePosition: sessionStatus.vanacikis,
			sessionActive: sessionStatus.status === 1,
			sessionStatus: sessionStatus.status,
			sessionTime: sessionStatus.zaman,
			targetPressure: sessionStatus.hedef,
			graphState: sessionStatus.grafikdurum,
			chamberStatus: sessionStatus.chamberStatus,
			chamberStatusText: sessionStatus.chamberStatusText,
			plcConnected: isConnectedPLC === 1,
			pressRateFswPerMin: sessionStatus.pressRateFswPerMin,
			pressRateBarPerMin: sessionStatus.pressRateBarPerMin,
		});
	}

	/**
	 * Seans başlangıcında çağrılır
	 * @param {object} sessionStatus
	 * @param {object} [extras] - { sessionNumber, patientLocalId, operatorName }
	 * @returns {string|null} cloud session id
	 */
	async sessionStart(sessionStatus, extras) {
		const result = await this._request('POST', '/api/sessions/start', {
			targetDepth: sessionStatus.setDerinlik,
			diveDuration: sessionStatus.dalisSuresi,
			exitDuration: sessionStatus.cikisSuresi,
			totalPlannedDuration: sessionStatus.toplamSure,
			speed: sessionStatus.speed,
			profileData: sessionStatus.profile,
			...extras,
		});

		return result?.id || null;
	}

	/**
	 * Seans bitişinde çağrılır
	 * @param {string} cloudSessionId
	 * @param {object} endData - { durationMinutes, status }
	 */
	async sessionEnd(cloudSessionId, endData) {
		return this._request('PUT', `/api/sessions/${cloudSessionId}/end`, endData);
	}

	async alert(alertData) {
		return this._request('POST', '/api/alerts', alertData);
	}

	async alertClear(alertData) {
		return this._request('POST', '/api/alerts', {
			...alertData,
			resolved: true,
		});
	}

	async syncPatient(patientData) {
		return this._request('POST', '/api/patients/sync', patientData);
	}

	async updateConfig(configData) {
		return this._request('PUT', '/api/chambers/config', configData);
	}
}

module.exports = CloudReporter;
