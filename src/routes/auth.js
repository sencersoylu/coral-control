const express = require('express');
const router = express.Router();
const db = require('../models');
const { generateUserToken, authenticateJWT } = require('../helpers');

// POST /auth/register
router.post('/auth/register', async (req, res) => {
	try {
		const { username, password, name, role } = req.body || {};
		if (!username || !password || !name) {
			return res
				.status(400)
				.json({ error: 'username, password, name are required' });
		}
		const exists = await db.users.findOne({ where: { username } });
		if (exists) return res.status(409).json({ error: 'User already exists' });
		const user = await db.users.create({
			username,
			password,
			name,
			role: role || 'user',
		});
		const token = generateUserToken(user);
		return res.status(201).json({ user: user.toSafeJSON(), token });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
});

// POST /auth/login
router.post('/auth/login', async (req, res) => {
	try {
		const { username, password } = req.body || {};
		if (!username || !password) {
			return res
				.status(400)
				.json({ error: 'username and password are required' });
		}
		const user = await db.users.findOne({ where: { username } });
		if (!user)
			return res.status(401).json({ error: 'Invalid username or password' });
		const ok = await user.comparePassword(password);
		if (!ok)
			return res.status(401).json({ error: 'Invalid username or password' });
		// Update last login timestamp on successful login
		await user.update({ lastLoginAt: new Date() });

		// Set logged in user for session recording
		if (global.setLoggedInUser) {
			global.setLoggedInUser(user.id);
		}

		const token = generateUserToken(user);
		console.log('user', user.toSafeJSON());
		return res.json({ user: user.toSafeJSON(), token });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
});

// GET /auth/me
router.get('/auth/me', authenticateJWT, async (req, res) => {
	try {
		const me = await db.users.findByPk(req.user.id);
		if (!me) return res.status(404).json({ error: 'User not found' });
		return res.json({ user: me.toSafeJSON() });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
});

module.exports = router;
