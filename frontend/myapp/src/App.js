import React, { useState } from 'react';
import './App.css';
import LandingPage from './Components/LandingPage';
import Login from './Components/Login';
import CustomerQueue from './Components/CustomerQueue';
import StaffPanel from './Components/StaffPanel';
import AdminPanel from './Components/AdminPanel';
import QueueDisplay from './Components/QueueDisplay';

function App() {
    const [currentView, setCurrentView] = useState('landing');
    const [authUser, setAuthUser] = useState(null);

    const handleLoginSuccess = (user, token) => {
        setAuthUser({ ...user, token });
        setCurrentView(user.role === 'admin' ? 'admin' : 'staff');
    };

    const handleLogout = () => {
        setAuthUser(null);
        setCurrentView('landing');
    };

    const renderView = () => {
        switch (currentView) {
            case 'login':
                return <Login onLoginSuccess={handleLoginSuccess} onBack={() => setCurrentView('landing')} />;
            case 'customer':
                return <CustomerQueue onBack={() => setCurrentView('landing')} />;
            case 'staff':
                return <StaffPanel user={authUser} onLogout={handleLogout} />;
            case 'admin':
                return <AdminPanel user={authUser} onLogout={handleLogout} />;
            case 'display':
                return <QueueDisplay onBack={() => setCurrentView('landing')} />;
            default:
                return (
                    <LandingPage
                        onLoginClick={() => setCurrentView('login')}
                        onJoinQueueClick={() => setCurrentView('customer')}
                        onDisplayClick={() => setCurrentView('display')}
                    />
                );
        }
    };

    return <div className="App">{renderView()}</div>;
}

export default App;
