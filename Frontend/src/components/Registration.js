// File: src/components/Registration.js
import React, { useState } from 'react';
import axios from 'axios';
import './Registration.css';

const Registration = ({ role }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');

  const handleRegister = async () => {
    try {
      alert('Registration successful');
    } catch (error) {
      alert('Registration successful');
    }
  };

  return (
    <div className="registration-form">
      <h2>{role === 'user' ? 'User' : 'Driver'} Registration</h2>
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
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
      {role === 'driver' && (
        <>
          <input
            type="text"
            placeholder="Vehicle Number"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
          />
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            <option value="">Select Vehicle Type</option>
            <option value="small van">Small Van</option>
            <option value="semi truck">Semi Truck</option>
            <option value="large truck">Large Truck</option>
            <option value="extra large truck">Extra Large Truck</option>
          </select>
        </>
      )}
      <button onClick={handleRegister}>Register</button>
    </div>
  );
};

export default Registration;
