const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const register = async (req, res) => {
    const { name, email, phoneNumber, password } = req.body;
    
    const checkUser = await db().get('SELECT * FROM user WHERE email = ?', [email]);
    
    if (checkUser) {
        return res.status(400).send({ message: "User Already Exists" });
    }
    
    if (password.length < 8) {
        return res.status(400).send({ message: "Password must be at least 8 characters" });
    }
    
    const hashPassword = await bcrypt.hash(password, 10);
    const datetime = new Date().toISOString().split('T')[0];
    
    try {
        await db().run(
            'INSERT INTO user (name, email, phone_number, password, date_time) VALUES (?, ?, ?, ?, ?)',
            [name, email, phoneNumber, hashPassword, datetime]
        );
        res.send({ message: "User Registered Successfully" });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    // Check hardcoded admin first
    if (email === 'admin@restaurant.com' && password === 'admin@123') {
        const token = jwt.sign({ userId: 0, email, role: 'admin', name: 'Admin' }, 'secret_key', { expiresIn: '24h' });
        return res.send({ message: 'Login Successful', token, user: { id: 0, name: 'Admin', email, role: 'admin' } });
    }

    const user = await db().get('SELECT * FROM user WHERE email = ?', [email]);
    if (!user) return res.status(400).send({ message: 'Invalid credentials' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).send({ message: 'Invalid credentials' });

    const token = jwt.sign(
        { userId: user.user_id, email: user.email, role: user.role, name: user.name },
        'secret_key',
        { expiresIn: '24h' }
    );

    res.send({ message: 'Login Successful', token, user: { id: user.user_id, name: user.name, email: user.email, role: user.role } });
};

module.exports = { register, login };
