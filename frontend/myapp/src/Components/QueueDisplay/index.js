import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './index.css';

const socket = io('http://localhost:5000');

const QueueDisplay = ({ onBack }) => {
    const [queue, setQueue] = useState([]);
    const [time, setTime] = useState(new Date());

    const fetchQueue = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/queue');
            const data = await res.json();
            setQueue(Array.isArray(data) ? data : []);
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchQueue();
        socket.on('queue_updated', fetchQueue);
        // Clock tick
        const clock = setInterval(() => setTime(new Date()), 1000);
        return () => {
            socket.off('queue_updated', fetchQueue);
            clearInterval(clock);
        };
    }, []);

    const called  = queue.find(q => q.status === 'called');
    const nextUp  = queue.filter(q => q.status === 'waiting').slice(0, 3);
    const waiting = queue.filter(q => q.status === 'waiting').length;

    return (
        <div className="qd-container">
            {/* Header */}
            <div className="qd-header">
                <div className="qd-brand">🍽️ Smart Restaurant Queue</div>
                <div className="qd-meta">
                    <span className="qd-live">● LIVE</span>
                    <span className="qd-time">{time.toLocaleTimeString()}</span>
                    <button className="qd-back" onClick={onBack}>← Back</button>
                </div>
            </div>

            <div className="qd-body">
                {/* Now Serving — big focus */}
                <div className="qd-now-section">
                    <div className="qd-now-label">NOW SERVING</div>
                    {called ? (
                        <>
                            <div className="qd-now-token">#{called.token_number}</div>
                            <div className="qd-now-name">{called.customer_name}</div>
                            <div className="qd-now-party">{called.party_size} {called.party_size === 1 ? 'person' : 'people'}</div>
                        </>
                    ) : (
                        <>
                            <div className="qd-now-token qd-idle">—</div>
                            <div className="qd-now-name">Waiting for staff to call</div>
                        </>
                    )}
                </div>

                {/* Next Up */}
                <div className="qd-next-section">
                    <div className="qd-next-label">UP NEXT</div>
                    {nextUp.length === 0 ? (
                        <div className="qd-next-empty">No more customers waiting</div>
                    ) : (
                        <div className="qd-next-list">
                            {nextUp.map((q, i) => (
                                <div key={q.queue_id} className="qd-next-card">
                                    <div className="qd-next-pos">{i + 1}</div>
                                    <div className="qd-next-token">#{q.token_number}</div>
                                    <div className="qd-next-name">{q.customer_name}</div>
                                    <div className="qd-next-party">{q.party_size} pax</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="qd-footer">
                <span>Total Waiting: <strong>{waiting}</strong></span>
                <span>Please have your token ready when called</span>
            </div>
        </div>
    );
};

export default QueueDisplay;
