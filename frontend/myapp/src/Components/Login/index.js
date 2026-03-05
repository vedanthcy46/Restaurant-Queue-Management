import React, { useState } from 'react';
import Input from '../Input';
import Button from '../Button';
import './index.css';

const Login = ({ onSwitchToRegister }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [message, setMessage] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                setMessage('Login Successful');
            } else {
                setMessage(data.message);
            }
        } catch (err) {
            setMessage('Login failed');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login</h2>
                <form onSubmit={handleSubmit}>
                    <Input label="Email" type="email" id="email" value={formData.email} onChange={handleChange} />
                    <Input label="Password" type="password" id="password" value={formData.password} onChange={handleChange} />
                    <Button text="Login" type="submit" />
                </form>
                {message && <p className="message">{message}</p>}
                <p onClick={onSwitchToRegister} className="switch-link">Don't have an account? Register</p>
            </div>
        </div>
    );
};

export default Login;
