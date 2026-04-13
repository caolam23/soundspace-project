/**
 * ✅ FEATURE: Audience Interaction API Service
 * Client-side API calls for like and gift interactions
 * Implementation Date: April 2026
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8800';

const audienceInteractionApi = {
  // Send like to room
  sendLike: async (roomId, token) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/audience-interactions/${roomId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Error sending like:', error);
      throw error;
    }
  },

  // Send gift to room
  sendGift: async (roomId, giftType, token) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/audience-interactions/${roomId}/gift`,
        { giftType },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Error sending gift:', error);
      throw error;
    }
  },

  // Get interaction statistics
  getStats: async (roomId, token) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/audience-interactions/${roomId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching interaction stats:', error);
      throw error;
    }
  }
};

export default audienceInteractionApi;
