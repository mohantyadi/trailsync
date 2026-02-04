import Dexie from 'dexie';

/**
 * TrailSync IndexedDB Database
 * Offline-first storage for activities and sync queue
 */
class TrailSyncDB extends Dexie {
  constructor() {
    super('TrailSyncDB');
    
    this.version(1).stores({
      // Activities table
      activities: '++id, userId, type, startTime, syncStatus, lastModified',
      
      // Sync queue for pending operations
      syncQueue: '++id, operation, timestamp, retryCount',
      
      // App settings and metadata
      settings: 'key'
    });
    
    this.activities = this.table('activities');
    this.syncQueue = this.table('syncQueue');
    this.settings = this.table('settings');
  }
}

// Create database instance
export const db = new TrailSyncDB();

/**
 * Activity operations
 */
export const ActivityDB = {
  // Add new activity
  async add(activity) {
    const id = await db.activities.add({
      ...activity,
      syncStatus: 'pending',
      lastModified: new Date().toISOString()
    });
    
    // Add to sync queue
    await db.syncQueue.add({
      operation: 'create',
      activityId: id,
      data: activity,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
    
    return id;
  },
  
  // Get all activities
  async getAll(filters = {}) {
    let collection = db.activities.orderBy('startTime').reverse();
    
    if (filters.type) {
      collection = collection.filter(a => a.type === filters.type);
    }
    
    if (filters.startDate) {
      collection = collection.filter(a => new Date(a.startTime) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      collection = collection.filter(a => new Date(a.startTime) <= new Date(filters.endDate));
    }
    
    return await collection.toArray();
  },
  
  // Get single activity
  async getById(id) {
    return await db.activities.get(id);
  },
  
  // Update activity
  async update(id, updates) {
    await db.activities.update(id, {
      ...updates,
      syncStatus: 'pending',
      lastModified: new Date().toISOString()
    });
    
    // Add to sync queue
    await db.syncQueue.add({
      operation: 'update',
      activityId: id,
      data: updates,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
  },
  
  // Delete activity
  async delete(id) {
    await db.activities.delete(id);
    
    // Add to sync queue
    await db.syncQueue.add({
      operation: 'delete',
      activityId: id,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
  },
  
  // Get activities that need syncing
  async getPendingSync() {
    return await db.activities.where('syncStatus').equals('pending').toArray();
  },
  
  // Mark activity as synced
  async markSynced(id, serverId) {
    await db.activities.update(id, {
      syncStatus: 'synced',
      serverId: serverId
    });
  }
};

/**
 * Sync queue operations
 */
export const SyncQueueDB = {
  // Get all pending sync operations
  async getAll() {
    return await db.syncQueue.orderBy('timestamp').toArray();
  },
  
  // Remove completed sync operation
  async remove(id) {
    await db.syncQueue.delete(id);
  },
  
  // Increment retry count
  async incrementRetry(id) {
    const item = await db.syncQueue.get(id);
    if (item) {
      await db.syncQueue.update(id, {
        retryCount: item.retryCount + 1,
        lastAttempt: new Date().toISOString()
      });
    }
  },
  
  // Clear all sync queue items
  async clear() {
    await db.syncQueue.clear();
  }
};

/**
 * Settings operations
 */
export const SettingsDB = {
  async get(key, defaultValue = null) {
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
  },
  
  async set(key, value) {
    await db.settings.put({ key, value });
  },
  
  async getAll() {
    const settings = await db.settings.toArray();
    return settings.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});
  }
};

// Initialize default settings
db.on('populate', () => {
  db.settings.bulkAdd([
    { key: 'apiKey', value: '' },
    { key: 'lastSync', value: null },
    { key: 'autoSync', value: true },
    { key: 'mapProvider', value: 'openstreetmap' }
  ]);
});

export default db;
