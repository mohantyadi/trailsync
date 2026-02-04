import { ActivityDB, SyncQueueDB, SettingsDB } from '../db/database';
import apiService from './api';

/**
 * Sync Service
 * Handles synchronization between IndexedDB and backend
 * Implements offline-first strategy with conflict resolution
 */
class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
  }
  
  /**
   * Start automatic sync
   */
  startAutoSync(intervalMinutes = 5) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.sync();
    }, intervalMinutes * 60 * 1000);
    
    // Sync immediately
    this.sync();
  }
  
  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Check if online
   */
  isOnline() {
    return navigator.onLine;
  }
  
  /**
   * Main sync function
   */
  async sync() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }
    
    if (!this.isOnline()) {
      console.log('Cannot sync - offline');
      return { success: false, message: 'Device is offline' };
    }
    
    this.isSyncing = true;
    
    try {
      console.log('Starting sync...');
      
      // Check backend health
      try {
        await apiService.healthCheck();
      } catch (error) {
        throw new Error('Backend is not reachable');
      }
      
      // Process sync queue
      const syncResults = await this.processSyncQueue();
      
      // Pull updates from server
      const pullResults = await this.pullFromServer();
      
      // Update last sync time
      await SettingsDB.set('lastSync', new Date().toISOString());
      
      console.log('Sync completed successfully');
      
      return {
        success: true,
        message: 'Sync completed',
        results: {
          push: syncResults,
          pull: pullResults
        }
      };
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        message: error.message,
        error: error
      };
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Process sync queue (push local changes to server)
   */
  async processSyncQueue() {
    const queue = await SyncQueueDB.getAll();
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const item of queue) {
      try {
        switch (item.operation) {
          case 'create':
            await this.syncCreate(item);
            break;
          case 'update':
            await this.syncUpdate(item);
            break;
          case 'delete':
            await this.syncDelete(item);
            break;
        }
        
        // Remove from queue on success
        await SyncQueueDB.remove(item.id);
        results.success++;
      } catch (error) {
        console.error(`Sync error for item ${item.id}:`, error);
        
        // Increment retry count
        await SyncQueueDB.incrementRetry(item.id);
        
        results.failed++;
        results.errors.push({
          itemId: item.id,
          error: error.message
        });
        
        // Remove from queue after too many retries
        if (item.retryCount >= 5) {
          console.warn(`Removing item ${item.id} after 5 failed retries`);
          await SyncQueueDB.remove(item.id);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Sync create operation
   */
  async syncCreate(item) {
    const activity = await ActivityDB.getById(item.activityId);
    if (!activity) {
      throw new Error('Activity not found locally');
    }
    
    const response = await apiService.createActivity(activity);
    
    // Update local activity with server ID
    await ActivityDB.markSynced(item.activityId, response.data._id);
  }
  
  /**
   * Sync update operation
   */
  async syncUpdate(item) {
    const activity = await ActivityDB.getById(item.activityId);
    if (!activity) {
      throw new Error('Activity not found locally');
    }
    
    if (!activity.serverId) {
      throw new Error('Cannot update activity without server ID');
    }
    
    await apiService.updateActivity(activity.serverId, item.data);
    await ActivityDB.markSynced(item.activityId, activity.serverId);
  }
  
  /**
   * Sync delete operation
   */
  async syncDelete(item) {
    const activity = await ActivityDB.getById(item.activityId);
    
    // If activity has server ID, delete from server
    if (activity?.serverId) {
      await apiService.deleteActivity(activity.serverId);
    }
  }
  
  /**
   * Pull updates from server
   */
  async pullFromServer() {
    try {
      const lastSync = await SettingsDB.get('lastSync');
      const filters = lastSync ? { startDate: lastSync } : {};
      
      const response = await apiService.getActivities(filters);
      const serverActivities = response.data;
      
      const results = {
        added: 0,
        updated: 0,
        conflicts: 0
      };
      
      for (const serverActivity of serverActivities) {
        // Check if activity exists locally
        const localActivities = await ActivityDB.getAll();
        const localActivity = localActivities.find(a => a.serverId === serverActivity._id);
        
        if (localActivity) {
          // Check for conflicts
          const serverModified = new Date(serverActivity.lastModified);
          const localModified = new Date(localActivity.lastModified);
          
          if (serverModified > localModified && localActivity.syncStatus === 'pending') {
            // Conflict: both modified since last sync
            console.warn('Conflict detected for activity', serverActivity._id);
            results.conflicts++;
            // For now, server wins
          }
          
          if (serverModified > localModified) {
            // Update local copy
            await ActivityDB.update(localActivity.id, {
              ...serverActivity,
              serverId: serverActivity._id,
              syncStatus: 'synced'
            });
            results.updated++;
          }
        } else {
          // Add new activity from server
          await ActivityDB.add({
            ...serverActivity,
            serverId: serverActivity._id,
            syncStatus: 'synced'
          });
          results.added++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error pulling from server:', error);
      throw error;
    }
  }
  
  /**
   * Force full sync (clear and re-download)
   */
  async forceSync() {
    if (!this.isOnline()) {
      throw new Error('Cannot force sync while offline');
    }
    
    try {
      console.log('Starting force sync...');
      
      // Clear sync queue
      await SyncQueueDB.clear();
      
      // Pull all activities from server
      const response = await apiService.getActivities({ limit: 1000 });
      const serverActivities = response.data;
      
      // Clear local activities
      const localActivities = await ActivityDB.getAll();
      for (const activity of localActivities) {
        await ActivityDB.delete(activity.id);
      }
      
      // Add all server activities
      for (const serverActivity of serverActivities) {
        await ActivityDB.add({
          ...serverActivity,
          serverId: serverActivity._id,
          syncStatus: 'synced'
        });
      }
      
      await SettingsDB.set('lastSync', new Date().toISOString());
      
      console.log('Force sync completed');
      return { success: true, count: serverActivities.length };
    } catch (error) {
      console.error('Force sync error:', error);
      throw error;
    }
  }
}

export const syncService = new SyncService();
export default syncService;
