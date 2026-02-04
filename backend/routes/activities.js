const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../middleware/auth');
const {
  getActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
  syncActivities,
  getStats,
  exportGPX
} = require('../controllers/activityController');

/**
 * Activity Routes
 * All routes are protected with API key authentication
 */

// Apply authentication middleware to all routes
router.use(apiKeyAuth);

// Statistics route (must come before :id route)
router.get('/stats', getStats);

// Sync route for offline support
router.post('/sync', syncActivities);

// CRUD routes
router.route('/')
  .get(getActivities)
  .post(createActivity);

router.route('/:id')
  .get(getActivity)
  .put(updateActivity)
  .delete(deleteActivity);

// Export route
router.get('/:id/export/gpx', exportGPX);

module.exports = router;
