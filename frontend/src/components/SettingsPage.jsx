import React, { useState, useEffect } from 'react';
import { SettingsDB, SyncQueueDB } from '../db/database';
import { syncService } from '../services/sync';
import './SettingsPage.css';

function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedApiKey = await SettingsDB.get('apiKey', '');
    const savedAutoSync = await SettingsDB.get('autoSync', true);
    const savedLastSync = await SettingsDB.get('lastSync');

    setApiKey(savedApiKey);
    setAutoSync(savedAutoSync);
    setLastSync(savedLastSync);

    // Set API key in localStorage for API service
    if (savedApiKey) {
      localStorage.setItem('apiKey', savedApiKey);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      showMessage('API key cannot be empty', 'error');
      return;
    }

    await SettingsDB.set('apiKey', apiKey);
    localStorage.setItem('apiKey', apiKey);
    showMessage('API key saved successfully', 'success');
  };

  const handleAutoSyncToggle = async (e) => {
    const enabled = e.target.checked;
    setAutoSync(enabled);
    await SettingsDB.set('autoSync', enabled);

    if (enabled) {
      syncService.startAutoSync(5);
      showMessage('Auto-sync enabled', 'success');
    } else {
      syncService.stopAutoSync();
      showMessage('Auto-sync disabled', 'success');
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const result = await syncService.sync();

    if (result.success) {
      const newLastSync = await SettingsDB.get('lastSync');
      setLastSync(newLastSync);
      showMessage('Sync completed successfully', 'success');
    } else {
      showMessage(`Sync failed: ${result.message}`, 'error');
    }

    setSyncing(false);
  };

  const handleForceSync = async () => {
    if (!window.confirm('This will replace all local data with server data. Continue?')) {
      return;
    }

    setSyncing(true);
    try {
      await syncService.forceSync();
      const newLastSync = await SettingsDB.get('lastSync');
      setLastSync(newLastSync);
      showMessage('Force sync completed successfully', 'success');
    } catch (error) {
      showMessage(`Force sync failed: ${error.message}`, 'error');
    }
    setSyncing(false);
  };

  const handleClearCache = async () => {
    if (!window.confirm('This will clear all offline data. Are you sure?')) {
      return;
    }

    try {
      await SyncQueueDB.clear();
      showMessage('Cache cleared successfully', 'success');
    } catch (error) {
      showMessage('Failed to clear cache', 'error');
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const formatLastSync = () => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    return date.toLocaleString();
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p className="settings-subtitle">Configure TrailSync for optimal performance</p>
      </div>

      {message.text && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-sections">
        {/* API Configuration */}
        <section className="settings-section">
          <div className="section-header">
            <h2>🔑 API Configuration</h2>
            <p>Connect to your TrailSync backend server</p>
          </div>

          <div className="form-group">
            <label htmlFor="api-key">API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              aria-label="API Key"
            />
            <p className="form-help">
              Get your API key from the backend .env file
            </p>
          </div>

          <button className="btn btn-primary" onClick={handleSaveApiKey}>
            Save API Key
          </button>
        </section>

        {/* Sync Settings */}
        <section className="settings-section">
          <div className="section-header">
            <h2>🔄 Synchronization</h2>
            <p>Manage how your data syncs with the server</p>
          </div>

          <div className="settings-row">
            <div className="settings-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={handleAutoSyncToggle}
                  aria-label="Auto-sync toggle"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">Auto-sync (every 5 minutes)</span>
              </label>
            </div>
          </div>

          <div className="sync-info">
            <div className="info-item">
              <span className="info-label">Last Sync:</span>
              <span className="info-value text-mono">{formatLastSync()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className={`info-value ${navigator.onLine ? 'online' : 'offline'}`}>
                {navigator.onLine ? '✓ Online' : '✗ Offline'}
              </span>
            </div>
          </div>

          <div className="sync-actions">
            <button
              className="btn btn-secondary"
              onClick={handleManualSync}
              disabled={syncing || !navigator.onLine}
            >
              {syncing ? (
                <>
                  <span className="spinner"></span> Syncing...
                </>
              ) : (
                'Manual Sync'
              )}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleForceSync}
              disabled={syncing || !navigator.onLine}
            >
              Force Full Sync
            </button>
          </div>
        </section>

        {/* Data Management */}
        <section className="settings-section">
          <div className="section-header">
            <h2>💾 Data Management</h2>
            <p>Manage your offline data and cache</p>
          </div>

          <button className="btn btn-danger" onClick={handleClearCache}>
            Clear Sync Queue
          </button>

          <p className="form-help">
            Clears pending sync operations. Use if you're experiencing sync issues.
          </p>
        </section>

        {/* About */}
        <section className="settings-section">
          <div className="section-header">
            <h2>ℹ️ About TrailSync</h2>
          </div>

          <div className="about-info">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Features:</strong></p>
            <ul>
              <li>GPS tracking for walks, runs, and rides</li>
              <li>Offline-first with automatic sync</li>
              <li>Live route maps and performance stats</li>
              <li>Activity history and filtering</li>
              <li>GPX export support</li>
            </ul>

            <p className="mt-lg">
              <strong>Future Features:</strong> Multi-user support with JWT authentication
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;
