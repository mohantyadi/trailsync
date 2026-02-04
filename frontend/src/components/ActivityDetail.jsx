import React from 'react';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import { format } from 'date-fns';
import apiService from '../services/api';
import 'leaflet/dist/leaflet.css';
import './ActivityDetail.css';

function ActivityDetail({ activity, onClose, onDelete }) {
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatDistance = (meters) => {
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatPace = (pace) => {
    if (!pace || pace === Infinity) return 'N/A';
    const mins = Math.floor(pace);
    const secs = Math.floor((pace % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  };

  const formatSpeed = (speed) => {
    if (!speed || speed === Infinity) return 'N/A';
    return `${speed.toFixed(1)} km/h`;
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'walk':
        return '🚶';
      case 'run':
        return '🏃';
      case 'ride':
        return '🚴';
      default:
        return '📍';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'walk':
        return 'var(--color-walk)';
      case 'run':
        return 'var(--color-run)';
      case 'ride':
        return 'var(--color-ride)';
      default:
        return 'var(--color-accent)';
    }
  };

  const handleExportGPX = async () => {
    if (!activity.serverId) {
      alert('Activity must be synced before exporting');
      return;
    }

    try {
      const blob = await apiService.exportActivityGPX(activity.serverId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-${activity.serverId}.gpx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting GPX:', error);
      alert('Failed to export GPX');
    }
  };

  const mapCenter = activity.route && activity.route.length > 0
    ? [activity.route[0].lat, activity.route[0].lng]
    : [0, 0];

  return (
    <div className="activity-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={onClose} aria-label="Back to history">
          ← Back
        </button>
        <div className="detail-actions">
          <button className="btn btn-secondary" onClick={handleExportGPX} disabled={!activity.serverId}>
            📥 Export GPX
          </button>
          <button className="btn btn-danger" onClick={() => onDelete(activity.id)}>
            🗑️ Delete
          </button>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-info">
          <div className="info-header">
            <div className="activity-type-badge-large" style={{ background: getActivityColor(activity.type) }}>
              {getActivityIcon(activity.type)} {activity.type.toUpperCase()}
            </div>
            {activity.syncStatus === 'pending' && (
              <span className="sync-status pending">⏳ Not Synced</span>
            )}
            {activity.syncStatus === 'synced' && (
              <span className="sync-status synced">✓ Synced</span>
            )}
          </div>

          <h2 className="activity-name">{activity.name || 'Unnamed Activity'}</h2>

          <div className="activity-datetime">
            <div className="datetime-item">
              <span className="datetime-label">Date</span>
              <span className="datetime-value">{format(new Date(activity.startTime), 'PPP')}</span>
            </div>
            <div className="datetime-item">
              <span className="datetime-label">Time</span>
              <span className="datetime-value">{format(new Date(activity.startTime), 'p')}</span>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-icon">📏</div>
              <div className="stat-content">
                <div className="stat-label">Distance</div>
                <div className="stat-value text-mono">{formatDistance(activity.distance)}</div>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <div className="stat-label">Duration</div>
                <div className="stat-value text-mono">{formatDuration(activity.duration)}</div>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">⚡</div>
              <div className="stat-content">
                <div className="stat-label">Avg Speed</div>
                <div className="stat-value text-mono">{formatSpeed(activity.avgSpeed)}</div>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-icon">👟</div>
              <div className="stat-content">
                <div className="stat-label">Avg Pace</div>
                <div className="stat-value text-mono">{formatPace(activity.avgPace)}</div>
              </div>
            </div>

            {activity.elevationGain > 0 && (
              <div className="stat-box">
                <div className="stat-icon">⛰️</div>
                <div className="stat-content">
                  <div className="stat-label">Elevation Gain</div>
                  <div className="stat-value text-mono">{activity.elevationGain}m</div>
                </div>
              </div>
            )}

            {activity.steps > 0 && (
              <div className="stat-box">
                <div className="stat-icon">👣</div>
                <div className="stat-content">
                  <div className="stat-label">Steps</div>
                  <div className="stat-value text-mono">{activity.steps.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

          {activity.notes && (
            <div className="activity-notes">
              <h3>Notes</h3>
              <p>{activity.notes}</p>
            </div>
          )}

          <div className="route-details">
            <h3>Route Details</h3>
            <div className="route-stats">
              <div className="route-stat">
                <span className="route-stat-label">GPS Points:</span>
                <span className="route-stat-value">{activity.route?.length || 0}</span>
              </div>
              {activity.route && activity.route.length > 0 && (
                <>
                  <div className="route-stat">
                    <span className="route-stat-label">Start:</span>
                    <span className="route-stat-value text-mono">
                      {activity.route[0].lat.toFixed(6)}, {activity.route[0].lng.toFixed(6)}
                    </span>
                  </div>
                  <div className="route-stat">
                    <span className="route-stat-label">End:</span>
                    <span className="route-stat-value text-mono">
                      {activity.route[activity.route.length - 1].lat.toFixed(6)}, {activity.route[activity.route.length - 1].lng.toFixed(6)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="detail-map">
          {activity.route && activity.route.length > 0 ? (
            <MapContainer
              center={mapCenter}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <Polyline
                positions={activity.route.map(p => [p.lat, p.lng])}
                color={getActivityColor(activity.type)}
                weight={4}
                opacity={0.8}
              />
              
              <Marker position={[activity.route[0].lat, activity.route[0].lng]} />
              {activity.route.length > 1 && (
                <Marker position={[
                  activity.route[activity.route.length - 1].lat,
                  activity.route[activity.route.length - 1].lng
                ]} />
              )}
            </MapContainer>
          ) : (
            <div className="no-map">
              <p>No GPS data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActivityDetail;
