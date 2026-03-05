import React, { useState } from 'react';
import './App.css';
import Register from './Components/Register';
import Login from './Components/Login';

function App() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="App">
      {showLogin ? 
        <Login onSwitchToRegister={() => setShowLogin(false)} /> : 
        <Register onSwitchToLogin={() => setShowLogin(true)} />
      }
    </div>
  );
}

export default App;
