import React, { useState, useEffect } from 'react';
import './index.css';

const EMPTY_FORM = { name: '', email: '', phone_number: '', password: '' };

const AdminPanel = ({ user, onLogout }) => {
    const [activeTab, setActiveTab]     = useState('reports');
    const [notification, setNotification] = useState({ msg: '', type: '' });

    // Staff state
    const [staff, setStaff]         = useState([]);
    const [form, setForm]           = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [resetId, setResetId]     = useState(null);
    const [newPassword, setNewPassword] = useState('');

    // Reports state
    const [reports, setReports] = useState(null);

    // Settings state
    const [settings, setSettings] = useState({ avg_wait_time: '10', priority_queue: 'false' });

    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` };

    const notify = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification({ msg: '', type: '' }), 3500);
    };

    // ── Fetch helpers ──────────────────────────────────────────
    const fetchStaff = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/staff', { headers });
            const data = await res.json();
            setStaff(Array.isArray(data) ? data : []);
        } catch { /* silent */ }
    };

    const fetchReports = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/reports', { headers });
            setReports(await res.json());
        } catch { /* silent */ }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/admin/settings', { headers });
            setSettings(await res.json());
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchStaff();
        fetchReports();
        fetchSettings();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Staff handlers ─────────────────────────────────────────
    const handleChange = (e) => setForm({ ...form, [e.target.id]: e.target.value });

    const handleStaffSubmit = async (e) => {
        e.preventDefault();
        const url    = editingId ? `http://localhost:5000/api/admin/staff/${editingId}` : 'http://localhost:5000/api/admin/staff';
        const method = editingId ? 'PUT' : 'POST';
        const res    = await fetch(url, { method, headers, body: JSON.stringify(form) });
        const data   = await res.json();
        if (!res.ok) return notify(data.message, 'error');
        notify(data.message);
        setForm(EMPTY_FORM);
        setEditingId(null);
        fetchStaff();
        setActiveTab('list');
    };

    const handleEdit = (s) => {
        setEditingId(s.user_id);
        setForm({ name: s.name, email: s.email, phone_number: s.phone_number, password: '' });
        setActiveTab('add');
    };

    const handleDelete = async (user_id, name) => {
        if (!window.confirm(`Remove "${name}" from staff?`)) return;
        const res  = await fetch(`http://localhost:5000/api/admin/staff/${user_id}`, { method: 'DELETE', headers });
        const data = await res.json();
        notify(data.message);
        fetchStaff();
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const res  = await fetch(`http://localhost:5000/api/admin/staff/${resetId}/reset-password`, {
            method: 'POST', headers, body: JSON.stringify({ password: newPassword })
        });
        const data = await res.json();
        if (!res.ok) return notify(data.message, 'error');
        notify(data.message);
        setResetId(null);
        setNewPassword('');
    };

    // ── Settings handlers ──────────────────────────────────────
    const saveSetting = async (key, value) => {
        const res  = await fetch('http://localhost:5000/api/admin/settings', {
            method: 'POST', headers, body: JSON.stringify({ key, value })
        });
        const data = await res.json();
        notify(data.message);
        fetchSettings();
    };

    const handleResetQueue = async () => {
        if (!window.confirm('Reset all active queue entries? This cannot be undone.')) return;
        const res  = await fetch('http://localhost:5000/api/admin/reset-queue', { method: 'POST', headers });
        const data = await res.json();
        notify(data.message);
        fetchReports();
    };

    const TABS = [
        { id: 'reports', label: '📊 Reports'  },
        { id: 'settings', label: '⚙️ Settings' },
        { id: 'add',  label: editingId ? '✏️ Edit Staff' : '➕ Add Staff' },
        { id: 'list', label: `👥 Staff (${staff.length})` },
    ];

    return (
        <div className="ap-container">
            {/* Header */}
            <div className="ap-header">
                <div className="ap-brand">
                    <span>🍽️</span>
                    <div>
                        <div className="ap-title">Admin Panel</div>
                        <div className="ap-role">Administrator</div>
                    </div>
                </div>
                <div className="ap-user">
                    <span>👤 {user?.name}</span>
                    <button className="btn-logout" onClick={onLogout}>Logout</button>
                </div>
            </div>

            {/* Notification */}
            {notification.msg && (
                <div className={`ap-notification ${notification.type}`}>{notification.msg}</div>
            )}

            {/* Tabs */}
            <div className="ap-tabs">
                {TABS.map(t => (
                    <button key={t.id} className={activeTab === t.id ? 'tab active' : 'tab'} onClick={() => setActiveTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── REPORTS ── */}
            {activeTab === 'reports' && (
                <div className="ap-section">
                    <div className="section-header">
                        <h2>📊 Today's Report</h2>
                        <button className="btn-refresh" onClick={fetchReports}>↻ Refresh</button>
                    </div>

                    {reports ? (
                        <>
                            <div className="report-stats">
                                <div className="report-card green">
                                    <div className="rc-num">{reports.totalServed}</div>
                                    <div className="rc-label">Served Today</div>
                                </div>
                                <div className="report-card yellow">
                                    <div className="rc-num">{reports.totalWaiting}</div>
                                    <div className="rc-label">Currently Waiting</div>
                                </div>
                                <div className="report-card red">
                                    <div className="rc-num">{reports.totalSkipped}</div>
                                    <div className="rc-label">Skipped Today</div>
                                </div>
                                <div className="report-card blue">
                                    <div className="rc-num">{reports.avgWaitMins}m</div>
                                    <div className="rc-label">Avg Wait Time</div>
                                </div>
                            </div>

                            <h3 className="history-title">Queue History — {reports.today}</h3>
                            <div className="history-table">
                                <div className="ht-head">
                                    <span>Token</span><span>Name</span><span>Party</span><span>Status</span><span>Joined At</span>
                                </div>
                                {reports.history.length === 0 && <div className="ht-empty">No queue activity today</div>}
                                {reports.history.map((q, i) => (
                                    <div key={i} className="ht-row">
                                        <span className="ht-token">#{q.token_number}</span>
                                        <span>{q.customer_name}</span>
                                        <span>{q.party_size} pax</span>
                                        <span className={`ht-status ${q.status}`}>{q.status}</span>
                                        <span className="ht-time">{new Date(q.created_at).toLocaleTimeString()}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="ap-loading">Loading reports...</div>
                    )}
                </div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === 'settings' && (
                <div className="ap-section">
                    <h2>⚙️ System Settings</h2>

                    <div className="settings-grid">
                        {/* Avg wait time */}
                        <div className="setting-card">
                            <div className="setting-info">
                                <div className="setting-title">⏱ Average Wait Time</div>
                                <div className="setting-desc">Minutes per party used to estimate queue wait time</div>
                            </div>
                            <div className="setting-control">
                                <input
                                    type="number" min="1" max="60"
                                    value={settings.avg_wait_time || '10'}
                                    onChange={e => setSettings({ ...settings, avg_wait_time: e.target.value })}
                                />
                                <button className="btn-save" onClick={() => saveSetting('avg_wait_time', settings.avg_wait_time)}>Save</button>
                            </div>
                        </div>

                        {/* Priority queue toggle */}
                        <div className="setting-card">
                            <div className="setting-info">
                                <div className="setting-title">⭐ Priority Queue</div>
                                <div className="setting-desc">Allow priority customers to be served before normal queue</div>
                            </div>
                            <div className="setting-control">
                                <label className="toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings.priority_queue === 'true'}
                                        onChange={e => {
                                            const val = e.target.checked ? 'true' : 'false';
                                            setSettings({ ...settings, priority_queue: val });
                                            saveSetting('priority_queue', val);
                                        }}
                                    />
                                    <span className="toggle-slider" />
                                </label>
                                <span className="toggle-label">{settings.priority_queue === 'true' ? 'Enabled' : 'Disabled'}</span>
                            </div>
                        </div>

                        {/* Reset queue */}
                        <div className="setting-card danger">
                            <div className="setting-info">
                                <div className="setting-title">🧹 Reset Queue</div>
                                <div className="setting-desc">Clear all active waiting/called entries. Use at end of day.</div>
                            </div>
                            <div className="setting-control">
                                <button className="btn-danger" onClick={handleResetQueue}>Reset Queue</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ADD / EDIT STAFF ── */}
            {activeTab === 'add' && (
                <div className="ap-section">
                    <h2>{editingId ? '✏️ Edit Staff Member' : '➕ Add New Staff Member'}</h2>
                    <form className="ap-form" onSubmit={handleStaffSubmit}>
                        <div className="ap-form-grid">
                            <div className="form-group">
                                <label htmlFor="name">Full Name</label>
                                <input id="name" type="text" value={form.name} onChange={handleChange} placeholder="e.g. John Doe" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input id="email" type="email" value={form.email} onChange={handleChange} placeholder="staff@restaurant.com" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone_number">Phone Number</label>
                                <input id="phone_number" type="tel" value={form.phone_number} onChange={handleChange} placeholder="9876543210" required />
                            </div>
                            {!editingId && (
                                <div className="form-group">
                                    <label htmlFor="password">Password</label>
                                    <input id="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 8 characters" required />
                                </div>
                            )}
                        </div>
                        <div className="ap-form-actions">
                            <button type="submit" className="btn-primary">{editingId ? 'Update Staff' : 'Add Staff'}</button>
                            {editingId && (
                                <button type="button" className="btn-cancel" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* ── STAFF LIST ── */}
            {activeTab === 'list' && (
                <div className="ap-section">
                    <div className="section-header">
                        <h2>👥 Staff Members</h2>
                        <button className="btn-add-staff" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setActiveTab('add'); }}>
                            + Add Staff
                        </button>
                    </div>
                    {staff.length === 0 ? (
                        <div className="ap-empty">No staff yet. <span onClick={() => setActiveTab('add')} className="ap-link">Add one →</span></div>
                    ) : (
                        <div className="staff-table">
                            <div className="st-head">
                                <span>Name</span><span>Email</span><span>Phone</span><span>Joined</span><span>Actions</span>
                            </div>
                            {staff.map(s => (
                                <div key={s.user_id} className="st-row">
                                    <span className="st-name">{s.name}</span>
                                    <span>{s.email}</span>
                                    <span>{s.phone_number}</span>
                                    <span>{s.date_time}</span>
                                    <span className="st-actions">
                                        <button className="btn-edit"   onClick={() => handleEdit(s)}>Edit</button>
                                        <button className="btn-reset"  onClick={() => { setResetId(s.user_id); setNewPassword(''); }}>Reset PW</button>
                                        <button className="btn-delete" onClick={() => handleDelete(s.user_id, s.name)}>Remove</button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Reset Password Modal */}
            {resetId && (
                <div className="ap-modal-overlay" onClick={() => setResetId(null)}>
                    <div className="ap-modal" onClick={e => e.stopPropagation()}>
                        <h3>🔑 Reset Password</h3>
                        <form onSubmit={handleResetPassword}>
                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" required />
                            </div>
                            <div className="ap-form-actions">
                                <button type="submit" className="btn-primary">Reset</button>
                                <button type="button" className="btn-cancel" onClick={() => setResetId(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
