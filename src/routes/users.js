const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticateJWT, authorizeRoles } = require('../helpers');

// List users (admin)
router.get('/users', async (req, res) => {
	try {
		const users = await db.users.findAll({ order: [['id', 'ASC']] });
		return res.json({ users: users.map((u) => u.toSafeJSON()) });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
});

// Create user (admin)
router.post('/users', async (req, res) => {
	try {
		const { username, password, name, role } = req.body || {};
		if (!username || !password || !name) {
			return res
				.status(400)
				.json({ error: 'username, password, name gerekli' });
		}
		const exists = await db.users.findOne({ where: { username } });
		if (exists) return res.status(409).json({ error: 'Kullanıcı zaten var' });
		const user = await db.users.create({
			username,
			password,
			name,
			role: role || 'user',
		});
		return res.status(201).json({ user: user.toSafeJSON() });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
});

// Update user (admin)
router.put('/users/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const { username, password, name, role } = req.body || {};

		const user = await db.users.findByPk(id);
		if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

		// Check if username is being updated and if it already exists
		if (username && username !== user.username) {
			const exists = await db.users.findOne({ where: { username } });
			if (exists)
				return res
					.status(409)
					.json({ error: 'Kullanıcı adı zaten kullanılıyor' });
			user.username = username;
		}

		// Update fields if provided
		if (password) user.password = password;
		if (name) user.name = name;
		if (role) user.role = role;

		await user.save();
		return res.json({ user: user.toSafeJSON() });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
});

// Delete user (admin)
router.delete('/users/:id', async (req, res) => {
	try {
		const { id } = req.params;
		const user = await db.users.findByPk(id);
		if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
		await user.destroy();
		return res.json({ success: true });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
});

module.exports = router;
