const ActivityLog = require('../models/ActivityLog');

// Fire-and-forget by design — a logging failure should never break the primary action
// (login, booking, etc). Callers should not await this on the request's critical path.
async function logActivity(userId, companyId, action, details = {}) {
  try {
    await ActivityLog.create({ user: userId || undefined, company: companyId || undefined, action, details });
  } catch (err) {
    console.error('Activity log write failed:', err);
  }
}

module.exports = { logActivity };
