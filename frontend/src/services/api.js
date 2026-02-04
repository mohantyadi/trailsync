import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * API Service
 * Handles all communication with the backend
 * Automatically adds API key to requests
 */
class APIService {
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add API key to all requests
    this.client.interceptors.request.use(
      config => {
        const apiKey = localStorage.getItem('apiKey');
        if (apiKey) {
          config.headers['X-API-Key'] = apiKey;
        }
        return config;
      },
      error => Promise.reject(error)
    );
    
    // Handle response errors
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error('Authentication failed');
        }
        return Promise.reject(error);
      }
    );
  }
  
  // Health check
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Backend is not reachable');
    }
  }
  
  // Activity endpoints
  async getActivities(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await this.client.get(`/activities?${params}`);
    return response.data;
  }
  
  async getActivity(id) {
    const response = await this.client.get(`/activities/${id}`);
    return response.data;
  }
  
  async createActivity(activity) {
    const response = await this.client.post('/activities', activity);
    return response.data;
  }
  
  async updateActivity(id, updates) {
    const response = await this.client.put(`/activities/${id}`, updates);
    return response.data;
  }
  
  async deleteActivity(id) {
    const response = await this.client.delete(`/activities/${id}`);
    return response.data;
  }
  
  // Sync endpoint
  async syncActivities(activities) {
    const response = await this.client.post('/activities/sync', { activities });
    return response.data;
  }
  
  // Statistics
  async getStats(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await this.client.get(`/activities/stats?${params}`);
    return response.data;
  }
  
  // Export
  async exportActivityGPX(id) {
    const response = await this.client.get(`/activities/${id}/export/gpx`, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export const apiService = new APIService();
export default apiService;
