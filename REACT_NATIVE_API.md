# React Native API Kullanım Kılavuzu

Bu dokümantasyon, Coral Control Arc API'sini React Native uygulamanızda nasıl kullanacağınızı açıklar.

## 📋 İçindekiler

- [Temel Yapılandırma](#temel-yapılandırma)
- [Sensör API'leri](#sensör-apileri)
- [Kullanıcı API'leri](#kullanıcı-apileri)
- [Kimlik Doğrulama API'leri](#kimlik-doğrulama-apileri)
- [Hasta API'leri](#hasta-apileri)
- [O2 Kalibrasyon API'leri](#o2-kalibrasyon-apileri)
- [Hata Yönetimi](#hata-yönetimi)
- [Örnek Kodlar](#örnek-kodlar)

---

## Temel Yapılandırma

### Base URL

```javascript
const API_BASE_URL = 'http://YOUR_SERVER_IP:4001';
// Örnek: 'http://192.168.1.100:4001' veya 'http://localhost:4001'
```

### Axios Kurulumu

```bash
npm install axios
# veya
yarn add axios
```

### API Service Oluşturma

```javascript
// services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://YOUR_SERVER_IP:4001';

const api = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json',
	},
});

// Request interceptor (token eklemek için)
api.interceptors.request.use(
	(config) => {
		const token = AsyncStorage.getItem('authToken');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Response interceptor (hata yönetimi için)
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// Token geçersiz, logout yap
			AsyncStorage.removeItem('authToken');
			// Navigate to login
		}
		return Promise.reject(error);
	}
);

export default api;
```

---

## Sensör API'leri

### 1. Sensör Listesini Getir

**Endpoint:** `GET /sensors/list`

**Açıklama:** Tüm sensörlerin listesini getirir.

**Kullanım:**

```javascript
import api from './services/api';

const getSensors = async () => {
	try {
		const response = await api.get('/sensors/list');
		console.log('Sensörler:', response.data);
		return response.data;
	} catch (error) {
		console.error(
			'Sensör listesi alınamadı:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

**Response Örneği:**

```json
{
	"success": true,
	"data": [
		{
			"sensorID": 1,
			"sensorName": "O2 Sensor",
			"sensorText": "Oxygen Sensor",
			"sensorMemory": 100,
			"sensorSymbol": "O2",
			"sensorOffset": 0,
			"sensorLowerLimit": 0.0,
			"sensorUpperLimit": 100.0,
			"sensorAnalogUpper": 16383,
			"sensorAnalogLower": 0,
			"sensorDecimal": 1
		}
	]
}
```

### 2. Sensör Güncelle

**Endpoint:** `PUT /sensors/:id`

**Açıklama:** Belirtilen ID'ye sahip sensörü günceller.

**Parametreler:**

- `id` (URL parametresi): Güncellenecek sensörün ID'si

**Body Parametreleri (hepsi opsiyonel):**

- `sensorName` (string): Sensör adı
- `sensorText` (string): Sensör açıklaması
- `sensorMemory` (number): Sensör hafıza değeri
- `sensorSymbol` (string): Sensör sembolü
- `sensorOffset` (number): Sensör offset değeri
- `sensorLowerLimit` (number): Alt limit
- `sensorUpperLimit` (number): Üst limit
- `sensorAnalogUpper` (number): Analog üst değer
- `sensorAnalogLower` (number): Analog alt değer
- `sensorDecimal` (number): Ondalık basamak sayısı

**Kullanım:**

```javascript
const updateSensor = async (sensorId, sensorData) => {
	try {
		const response = await api.put(`/sensors/${sensorId}`, {
			sensorName: sensorData.name,
			sensorLowerLimit: sensorData.lowerLimit,
			sensorUpperLimit: sensorData.upperLimit,
			// Sadece güncellemek istediğiniz alanları gönderin
		});
		console.log('Sensör güncellendi:', response.data);
		return response.data;
	} catch (error) {
		if (error.response?.status === 404) {
			console.error('Sensör bulunamadı');
		} else {
			console.error(
				'Sensör güncellenemedi:',
				error.response?.data || error.message
			);
		}
		throw error;
	}
};

// Kullanım örneği
await updateSensor(1, {
	name: 'Yeni Sensör Adı',
	lowerLimit: 0.5,
	upperLimit: 99.5,
});
```

**Response Örneği:**

```json
{
	"success": true,
	"data": {
		"sensorID": 1,
		"sensorName": "Yeni Sensör Adı",
		"sensorLowerLimit": 0.5,
		"sensorUpperLimit": 99.5
		// ... diğer alanlar
	}
}
```

**Hata Durumları:**

- `404`: Sensör bulunamadı
- `500`: Sunucu hatası

---

## Kullanıcı API'leri

### 1. Kullanıcı Listesini Getir

**Endpoint:** `GET /users`

**Kullanım:**

```javascript
const getUsers = async () => {
	try {
		const response = await api.get('/users');
		return response.data.users;
	} catch (error) {
		console.error(
			'Kullanıcı listesi alınamadı:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

### 2. Kullanıcı Oluştur

**Endpoint:** `POST /users`

**Body Parametreleri:**

- `username` (string, zorunlu): Kullanıcı adı
- `password` (string, zorunlu): Şifre
- `name` (string, zorunlu): İsim
- `role` (string, opsiyonel): Rol (varsayılan: 'user')

**Kullanım:**

```javascript
const createUser = async (userData) => {
	try {
		const response = await api.post('/users', {
			username: userData.username,
			password: userData.password,
			name: userData.name,
			role: userData.role || 'user',
		});
		return response.data.user;
	} catch (error) {
		if (error.response?.status === 409) {
			console.error('Kullanıcı zaten var');
		} else {
			console.error(
				'Kullanıcı oluşturulamadı:',
				error.response?.data || error.message
			);
		}
		throw error;
	}
};
```

### 3. Kullanıcı Güncelle

**Endpoint:** `PUT /users/:id`

**Kullanım:**

```javascript
const updateUser = async (userId, userData) => {
	try {
		const response = await api.put(`/users/${userId}`, {
			username: userData.username,
			password: userData.password,
			name: userData.name,
			role: userData.role,
		});
		return response.data.user;
	} catch (error) {
		console.error(
			'Kullanıcı güncellenemedi:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

### 4. Kullanıcı Sil

**Endpoint:** `DELETE /users/:id`

**Kullanım:**

```javascript
const deleteUser = async (userId) => {
	try {
		const response = await api.delete(`/users/${userId}`);
		return response.data.success;
	} catch (error) {
		console.error(
			'Kullanıcı silinemedi:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

---

## Kimlik Doğrulama API'leri

### 1. Giriş Yap

**Endpoint:** `POST /auth/login`

**Body Parametreleri:**

- `username` (string, zorunlu)
- `password` (string, zorunlu)

**Kullanım:**

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const login = async (username, password) => {
	try {
		const response = await api.post('/auth/login', {
			username,
			password,
		});

		// Token'ı sakla
		await AsyncStorage.setItem('authToken', response.data.token);
		await AsyncStorage.setItem('user', JSON.stringify(response.data.user));

		return response.data;
	} catch (error) {
		console.error('Giriş başarısız:', error.response?.data || error.message);
		throw error;
	}
};
```

### 2. Çıkış Yap

**Endpoint:** `POST /auth/logout`

**Kullanım:**

```javascript
const logout = async () => {
	try {
		await api.post('/auth/logout');
		await AsyncStorage.removeItem('authToken');
		await AsyncStorage.removeItem('user');
	} catch (error) {
		console.error('Çıkış hatası:', error.response?.data || error.message);
	}
};
```

---

## Hasta API'leri

### 1. Hasta Oluştur

**Endpoint:** `POST /patients`

**Body Parametreleri:**

- `fullName` (string, zorunlu)
- `birthDate` (string, zorunlu): ISO date formatında
- `gender` (string, zorunlu)

**Kullanım:**

```javascript
const createPatient = async (patientData) => {
	try {
		const response = await api.post('/patients', {
			fullName: patientData.fullName,
			birthDate: patientData.birthDate, // 'YYYY-MM-DD' formatında
			gender: patientData.gender,
		});
		return response.data;
	} catch (error) {
		console.error(
			'Hasta oluşturulamadı:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

### 2. Hasta Listesini Getir

**Endpoint:** `GET /patients`

**Kullanım:**

```javascript
const getPatients = async () => {
	try {
		const response = await api.get('/patients');
		return response.data;
	} catch (error) {
		console.error(
			'Hasta listesi alınamadı:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

---

## O2 Kalibrasyon API'leri

### 1. O2 Sensör Durumunu Getir

**Endpoint:** `GET /api/o2/status`

**Kullanım:**

```javascript
const getO2Status = async () => {
	try {
		const response = await api.get('/api/o2/status');
		return response.data;
	} catch (error) {
		console.error(
			'O2 durumu alınamadı:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

### 2. O2 Kalibrasyon Adımı Gerçekleştir

**Endpoint:** `POST /api/o2/calibration/step`

**Body Parametreleri:**

- `step` (string, zorunlu): 'step1_zero', 'step2_air', veya 'step3_pure'
- `measuredPercentage` (number, zorunlu): Ölçülen yüzde değeri

**Kullanım:**

```javascript
const performO2CalibrationStep = async (step, measuredPercentage) => {
	try {
		const response = await api.post('/api/o2/calibration/step', {
			step, // 'step1_zero', 'step2_air', 'step3_pure'
			measuredPercentage,
		});
		return response.data;
	} catch (error) {
		console.error(
			'Kalibrasyon adımı başarısız:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

### 3. O2 Kalibrasyonunu Sıfırla

**Endpoint:** `POST /api/o2/calibration/reset`

**Kullanım:**

```javascript
const resetO2Calibration = async () => {
	try {
		const response = await api.post('/api/o2/calibration/reset');
		return response.data;
	} catch (error) {
		console.error(
			'Kalibrasyon sıfırlanamadı:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

### 4. O2 Kalibrasyon Verilerini Getir

**Endpoint:** `GET /api/o2/calibration`

**Kullanım:**

```javascript
const getO2CalibrationData = async () => {
	try {
		const response = await api.get('/api/o2/calibration');
		return response.data;
	} catch (error) {
		console.error(
			'Kalibrasyon verileri alınamadı:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

### 5. O2 Gerçek Zamanlı Veri

**Endpoint:** `GET /api/o2/realtime`

**Kullanım:**

```javascript
const getO2Realtime = async () => {
	try {
		const response = await api.get('/api/o2/realtime');
		return response.data;
	} catch (error) {
		console.error(
			'Gerçek zamanlı veri alınamadı:',
			error.response?.data || error.message
		);
		throw error;
	}
};
```

---

## Hata Yönetimi

### Hata Tipleri

```javascript
// API çağrılarında hata yakalama
try {
	const data = await api.get('/sensors/list');
} catch (error) {
	if (error.response) {
		// Sunucu yanıt verdi ama hata kodu döndü
		console.error('Status:', error.response.status);
		console.error('Data:', error.response.data);

		switch (error.response.status) {
			case 400:
				// Bad Request
				break;
			case 401:
				// Unauthorized - Token geçersiz
				break;
			case 404:
				// Not Found
				break;
			case 409:
				// Conflict - Örn: Kullanıcı zaten var
				break;
			case 500:
				// Server Error
				break;
		}
	} else if (error.request) {
		// İstek gönderildi ama yanıt alınamadı
		console.error('Network error:', error.request);
	} else {
		// İstek hazırlanırken hata oluştu
		console.error('Error:', error.message);
	}
}
```

### Global Hata Handler

```javascript
// services/api.js içine ekleyin
api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Global hata yönetimi
		if (error.response?.status === 401) {
			// Token geçersiz, logout yap
			AsyncStorage.removeItem('authToken');
			// Navigate to login screen
			// NavigationService.navigate('Login');
		}

		// Hata mesajını kullanıcıya göster
		const errorMessage =
			error.response?.data?.error || error.message || 'Bir hata oluştu';

		// Toast veya Alert göster
		// Alert.alert('Hata', errorMessage);

		return Promise.reject(error);
	}
);
```

---

## Örnek Kodlar

### Tam Örnek: Sensör Yönetimi Ekranı

```javascript
// screens/SensorManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	FlatList,
	TouchableOpacity,
	Alert,
	TextInput,
} from 'react-native';
import api from '../services/api';

const SensorManagementScreen = () => {
	const [sensors, setSensors] = useState([]);
	const [loading, setLoading] = useState(true);
	const [editingSensor, setEditingSensor] = useState(null);
	const [formData, setFormData] = useState({});

	useEffect(() => {
		loadSensors();
	}, []);

	const loadSensors = async () => {
		try {
			setLoading(true);
			const data = await api.get('/sensors/list');
			setSensors(data.data || data);
		} catch (error) {
			Alert.alert('Hata', 'Sensörler yüklenemedi');
		} finally {
			setLoading(false);
		}
	};

	const handleUpdateSensor = async (sensorId) => {
		try {
			await api.put(`/sensors/${sensorId}`, formData);
			Alert.alert('Başarılı', 'Sensör güncellendi');
			setEditingSensor(null);
			setFormData({});
			loadSensors();
		} catch (error) {
			Alert.alert(
				'Hata',
				error.response?.data?.error || 'Sensör güncellenemedi'
			);
		}
	};

	const renderSensorItem = ({ item }) => (
		<View style={{ padding: 16, borderBottomWidth: 1 }}>
			{editingSensor === item.sensorID ? (
				<View>
					<TextInput
						placeholder="Sensör Adı"
						value={formData.sensorName || item.sensorName}
						onChangeText={(text) =>
							setFormData({ ...formData, sensorName: text })
						}
					/>
					<TextInput
						placeholder="Alt Limit"
						keyboardType="numeric"
						value={
							formData.sensorLowerLimit?.toString() ||
							item.sensorLowerLimit?.toString()
						}
						onChangeText={(text) =>
							setFormData({ ...formData, sensorLowerLimit: parseFloat(text) })
						}
					/>
					<TextInput
						placeholder="Üst Limit"
						keyboardType="numeric"
						value={
							formData.sensorUpperLimit?.toString() ||
							item.sensorUpperLimit?.toString()
						}
						onChangeText={(text) =>
							setFormData({ ...formData, sensorUpperLimit: parseFloat(text) })
						}
					/>
					<View style={{ flexDirection: 'row', marginTop: 10 }}>
						<TouchableOpacity
							onPress={() => handleUpdateSensor(item.sensorID)}
							style={{
								backgroundColor: 'green',
								padding: 10,
								marginRight: 10,
							}}>
							<Text style={{ color: 'white' }}>Kaydet</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => {
								setEditingSensor(null);
								setFormData({});
							}}
							style={{ backgroundColor: 'red', padding: 10 }}>
							<Text style={{ color: 'white' }}>İptal</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<View>
					<Text style={{ fontSize: 18, fontWeight: 'bold' }}>
						{item.sensorName}
					</Text>
					<Text>Alt Limit: {item.sensorLowerLimit}</Text>
					<Text>Üst Limit: {item.sensorUpperLimit}</Text>
					<TouchableOpacity
						onPress={() => {
							setEditingSensor(item.sensorID);
							setFormData({
								sensorName: item.sensorName,
								sensorLowerLimit: item.sensorLowerLimit,
								sensorUpperLimit: item.sensorUpperLimit,
							});
						}}
						style={{ backgroundColor: 'blue', padding: 10, marginTop: 10 }}>
						<Text style={{ color: 'white' }}>Düzenle</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);

	return (
		<View style={{ flex: 1 }}>
			<FlatList
				data={sensors}
				renderItem={renderSensorItem}
				keyExtractor={(item) => item.sensorID.toString()}
				refreshing={loading}
				onRefresh={loadSensors}
			/>
		</View>
	);
};

export default SensorManagementScreen;
```

### Örnek: Custom Hook

```javascript
// hooks/useSensors.js
import { useState, useEffect } from 'react';
import api from '../services/api';

export const useSensors = () => {
	const [sensors, setSensors] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchSensors();
	}, []);

	const fetchSensors = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await api.get('/sensors/list');
			setSensors(response.data || response);
		} catch (err) {
			setError(err.response?.data?.error || err.message);
		} finally {
			setLoading(false);
		}
	};

	const updateSensor = async (id, data) => {
		try {
			setError(null);
			const response = await api.put(`/sensors/${id}`, data);
			await fetchSensors(); // Listeyi yenile
			return response.data;
		} catch (err) {
			setError(err.response?.data?.error || err.message);
			throw err;
		}
	};

	return {
		sensors,
		loading,
		error,
		refetch: fetchSensors,
		updateSensor,
	};
};

// Kullanım:
// const { sensors, loading, error, updateSensor } = useSensors();
```

---

## Notlar

1. **Network Security**: Android için `android/app/src/main/AndroidManifest.xml` dosyasına `android:usesCleartextTraffic="true"` ekleyin (HTTP için).

2. **iOS Network**: iOS için `Info.plist` dosyasına App Transport Security ayarları ekleyin.

3. **Token Yönetimi**: Token'ları güvenli bir şekilde saklayın (`@react-native-async-storage/async-storage` veya `react-native-keychain`).

4. **Error Handling**: Tüm API çağrılarında try-catch kullanın ve kullanıcıya anlamlı hata mesajları gösterin.

5. **Loading States**: API çağrıları sırasında loading state'leri kullanın.

6. **Pagination**: Büyük listeler için pagination ekleyin (şu an API'de yok ama eklenebilir).

---

## Destek

Sorularınız için: [GitHub Issues](https://github.com/your-repo/issues)
