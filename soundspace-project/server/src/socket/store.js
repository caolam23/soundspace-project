/**
 * Socket.io Global State Management
 * 
 * This module manages all global state variables used across socket handlers:
 * - userSockets: Maps userId to a Set of socket IDs
 * - joinApprovals: Temporary approval cache for room join requests
 * - Helper functions: toId, startCleanupInterval
 * 
 * Purpose: Centralize state to prevent memory leaks and improve testability
 */

const APPROVAL_TTL = 2 * 60 * 1000; // 2 minutes: Time-to-live for join request approvals

// Map: userId -> Set<socketId>
// Tracks which socket connections belong to each authenticated user
const userSockets = new Map();

// Map: `${roomId}-${userId}` -> timestamp
// Caches recent join approvals to prevent repeated approval prompts (within TTL window)
const joinApprovals = new Map();

/**
 * Normalize any value to a string ID, handling null/undefined safely
 * @param {*} v - Value to normalize (number, string, ObjectId, etc.)
 * @returns {string|null} - Normalized ID or null
 */
const toId = (v) => (v === undefined || v === null) ? null : String(v);

/**
 * Start the auto-cleanup interval
 * Periodically removes expired entries from joinApprovals to prevent memory leaks
 * Should be called once during application startup
 */
const startCleanupInterval = () => {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of joinApprovals.entries()) {
      if (now - timestamp > APPROVAL_TTL) {
        joinApprovals.delete(key);
      }
    }
  }, APPROVAL_TTL);
};

module.exports = {
  userSockets,
  joinApprovals,
  APPROVAL_TTL,
  toId,
  startCleanupInterval,
};
