import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './index.css';

const QUEUE_URL = 'http://localhost:3000'; // customers scan this to open the app

const LandingPage = ({ onLoginClick, onJoinQueueClick, onDisplayClick }) => {
    return (
        <div className="landing-container">
            <div className="landing-content">

                <div className="hero-section">
                    <div className="logo">🍽️</div>
                    <h1>Smart Restaurant Queue</h1>
                    <p className="tagline">Skip the wait. Enjoy your meal.</p>
                </div>

                <div className="features">
                    <div className="feature-card">
                        <span>🎫</span>
                        <h3>Digital Token</h3>
                        <p>Get your queue number instantly</p>
                    </div>
                    <div className="feature-card">
                        <span>⏱️</span>
                        <h3>Real-Time Updates</h3>
                        <p>Track your position live</p>
                    </div>
                    <div className="feature-card">
                        <span>🔔</span>
                        <h3>Notifications</h3>
                        <p>Know when your table is ready</p>
                    </div>
                </div>

                <div className="cta-section">
                    <button className="btn-join" onClick={onJoinQueueClick}>Join Queue</button>
                    <button className="btn-display" onClick={onDisplayClick}>Queue Display</button>
                </div>

                <div className="qr-section">
                    <p className="qr-label">📱 Scan to join queue from your phone</p>
                    <div className="qr-box">
                        <QRCodeSVG value={QUEUE_URL} size={120} bgColor="#ffffff" fgColor="#1a1a2e" />
                    </div>
                </div>

                <div className="staff-section">
                    <p>Staff / Admin?</p>
                    <div className="staff-buttons">
                        <button className="btn-outline" onClick={onLoginClick}>Login</button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LandingPage;
