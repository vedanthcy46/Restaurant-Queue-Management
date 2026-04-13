const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database'); // pg Pool

// REGISTER
const register = async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;

    try {
        const checkUser = await db.query(
            'SELECT * FROM "user" WHERE email = $1',
            [email]
        );

        if (checkUser.rows.length > 0) {
            return res.status(400).send({ message: "User Already Exists" });
        }

        if (!password || password.length < 8) {
            return res.status(400).send({ message: "Password must be at least 8 characters" });
        }

        const hashPassword = await bcrypt.hash(password, 10);
        const datetime = new Date().toISOString().split('T')[0];

        await db.query(
            `INSERT INTO "user" (name, email, phone_number, password, date_time)
             VALUES ($1, $2, $3, $4, $5)`,
            [name, email, phoneNumber, hashPassword, datetime]
        );

        res.send({ message: "User Registered Successfully" });

    } catch (err) {
        res.status(400).send({ message: err.message });
    }
};

// LOGIN
const login = async (req, res) => {
    const { email, password } = req.body;

    // ⚠️ Hardcoded admin (works but not recommended)
    if (email === 'admin@restaurant.com' && password === 'admin@123') {
        const token = jwt.sign(
            { userId: 0, email, role: 'admin', name: 'Admin' },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '24h' }
        );

        return res.send({
            message: 'Login Successful',
            token,
            user: { id: 0, name: 'Admin', email, role: 'admin' }
        });
    }

    try {
        const result = await db.query(
            'SELECT * FROM "user" WHERE email = $1',
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(400).send({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).send({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            {
                userId: user.user_id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '24h' }
        );

        res.send({
            message: 'Login Successful',
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        res.status(500).send({ message: 'Server error' });
    }
};

module.exports = { register, login };