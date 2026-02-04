const mongoose = require('mongoose');

/**
 * Activity Schema
 * Stores fitness tracking data including GPS routes, steps, and performance metrics
 * Designed for single-user now, but includes userId field for future multi-user support
 */
const activitySchema = new mongoose.Schema({
  // User identification (for future multi-user support)
  userId: {
    type: String,
    default: 'default-user',
    index: true
  },

  // Activity type
  type: {
    type: String,
    enum: ['walk', 'run', 'ride'],
    required: true
  },

  // Activity metadata
  name: {
    type: String,
    default: function() {
      const date = new Date(this.startTime);
      return `${this.type.charAt(0).toUpperCase() + this.type.slice(1)} - ${date.toLocaleDateString()}`;
    }
  },

  // Time tracking
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // Duration in seconds
    required: true
  },

  // Distance and performance metrics
  distance: {
    type: Number, // Distance in meters
    required: true,
    min: 0
  },
  steps: {
    type: Number,
    default: 0,
    min: 0
  },
  avgPace: {
    type: Number, // Minutes per kilometer
    default: 0
  },
  avgSpeed: {
    type: Number, // Kilometers per hour
    default: 0
  },
  elevationGain: {
    type: Number, // Meters of elevation gained
    default: 0,
    min: 0
  },

  // GPS route data
  route: [{
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    timestamp: {
      type: Date,
      required: true
    },
    altitude: {
      type: Number,
      default: null
    },
    accuracy: {
      type: Number,
      default: null
    }
  }],

  // Sync metadata
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'conflict'],
    default: 'synced'
  },
  lastModified: {
    type: Date,
    default: Date.now
  },

  // Optional notes and tags
  notes: {
    type: String,
    maxlength: 1000
  },
  tags: [{
    type: String,
    maxlength: 50
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
activitySchema.index({ userId: 1, startTime: -1 });
activitySchema.index({ userId: 1, type: 1 });
activitySchema.index({ syncStatus: 1 });

// Virtual for formatted duration
activitySchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

// Method to calculate statistics
activitySchema.methods.calculateStats = function() {
  if (this.distance > 0 && this.duration > 0) {
    // Calculate average pace (min/km)
    const distanceKm = this.distance / 1000;
    const durationHours = this.duration / 3600;
    this.avgPace = (this.duration / 60) / distanceKm;
    this.avgSpeed = distanceKm / durationHours;
  }
  
  // Calculate elevation gain from route
  if (this.route && this.route.length > 1) {
    let gain = 0;
    for (let i = 1; i < this.route.length; i++) {
      if (this.route[i].altitude && this.route[i-1].altitude) {
        const diff = this.route[i].altitude - this.route[i-1].altitude;
        if (diff > 0) gain += diff;
      }
    }
    this.elevationGain = Math.round(gain);
  }
};

// Pre-save hook to calculate stats
activitySchema.pre('save', function(next) {
  this.calculateStats();
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Activity', activitySchema);
