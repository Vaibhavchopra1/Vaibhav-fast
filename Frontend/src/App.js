// File: src/App.js
import React from 'react';
import Registration from './components/Registration';
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import DriverDashboard from './components/DriverDashboard';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <h1>VaibhavFast Logistics</h1>
          <nav>
            <ul className="nav-links">
              <li><Link to="/register/user">User Registration</Link></li>
              <li><Link to="/register/driver">Driver Registration</Link></li>
              <li><Link to="/login">Login</Link></li>
            </ul>
          </nav>
        </header>
        <main className="app-main">
          <Switch>
            <Route path="/register/user">
              <Registration role="user" />
            </Route>
            <Route path="/register/driver">
              <Registration role="driver" />
            </Route>
            <Route path="/login">
              <Login />
            </Route>
            <Route path="/user-dashboard">
              <UserDashboard />
            </Route>
            <Route path="/driver-dashboard">
              <DriverDashboard />
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;
