import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import TrackingPage from './components/TrackingPage';
import HistoryPage from './components/HistoryPage';
import SettingsPage from './components/SettingsPage';
import './styles/global.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<TrackingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
