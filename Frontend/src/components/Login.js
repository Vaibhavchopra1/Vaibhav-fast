// File: src/components/Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:5000/login', { phone, password });
      localStorage.setItem('token', response.data.token);
      const tokenPayload = JSON.parse(atob(response.data.token.split('.')[1]));
      if (tokenPayload.role === 'user') {
        localStorage.setItem('userId', tokenPayload.id);
        history.push('/user-dashboard');
      } else if (tokenPayload.role === 'driver') {
        localStorage.setItem('driverId', tokenPayload.id);
        history.push('/driver-dashboard');
      }
    } catch (error) {
      alert('Error logging in: ' + error.message);
    }
  };

  return (
    <div className="login-form">
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Login;
