/**
 * GPS Tracking Service
 * Handles geolocation tracking for activities
 * Supports live tracking with route recording
 */
class GPSTracker {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.currentActivity = null;
    this.routePoints = [];
    this.startTime = null;
    this.distance = 0;
    this.callbacks = {
      onLocationUpdate: null,
      onError: null,
      onStop: null
    };
  }
  
  /**
   * Check if geolocation is supported
   */
  isSupported() {
    return 'geolocation' in navigator;
  }
  
  /**
   * Request location permission
   */
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }
    
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => resolve(true),
        error => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error('Location permission denied'));
          } else {
            reject(new Error('Unable to get location'));
          }
        }
      );
    });
  }
  
  /**
   * Start tracking
   */
  async startTracking(activityType, callbacks = {}) {
    if (this.isTracking) {
      throw new Error('Already tracking');
    }
    
    if (!this.isSupported()) {
      throw new Error('Geolocation not supported');
    }
    
    // Set callbacks
    this.callbacks = {
      onLocationUpdate: callbacks.onLocationUpdate || null,
      onError: callbacks.onError || null,
      onStop: callbacks.onStop || null
    };
    
    // Initialize tracking
    this.isTracking = true;
    this.startTime = new Date();
    this.routePoints = [];
    this.distance = 0;
    this.currentActivity = {
      type: activityType,
      startTime: this.startTime.toISOString()
    };
    
    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
      position => this.handlePosition(position),
      error => this.handleError(error),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
    
    console.log('GPS tracking started');
  }
  
  /**
   * Handle position update
   */
  handlePosition(position) {
    if (!this.isTracking) return;
    
    const point = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      timestamp: new Date(position.timestamp).toISOString(),
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy
    };
    
    // Calculate distance from previous point
    if (this.routePoints.length > 0) {
      const prevPoint = this.routePoints[this.routePoints.length - 1];
      const pointDistance = this.calculateDistance(
        prevPoint.lat,
        prevPoint.lng,
        point.lat,
        point.lng
      );
      this.distance += pointDistance;
    }
    
    this.routePoints.push(point);
    
    // Trigger callback
    if (this.callbacks.onLocationUpdate) {
      this.callbacks.onLocationUpdate({
        point,
        route: this.routePoints,
        distance: this.distance,
        duration: this.getDuration()
      });
    }
  }
  
  /**
   * Handle geolocation error
   */
  handleError(error) {
    console.error('GPS error:', error);
    
    let message = 'Unknown location error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        break;
    }
    
    if (this.callbacks.onError) {
      this.callbacks.onError(message);
    }
  }
  
  /**
   * Stop tracking
   */
  stopTracking() {
    if (!this.isTracking) {
      return null;
    }
    
    // Stop watching position
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isTracking = false;
    const endTime = new Date();
    
    // Create activity summary
    const activity = {
      ...this.currentActivity,
      endTime: endTime.toISOString(),
      duration: Math.floor((endTime - this.startTime) / 1000),
      distance: Math.round(this.distance),
      route: this.routePoints,
      steps: 0 // Will be updated by step counter if available
    };
    
    console.log('GPS tracking stopped', activity);
    
    // Trigger callback
    if (this.callbacks.onStop) {
      this.callbacks.onStop(activity);
    }
    
    // Reset
    this.currentActivity = null;
    this.routePoints = [];
    this.distance = 0;
    
    return activity;
  }
  
  /**
   * Get current tracking status
   */
  getStatus() {
    if (!this.isTracking) {
      return null;
    }
    
    return {
      isTracking: this.isTracking,
      duration: this.getDuration(),
      distance: this.distance,
      pointCount: this.routePoints.length,
      currentPoint: this.routePoints[this.routePoints.length - 1] || null
    };
  }
  
  /**
   * Get duration in seconds
   */
  getDuration() {
    if (!this.startTime) return 0;
    return Math.floor((new Date() - this.startTime) / 1000);
  }
  
  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Returns distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }
  
  /**
   * Format duration as HH:MM:SS
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Format distance
   */
  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  }
  
  /**
   * Calculate pace (minutes per km)
   */
  calculatePace(distance, duration) {
    if (distance === 0) return 0;
    const distanceKm = distance / 1000;
    const durationMin = duration / 60;
    return durationMin / distanceKm;
  }
  
  /**
   * Calculate speed (km/h)
   */
  calculateSpeed(distance, duration) {
    if (duration === 0) return 0;
    const distanceKm = distance / 1000;
    const durationHours = duration / 3600;
    return distanceKm / durationHours;
  }
}

export const gpsTracker = new GPSTracker();
export default gpsTracker;
