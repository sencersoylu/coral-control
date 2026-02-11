const bcrypt = require('bcryptjs');

module.exports = (sequelize, Sequelize) => {
	const User = sequelize.define(
		'User',
		{
			id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			username: {
				type: Sequelize.STRING,
				unique: true,
				allowNull: false,
				validate: {
					notEmpty: true,
				},
			},
			password: {
				type: Sequelize.STRING,
				allowNull: false,
				validate: {
					notEmpty: true,
					len: [6, 255],
				},
			},
			name: {
				type: Sequelize.STRING,
				allowNull: false,
				validate: {
					notEmpty: true,
				},
			},
			role: {
				type: Sequelize.STRING,
				allowNull: false,
				defaultValue: 'user',
				validate: {
					notEmpty: true,
				},
			},
            lastLoginAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
		},
		{
			indexes: [
				{
					unique: true,
					fields: ['username'],
				},
			],
		}
	);

	User.prototype.toSafeJSON = function () {
		const { id, username, name, role, lastLoginAt, createdAt, updatedAt } = this.get();
		return { id, username, name, role, lastLoginAt, createdAt, updatedAt };
	};

	User.addHook('beforeCreate', async (user) => {
		if (user.password) {
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(user.password, salt);
		}
	});

	User.addHook('beforeUpdate', async (user) => {
		if (user.changed('password')) {
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(user.password, salt);
		}
	});

	User.prototype.comparePassword = async function (candidate) {
		return bcrypt.compare(candidate, this.password);
	};

	return User;
};
