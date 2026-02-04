import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import { gpsTracker } from '../services/gps';
import { ActivityDB } from '../db/database';
import { syncService } from '../services/sync';
import 'leaflet/dist/leaflet.css';
import './TrackingPage.css';

// Fix for default marker icons in React-Leaflet
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Component to auto-center map on current position
function MapController({ center, route }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  useEffect(() => {
    if (route && route.length > 1) {
      const bounds = L.latLngBounds(route.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [route, map]);
  
  return null;
}

function TrackingPage() {
  const [isTracking, setIsTracking] = useState(false);
  const [activityType, setActivityType] = useState('walk');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [stats, setStats] = useState({
    distance: 0,
    duration: 0,
    pace: 0,
    speed: 0
  });
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const timerRef = useRef(null);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const checkPermission = async () => {
    try {
      await gpsTracker.requestPermission();
      setPermissionGranted(true);
    } catch (err) {
      setError(err.message);
      setPermissionGranted(false);
    }
  };

  const handleStart = async () => {
    if (!permissionGranted) {
      await checkPermission();
      if (!permissionGranted) return;
    }

    try {
      setError(null);
      
      await gpsTracker.startTracking(activityType, {
        onLocationUpdate: (data) => {
          setCurrentLocation(data.point);
          setRoute(data.route);
          setStats({
            distance: data.distance,
            duration: data.duration,
            pace: gpsTracker.calculatePace(data.distance, data.duration),
            speed: gpsTracker.calculateSpeed(data.distance, data.duration)
          });
        },
        onError: (errorMsg) => {
          setError(errorMsg);
        }
      });

      setIsTracking(true);

      // Update duration every second
      timerRef.current = setInterval(() => {
        const status = gpsTracker.getStatus();
        if (status) {
          setStats(prev => ({
            ...prev,
            duration: status.duration
          }));
        }
      }, 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStop = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const activity = gpsTracker.stopTracking();
    setIsTracking(false);

    if (activity && activity.route.length > 0) {
      // Save to IndexedDB
      try {
        await ActivityDB.add(activity);
        
        // Try to sync if online
        if (navigator.onLine) {
          syncService.sync();
        }
        
        alert('Activity saved successfully!');
        
        // Reset
        setRoute([]);
        setCurrentLocation(null);
        setStats({
          distance: 0,
          duration: 0,
          pace: 0,
          speed: 0
        });
      } catch (err) {
        console.error('Error saving activity:', err);
        setError('Failed to save activity');
      }
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatPace = (pace) => {
    if (!pace || pace === Infinity) return '--:--';
    const mins = Math.floor(pace);
    const secs = Math.floor((pace % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSpeed = (speed) => {
    if (!speed || speed === Infinity) return '0.0';
    return speed.toFixed(1);
  };

  const mapCenter = currentLocation 
    ? [currentLocation.lat, currentLocation.lng]
    : [20.2961, 85.8245]; // Bhubaneswar default

  return (
    <div className="tracking-page">
      <div className="tracking-header">
        <h1>Track Activity</h1>
        {!permissionGranted && (
          <div className="permission-banner">
            <p>Location permission required</p>
            <button className="btn btn-secondary" onClick={checkPermission}>
              Grant Permission
            </button>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="tracking-controls">
        {!isTracking && (
          <div className="activity-type-selector">
            <label htmlFor="activity-type">Activity Type</label>
            <div className="type-buttons">
              <button
                className={`type-btn ${activityType === 'walk' ? 'active walk' : ''}`}
                onClick={() => setActivityType('walk')}
                aria-pressed={activityType === 'walk'}
              >
                🚶 Walk
              </button>
              <button
                className={`type-btn ${activityType === 'run' ? 'active run' : ''}`}
                onClick={() => setActivityType('run')}
                aria-pressed={activityType === 'run'}
              >
                🏃 Run
              </button>
              <button
                className={`type-btn ${activityType === 'ride' ? 'active ride' : ''}`}
                onClick={() => setActivityType('ride')}
                aria-pressed={activityType === 'ride'}
              >
                🚴 Ride
              </button>
            </div>
          </div>
        )}

        <div className="tracking-action">
          {!isTracking ? (
            <button
              className="btn btn-primary btn-lg tracking-btn"
              onClick={handleStart}
              disabled={!permissionGranted}
              aria-label="Start tracking"
            >
              <span className="pulse-dot"></span>
              Start Tracking
            </button>
          ) : (
            <button
              className="btn btn-danger btn-lg tracking-btn"
              onClick={handleStop}
              aria-label="Stop tracking"
            >
              ⬛ Stop
            </button>
          )}
        </div>
      </div>

      {isTracking && (
        <div className="stats-panel">
          <div className="stat-card">
            <div className="stat-label">Distance</div>
            <div className="stat-value text-mono">{formatDistance(stats.distance)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Duration</div>
            <div className="stat-value text-mono">{formatDuration(stats.duration)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pace</div>
            <div className="stat-value text-mono">{formatPace(stats.pace)}/km</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Speed</div>
            <div className="stat-value text-mono">{formatSpeed(stats.speed)} km/h</div>
          </div>
        </div>
      )}

      <div className="map-container">
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {route.length > 0 && (
            <Polyline
              positions={route.map(p => [p.lat, p.lng])}
              color="#00fff9"
              weight={4}
              opacity={0.8}
            />
          )}
          
          {currentLocation && (
            <Marker position={[currentLocation.lat, currentLocation.lng]} />
          )}
          
          <MapController center={currentLocation ? [currentLocation.lat, currentLocation.lng] : null} route={route} />
        </MapContainer>
      </div>

      {route.length > 0 && (
        <div className="route-info">
          <p className="text-center text-accent">
            📍 {route.length} GPS points recorded
          </p>
        </div>
      )}
    </div>
  );
}

export default TrackingPage;
