const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database'); // better-sqlite3 instance

const register = (req, res) => {
    const { name, email, phoneNumber, password } = req.body;

    const checkUser = db.prepare(
        'SELECT * FROM user WHERE email = ?'
    ).get(email);

    if (checkUser) {
        return res.status(400).send({ message: "User Already Exists" });
    }

    if (!password || password.length < 8) {
        return res.status(400).send({ message: "Password must be at least 8 characters" });
    }

    const hashPassword = bcrypt.hashSync(password, 10);
    const datetime = new Date().toISOString().split('T')[0];

    try {
        db.prepare(
            'INSERT INTO user (name, email, phone_number, password, date_time) VALUES (?, ?, ?, ?, ?)'
        ).run(name, email, phoneNumber, hashPassword, datetime);

        res.send({ message: "User Registered Successfully" });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
};

const login = (req, res) => {
    const { email, password } = req.body;

    // Hardcoded admin
    if (email === 'admin@restaurant.com' && password === 'admin@123') {
        const token = jwt.sign(
            { userId: 0, email, role: 'admin', name: 'Admin' },
            'secret_key',
            { expiresIn: '24h' }
        );

        return res.send({
            message: 'Login Successful',
            token,
            user: { id: 0, name: 'Admin', email, role: 'admin' }
        });
    }

    const user = db.prepare(
        'SELECT * FROM user WHERE email = ?'
    ).get(email);

    if (!user) {
        return res.status(400).send({ message: 'Invalid credentials' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);

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
        'secret_key',
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
};

module.exports = { register, login };
