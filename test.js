const mqtt = require('mqtt');
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const protocol = 'mqtts';
// Set the host and port based on the connection information.
const host = process.env.MQTT_HOST || 'u1691114.ala.eu-central-1.emqxsl.com';
const port = process.env.MQTT_PORT || '8883';
const username = process.env.MQTT_USERNAME || 'arc02';
const password = process.env.MQTT_PASSWORD || 'Sencer77.';
const clientId = process.env.MQTT_CLIENT_ID || `arco02-${Date.now()}`;
const connectUrl = `${protocol}://${host}:${port}`;

// MQTT bağlantı seçeneklerini hazırla
const mqttOptions = {
	clientId,
	clean: true,
	connectTimeout: 10000,
	username,
	password,
	reconnectPeriod: 1000,
	rejectUnauthorized: false, // Self-signed sertifikalar için
};

// CA sertifika dosyası varsa ekle
const caPath = path.join(__dirname, 'emqxsl-ca.crt');
if (fs.existsSync(caPath)) {
	mqttOptions.ca = fs.readFileSync(caPath);
}

const client = mqtt.connect(connectUrl, mqttOptions);

const topic = 'hyperbaric/chamber/all';

client.on('connect', () => {
	client.subscribe([topic], () => {
		client.publish(topic, 'nodejs mqtt test', { qos: 0, retain: false });
	});
});

client.on('error', (error) => {
	if (error.code === 5) {
		console.error('MQTT authentication error: Not authorized');
	} else {
		console.error('MQTT error:', error.message);
	}
});

client.on('message', (topic, payload) => {
	console.log('Received Message:', topic, payload.toString());
});
