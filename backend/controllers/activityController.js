const Activity = require('../models/Activity');

/**
 * Activity Controller
 * Handles all CRUD operations for fitness activities
 * Designed for single-user but structured for easy multi-user migration
 */

// @desc    Get all activities
// @route   GET /api/activities
// @access  Private (API Key)
exports.getActivities = async (req, res) => {
  try {
    const { type, startDate, endDate, sortBy = '-startTime', limit = 50 } = req.query;
    
    // Build query
    const query = { userId: 'default-user' }; // Future: req.user.id
    
    if (type) {
      query.type = type;
    }
    
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    
    const activities = await Activity.find(query)
      .sort(sortBy)
      .limit(parseInt(limit))
      .select('-__v');
    
    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching activities'
    });
  }
};

// @desc    Get single activity
// @route   GET /api/activities/:id
// @access  Private (API Key)
exports.getActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching activity'
    });
  }
};

// @desc    Create new activity
// @route   POST /api/activities
// @access  Private (API Key)
exports.createActivity = async (req, res) => {
  try {
    const activityData = {
      ...req.body,
      userId: 'default-user' // Future: req.user.id
    };
    
    // Validate required fields
    if (!activityData.type || !activityData.startTime || !activityData.endTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, startTime, endTime'
      });
    }
    
    // Calculate duration if not provided
    if (!activityData.duration) {
      const start = new Date(activityData.startTime);
      const end = new Date(activityData.endTime);
      activityData.duration = Math.floor((end - start) / 1000);
    }
    
    const activity = await Activity.create(activityData);
    
    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error creating activity'
    });
  }
};

// @desc    Update activity
// @route   PUT /api/activities/:id
// @access  Private (API Key)
exports.updateActivity = async (req, res) => {
  try {
    let activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    // Update fields
    Object.assign(activity, req.body);
    activity.lastModified = new Date();
    
    await activity.save();
    
    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error updating activity'
    });
  }
};

// @desc    Delete activity
// @route   DELETE /api/activities/:id
// @access  Private (API Key)
exports.deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    await activity.deleteOne();
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      error: 'Server error deleting activity'
    });
  }
};

// @desc    Bulk sync activities (for offline sync)
// @route   POST /api/activities/sync
// @access  Private (API Key)
exports.syncActivities = async (req, res) => {
  try {
    const { activities } = req.body;
    
    if (!Array.isArray(activities)) {
      return res.status(400).json({
        success: false,
        error: 'Activities must be an array'
      });
    }
    
    const results = {
      created: [],
      updated: [],
      conflicts: [],
      errors: []
    };
    
    for (const activityData of activities) {
      try {
        const { _id, ...data } = activityData;
        data.userId = 'default-user'; // Future: req.user.id
        
        if (_id) {
          // Try to update existing activity
          const existing = await Activity.findById(_id);
          
          if (existing) {
            // Check for conflicts (server modified after client's last sync)
            if (existing.lastModified > new Date(data.lastModified || 0)) {
              results.conflicts.push({ id: _id, data: existing });
            } else {
              Object.assign(existing, data);
              await existing.save();
              results.updated.push(existing);
            }
          } else {
            // Create with specified ID
            const activity = new Activity({ ...data, _id });
            await activity.save();
            results.created.push(activity);
          }
        } else {
          // Create new activity
          const activity = await Activity.create(data);
          results.created.push(activity);
        }
      } catch (error) {
        results.errors.push({
          data: activityData,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error syncing activities:', error);
    res.status(500).json({
      success: false,
      error: 'Server error syncing activities'
    });
  }
};

// @desc    Get activity statistics
// @route   GET /api/activities/stats
// @access  Private (API Key)
exports.getStats = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    const query = { userId: 'default-user' }; // Future: req.user.id
    
    if (type) query.type = type;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    
    const activities = await Activity.find(query);
    
    const stats = {
      totalActivities: activities.length,
      totalDistance: 0,
      totalDuration: 0,
      totalSteps: 0,
      totalElevation: 0,
      byType: {
        walk: { count: 0, distance: 0, duration: 0 },
        run: { count: 0, distance: 0, duration: 0 },
        ride: { count: 0, distance: 0, duration: 0 }
      }
    };
    
    activities.forEach(activity => {
      stats.totalDistance += activity.distance;
      stats.totalDuration += activity.duration;
      stats.totalSteps += activity.steps;
      stats.totalElevation += activity.elevationGain;
      
      if (stats.byType[activity.type]) {
        stats.byType[activity.type].count++;
        stats.byType[activity.type].distance += activity.distance;
        stats.byType[activity.type].duration += activity.duration;
      }
    });
    
    // Convert to readable units
    stats.totalDistanceKm = (stats.totalDistance / 1000).toFixed(2);
    stats.totalDurationFormatted = formatDuration(stats.totalDuration);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching statistics'
    });
  }
};

// Helper function to format duration
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

// @desc    Export activity as GPX
// @route   GET /api/activities/:id/export/gpx
// @access  Private (API Key)
exports.exportGPX = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    const gpx = generateGPX(activity);
    
    res.setHeader('Content-Type', 'application/gpx+xml');
    res.setHeader('Content-Disposition', `attachment; filename="activity-${activity._id}.gpx"`);
    res.send(gpx);
  } catch (error) {
    console.error('Error exporting GPX:', error);
    res.status(500).json({
      success: false,
      error: 'Server error exporting GPX'
    });
  }
};

// Helper function to generate GPX XML
function generateGPX(activity) {
  const points = activity.route.map(point => {
    const elevation = point.altitude ? `<ele>${point.altitude}</ele>` : '';
    const time = new Date(point.timestamp).toISOString();
    return `    <trkpt lat="${point.lat}" lon="${point.lng}">
      ${elevation}
      <time>${time}</time>
    </trkpt>`;
  }).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrailSync"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${activity.name}</name>
    <time>${activity.startTime.toISOString()}</time>
  </metadata>
  <trk>
    <name>${activity.name}</name>
    <type>${activity.type}</type>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
}

module.exports = exports;
