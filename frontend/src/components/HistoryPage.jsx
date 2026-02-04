import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ActivityDB } from '../db/database';
import { syncService } from '../services/sync';
import { format } from 'date-fns';
import ActivityDetail from './ActivityDetail';
import './HistoryPage.css';

function HistoryPage() {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Live query from Dexie
  const activities = useLiveQuery(
    async () => {
      const filters = filterType !== 'all' ? { type: filterType } : {};
      const allActivities = await ActivityDB.getAll(filters);
      
      // Sort activities
      return allActivities.sort((a, b) => {
        const dateA = new Date(a.startTime);
        const dateB = new Date(b.startTime);
        
        switch (sortBy) {
          case 'date-desc':
            return dateB - dateA;
          case 'date-asc':
            return dateA - dateB;
          case 'distance-desc':
            return b.distance - a.distance;
          case 'distance-asc':
            return a.distance - b.distance;
          case 'duration-desc':
            return b.duration - a.duration;
          case 'duration-asc':
            return a.duration - b.duration;
          default:
            return dateB - dateA;
        }
      });
    },
    [filterType, sortBy]
  );

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('Syncing...');
    
    const result = await syncService.sync();
    
    if (result.success) {
      setSyncMessage('✓ Synced successfully');
    } else {
      setSyncMessage(`✗ Sync failed: ${result.message}`);
    }
    
    setSyncing(false);
    setTimeout(() => setSyncMessage(''), 3000);
  };

  const handleDelete = async (activityId) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      try {
        await ActivityDB.delete(activityId);
        setSelectedActivity(null);
      } catch (error) {
        console.error('Error deleting activity:', error);
        alert('Failed to delete activity');
      }
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDistance = (meters) => {
    return `${(meters / 1000).toFixed(2)} km`;
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

  if (selectedActivity) {
    return (
      <ActivityDetail
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Activity History</h1>
        <button
          className="btn btn-secondary sync-btn"
          onClick={handleSync}
          disabled={syncing || !navigator.onLine}
          aria-label="Sync activities"
        >
          {syncing ? (
            <>
              <span className="spinner"></span> Syncing...
            </>
          ) : (
            <>🔄 Sync</>
          )}
        </button>
      </div>

      {syncMessage && (
        <div className={`sync-message ${syncMessage.startsWith('✓') ? 'success' : 'error'}`}>
          {syncMessage}
        </div>
      )}

      <div className="history-controls">
        <div className="filter-group">
          <label htmlFor="filter-type">Filter by Type</label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Activities</option>
            <option value="walk">Walks</option>
            <option value="run">Runs</option>
            <option value="ride">Rides</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-by">Sort By</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date-desc">Date (Newest First)</option>
            <option value="date-asc">Date (Oldest First)</option>
            <option value="distance-desc">Distance (Longest First)</option>
            <option value="distance-asc">Distance (Shortest First)</option>
            <option value="duration-desc">Duration (Longest First)</option>
            <option value="duration-asc">Duration (Shortest First)</option>
          </select>
        </div>
      </div>

      {!activities ? (
        <div className="loading-state">
          <span className="spinner"></span>
          <p>Loading activities...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h2>No Activities Yet</h2>
          <p>Start tracking your first activity to see it here!</p>
        </div>
      ) : (
        <div className="activities-grid">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="activity-card"
              onClick={() => setSelectedActivity(activity)}
              style={{ borderLeftColor: getActivityColor(activity.type) }}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter') setSelectedActivity(activity);
              }}
              aria-label={`View ${activity.type} activity from ${format(new Date(activity.startTime), 'PPP')}`}
            >
              <div className="activity-card-header">
                <div className="activity-type-badge" style={{ background: getActivityColor(activity.type) }}>
                  {getActivityIcon(activity.type)} {activity.type}
                </div>
                {activity.syncStatus === 'pending' && (
                  <span className="sync-badge" title="Not synced">⏳</span>
                )}
                {activity.syncStatus === 'synced' && (
                  <span className="sync-badge synced" title="Synced">✓</span>
                )}
              </div>

              <div className="activity-card-date">
                {format(new Date(activity.startTime), 'PPP')}
              </div>
              <div className="activity-card-time">
                {format(new Date(activity.startTime), 'p')}
              </div>

              <div className="activity-card-stats">
                <div className="stat">
                  <div className="stat-label">Distance</div>
                  <div className="stat-value text-mono">{formatDistance(activity.distance)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Duration</div>
                  <div className="stat-value text-mono">{formatDuration(activity.duration)}</div>
                </div>
                {activity.avgSpeed > 0 && (
                  <div className="stat">
                    <div className="stat-label">Avg Speed</div>
                    <div className="stat-value text-mono">{activity.avgSpeed.toFixed(1)} km/h</div>
                  </div>
                )}
              </div>

              {activity.route && activity.route.length > 0 && (
                <div className="activity-card-footer">
                  📍 {activity.route.length} GPS points
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activities && activities.length > 0 && (
        <div className="history-stats">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-value">{activities.length}</div>
              <div className="summary-label">Total Activities</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">
                {formatDistance(activities.reduce((sum, a) => sum + a.distance, 0))}
              </div>
              <div className="summary-label">Total Distance</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">
                {formatDuration(activities.reduce((sum, a) => sum + a.duration, 0))}
              </div>
              <div className="summary-label">Total Time</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
