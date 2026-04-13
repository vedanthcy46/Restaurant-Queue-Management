import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './index.css';

const socket = io('http://localhost:5000');
const STATUS_COLOR = { waiting: '#f59e0b', called: '#3b82f6', served: '#10b981', skipped: '#ef4444' };

// 🔔 Play a beep sound when token is called
const playBeep = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.8);
    } catch { /* browser may block without user interaction */ }
};

const StaffPanel = ({ user, onLogout }) => {
    const [queue, setQueue]               = useState([]);
    const [notification, setNotification] = useState({ msg: '', type: '' });
    const [loadingAction, setLoadingAction] = useState(''); // tracks which button is loading
    const headersRef = useRef({ 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` });

    const notify = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification({ msg: '', type: '' }), 3500);
    };

    const fetchQueue = async () => {
        try {
            const res  = await fetch('http://localhost:5000/api/staff/queue', { headers: headersRef.current });
            const data = await res.json();
            setQueue(Array.isArray(data) ? data : []);
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchQueue();
        socket.on('queue_updated', fetchQueue);
        socket.on('token_called', ({ token, name }) => {
            notify(`📢 Token #${token} — ${name} called!`);
            playBeep();
        });
        return () => {
            socket.off('queue_updated', fetchQueue);
            socket.off('token_called');
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const apiPost = async (url, actionKey) => {
        setLoadingAction(actionKey);
        try {
            const res  = await fetch(url, { method: 'POST', headers: headersRef.current });
            const data = await res.json();
            res.ok ? notify(data.message) : notify(data.message, 'error');
        } catch {
            notify('Network error', 'error');
        } finally {
            setLoadingAction('');
        }
    };

    const callNext = () => {
        if (called) return notify(`Serve or skip Token #${called.token_number} first`, 'error');
        if (waiting.length === 0) return notify('No customers in queue', 'info');
        apiPost('http://localhost:5000/api/staff/call-next', 'callNext');
    };

    const tableFree = async () => {
        setLoadingAction('tableFree');
        try {
            // Serve current called token if any
            if (called) {
                await fetch(`http://localhost:5000/api/staff/serve/${called.queue_id}`, {
                    method: 'POST', headers: headersRef.current
                });
            }
            // Call next
            if (waiting.length === 0) {
                notify('Table freed. No more customers waiting.', 'info');
                return;
            }
            const res  = await fetch('http://localhost:5000/api/staff/call-next', { method: 'POST', headers: headersRef.current });
            const data = await res.json();
            res.ok ? notify(`🍽️ ${data.message}`) : notify(data.message, 'error');
        } catch {
            notify('Network error', 'error');
        } finally {
            setLoadingAction('');
        }
    };

    const skipToken = (queue_id, token_number) => {
        apiPost(`http://localhost:5000/api/staff/skip/${queue_id}`, `skip_${queue_id}`);
    };

    const serveToken = (queue_id) => {
        apiPost(`http://localhost:5000/api/staff/serve/${queue_id}`, `serve_${queue_id}`);
    };

    const waiting = queue.filter(q => q.status === 'waiting');
    const called  = queue.find(q => q.status === 'called');
    const servedCount = queue.filter(q => q.status === 'served').length;

    const isQueueEmpty = waiting.length === 0 && !called;

    return (
        <div className="sp-container">
            {/* Header */}
            <div className="sp-header">
                <h1>🍽️ Staff Panel</h1>
                <div className="sp-user">
                    <span>👤 {user?.name}</span>
                    <button className="btn-logout" onClick={onLogout}>Logout</button>
                </div>
            </div>

            {/* Notification */}
            {notification.msg && (
                <div className={`sp-notification ${notification.type}`}>{notification.msg}</div>
            )}

            {/* Action Bar */}
            <div className="sp-action-bar">
                <div className="sp-stats">
                    <div className="stat-box">
                        <span className="stat-num">{waiting.length}</span>
                        <span className="stat-label">Waiting</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-num">{called ? `#${called.token_number}` : '—'}</span>
                        <span className="stat-label">Now Serving</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-num">{servedCount}</span>
                        <span className="stat-label">Served Today</span>
                    </div>
                </div>

                <div className="sp-main-actions">
                    {/* Table Free — disabled if queue is empty and nothing called */}
                    <button
                        className="btn-table-free"
                        onClick={tableFree}
                        disabled={isQueueEmpty || loadingAction === 'tableFree'}
                        title={isQueueEmpty ? 'No customers in queue' : ''}
                    >
                        {loadingAction === 'tableFree' ? '...' : '🍽️ Table Free → Call Next'}
                    </button>

                    {/* Call Next — disabled if already called or queue empty */}
                    <button
                        className="btn-call-next"
                        onClick={callNext}
                        disabled={!!called || waiting.length === 0 || loadingAction === 'callNext'}
                        title={called ? `Serve #${called.token_number} first` : waiting.length === 0 ? 'Queue is empty' : ''}
                    >
                        {loadingAction === 'callNext' ? '...' : '📢 Call Next'}
                    </button>
                </div>
            </div>

            <div className="sp-body">
                {/* Currently Called */}
                {called && (
                    <div className="sp-section">
                        <div className="section-title">Now Serving</div>
                        <div className="qt-row qt-called">
                            <span className="qt-token">#{called.token_number}</span>
                            <span className="qt-name">{called.customer_name}</span>
                            <span className="qt-party">{called.party_size} pax</span>
                            <span className="qt-status" style={{ color: STATUS_COLOR.called }}>Called</span>
                            <span className="qt-btns">
                                <button
                                    className="btn-serve"
                                    onClick={() => serveToken(called.queue_id)}
                                    disabled={!!loadingAction}
                                >
                                    {loadingAction === `serve_${called.queue_id}` ? '...' : '✅ Serve'}
                                </button>
                                <button
                                    className="btn-skip"
                                    onClick={() => skipToken(called.queue_id, called.token_number)}
                                    disabled={!!loadingAction}
                                >
                                    {loadingAction === `skip_${called.queue_id}` ? '...' : '⏭ Skip'}
                                </button>
                            </span>
                        </div>
                    </div>
                )}

                {/* Waiting Queue */}
                <div className="sp-section">
                    <div className="section-title">Waiting Queue ({waiting.length})</div>
                    <div className="queue-table">
                        <div className="qt-head">
                            <span>Token</span><span>Name</span><span>Party</span><span>Status</span><span>Actions</span>
                        </div>
                        {waiting.length === 0 ? (
                            <div className="qt-empty">
                                <span>🎉</span>
                                <p>No customers in queue</p>
                            </div>
                        ) : (
                            waiting.map((q, i) => (
                                <div key={q.queue_id} className="qt-row">
                                    <span className="qt-token">
                                        #{q.token_number}
                                        {q.priority > 0 && <span className="priority-badge">⭐</span>}
                                    </span>
                                    <span className="qt-name">{q.customer_name}</span>
                                    <span className="qt-party">{q.party_size} pax</span>
                                    <span className="qt-status" style={{ color: STATUS_COLOR.waiting }}>
                                        #{i + 1} in line
                                    </span>
                                    <span className="qt-btns">
                                        <button
                                            className="btn-skip"
                                            onClick={() => skipToken(q.queue_id, q.token_number)}
                                            disabled={!!loadingAction}
                                        >
                                            ⏭ Skip
                                        </button>
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffPanel;
