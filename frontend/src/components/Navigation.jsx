import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { syncService } from '../services/sync';
import './Navigation.css';

function Navigation() {
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Start auto-sync if online
    if (isOnline) {
      syncService.startAutoSync(5); // Sync every 5 minutes
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncService.stopAutoSync();
    };
  }, [isOnline]);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navigation" role="navigation" aria-label="Main navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1 className="brand-logo">
            <span className="brand-icon">🏃</span>
            <span className="brand-text">TrailSync</span>
          </h1>
        </div>

        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            aria-current={isActive('/') ? 'page' : undefined}
          >
            <span className="nav-icon">📍</span>
            Track
          </Link>
          <Link
            to="/history"
            className={`nav-link ${isActive('/history') ? 'active' : ''}`}
            aria-current={isActive('/history') ? 'page' : undefined}
          >
            <span className="nav-icon">📊</span>
            History
          </Link>
          <Link
            to="/settings"
            className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
            aria-current={isActive('/settings') ? 'page' : undefined}
          >
            <span className="nav-icon">⚙️</span>
            Settings
          </Link>
        </div>

        <div className="nav-status">
          <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
