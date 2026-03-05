import React, { useState } from 'react';
import Input from '../Input';
import Button from '../Button';
import './index.css';

const Register = ({ onSwitchToLogin }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        password: ''
    });
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            setMessage(data.message);
        } catch (err) {
            setMessage('Registration failed');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Register</h2>
                <form onSubmit={handleSubmit}>
                    <Input label="Name" type="text" id="name" value={formData.name} onChange={handleChange} />
                    <Input label="Email" type="email" id="email" value={formData.email} onChange={handleChange} />
                    <Input label="Phone" type="tel" id="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
                    <Input label="Password" type="password" id="password" value={formData.password} onChange={handleChange} />
                    <Button text="Register" type="submit" />
                </form>
                {message && <p className="message">{message}</p>}
                <p onClick={onSwitchToLogin} className="switch-link">Already have an account? Login</p>
            </div>
        </div>
    );
};

export default Register;