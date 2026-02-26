const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const UPDATES_DIR = path.join(__dirname, '..', '..', 'updates');
const LATEST_JSON = path.join(UPDATES_DIR, 'latest.json');

// Multer: save uploaded APK to updates/ directory
const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, UPDATES_DIR),
	filename: (_req, file, cb) => {
		// Always save as hiperflow-latest.apk (overwrite previous)
		cb(null, 'hiperflow-latest.apk');
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
	fileFilter: (_req, file, cb) => {
		if (
			file.mimetype === 'application/vnd.android.package-archive' ||
			file.originalname.endsWith('.apk')
		) {
			cb(null, true);
		} else {
			cb(new Error('Only .apk files are allowed'));
		}
	},
});

/**
 * Helper: read latest.json safely
 */
function readLatest() {
	try {
		return JSON.parse(fs.readFileSync(LATEST_JSON, 'utf-8'));
	} catch {
		return {
			version: '0.0.0',
			versionCode: 0,
			filename: null,
			releaseNotes: '',
			forceUpdate: false,
			uploadedAt: null,
		};
	}
}

/**
 * Helper: write latest.json
 */
function writeLatest(data) {
	fs.writeFileSync(LATEST_JSON, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── GET /api/update/check ──────────────────────────────────────────────────
// Mobile app calls this on startup and when socket push arrives.
// Returns latest version info. Mobile compares versionCode to decide if update needed.
router.get('/api/update/check', (_req, res) => {
	try {
		const latest = readLatest();

		if (!latest.filename) {
			return res.json({
				version: latest.version,
				versionCode: latest.versionCode,
				apkUrl: null,
				releaseNotes: latest.releaseNotes,
				forceUpdate: latest.forceUpdate,
			});
		}

		res.json({
			version: latest.version,
			versionCode: latest.versionCode,
			apkUrl: '/api/update/download',
			releaseNotes: latest.releaseNotes,
			forceUpdate: latest.forceUpdate,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// ─── GET /api/update/download ───────────────────────────────────────────────
// Serves the APK file for download.
router.get('/api/update/download', (_req, res) => {
	try {
		const latest = readLatest();
		const apkPath = path.join(UPDATES_DIR, latest.filename || 'hiperflow-latest.apk');

		if (!fs.existsSync(apkPath)) {
			return res.status(404).json({ error: 'APK file not found' });
		}

		res.download(apkPath, `hiperflow-v${latest.version}.apk`);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// ─── POST /api/update/upload ────────────────────────────────────────────────
// Upload a new APK and notify all connected tablets.
//
// Usage:
//   curl -F "apk=@app-release.apk" \
//        -F "version=1.1.0" \
//        -F "versionCode=2" \
//        -F "releaseNotes=Bug fixes" \
//        -F "forceUpdate=false" \
//        http://192.168.1.15:4001/api/update/upload
router.post('/api/update/upload', upload.single('apk'), (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No APK file uploaded' });
		}

		const version = req.body.version;
		const versionCode = parseInt(req.body.versionCode, 10);

		if (!version || isNaN(versionCode)) {
			// Clean up uploaded file on validation error
			fs.unlinkSync(req.file.path);
			return res
				.status(400)
				.json({ error: 'version and versionCode are required' });
		}

		const latest = {
			version,
			versionCode,
			filename: req.file.filename,
			releaseNotes: req.body.releaseNotes || '',
			forceUpdate: req.body.forceUpdate === 'true',
			uploadedAt: new Date().toISOString(),
		};

		writeLatest(latest);

		// Push notification to all connected tablets via Socket.io
		if (global.socket && global.socket.connected) {
			global.socket.emit('appUpdate', { versionCode });
		}

		console.log(`[Update] New APK uploaded: v${version} (code ${versionCode})`);

		res.json({
			success: true,
			message: `v${version} uploaded successfully`,
			latest,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;
