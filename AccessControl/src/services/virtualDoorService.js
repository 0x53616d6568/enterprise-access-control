/**
 * Virtual Door Service (Frontend)
 * Interact with the virtual door via REST API
 */

import { api } from './apiService';
import { API } from '../constants/api';

export const virtualDoorService = {
  /**
   * Get virtual door status
   */
  async getStatus() {
    try {
      const response = await api.get(API.VIRTUAL_DOOR_STATUS);
      return response.data.data || response.data;
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Failed to get door status');
    }
  },

  /**
   * Unlock the virtual door (manager/admin only)
   */
  async unlock() {
    try {
      const response = await api.post(API.VIRTUAL_DOOR_UNLOCK);
      return response.data.data || response.data;
    } catch (err) {
      throw new Error(err?.response?.data?.message || 'Failed to unlock door');
    }
  }
};
