import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const CustomerQueue = ({ onBack }) => {
    const [form, setForm] = useState({ customer_name: '', phone_number: '', party_size: 1 });
    const [ticket, setTicket] = useState(null);
    const [status, setStatus] = useState(null); // live status from polling
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const pollRef = useRef(null);

    // Poll queue status every 10s after joining
    useEffect(() => {
        if (!ticket) return;
        const poll = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/queue/status/${ticket.token}`);
                if (res.ok) setStatus(await res.json());
            } catch { /* silent */ }
        };
        poll();
        pollRef.current = setInterval(poll, 10000);
        return () => clearInterval(pollRef.current);
    }, [ticket]);

    const handleChange = (e) => setForm({ ...form, [e.target.id]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/queue/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) return setError(data.message);
            setTicket(data);
        } catch {
            setError('Failed to join queue. Is the server running?');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = () => {
        const s = status?.status || 'waiting';
        const map = {
            waiting:  { label: '⏳ Waiting',     color: '#f59e0b', bg: '#fef3c7' },
            called:   { label: '📢 Your Turn!',  color: '#059669', bg: '#d1fae5' },
            served:   { label: '✅ Served',       color: '#6b7280', bg: '#f3f4f6' },
            skipped:  { label: '⏭ Skipped',      color: '#ef4444', bg: '#fee2e2' },
        };
        return map[s] || map.waiting;
    };

    if (ticket) {
        const badge = getStatusBadge();
        const isCalled = status?.status === 'called';

        return (
            <div className="cq-container">
                <div className={`ticket-card ${isCalled ? 'ticket-pulse' : ''}`}>
                    <div className="ticket-restaurant">🍽️ Smart Queue</div>
                    <div className="ticket-divider" />

                    <div className="ticket-label">YOUR TOKEN</div>
                    <div className="token-number">#{ticket.token}</div>

                    <div className="ticket-divider" />

                    <div className="ticket-status-badge" style={{ color: badge.color, background: badge.bg }}>
                        {badge.label}
                    </div>

                    {isCalled && (
                        <div className="ticket-alert">🔔 Please proceed to your table!</div>
                    )}

                    <div className="ticket-info">
                        <div className="ticket-info-row">
                            <span>Queue Position</span>
                            <strong>#{status?.position ?? ticket.position}</strong>
                        </div>
                        <div className="ticket-info-row">
                            <span>Est. Wait</span>
                            <strong>{status?.estimated_wait ?? ticket.estimated_wait} mins</strong>
                        </div>
                        <div className="ticket-info-row">
                            <span>Party Size</span>
                            <strong>{form.party_size} people</strong>
                        </div>
                    </div>

                    <p className="ticket-note">This page updates every 10 seconds</p>
                    <button className="btn-back" onClick={onBack}>← Back to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="cq-container">
            <div className="cq-card">
                <button className="back-link" onClick={onBack}>← Back</button>
                <div className="cq-icon">🍽️</div>
                <h2>Join the Queue</h2>
                <p className="cq-sub">Enter your details to get a token number</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="customer_name">Your Name</label>
                        <input id="customer_name" type="text" value={form.customer_name} onChange={handleChange} placeholder="e.g. John Doe" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone_number">Phone Number</label>
                        <input id="phone_number" type="tel" value={form.phone_number} onChange={handleChange} placeholder="e.g. 9876543210" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="party_size">Number of People</label>
                        <select id="party_size" value={form.party_size} onChange={handleChange}>
                            {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>)}
                        </select>
                    </div>
                    {error && <p className="error-msg">⚠️ {error}</p>}
                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? 'Joining...' : '🎫 Get My Token'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CustomerQueue;
