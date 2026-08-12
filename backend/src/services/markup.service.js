const MarkupRule = require('../models/MarkupRule');
const activityLogService = require('./activityLog.service');

async function applyMarkup(baseRate) {
  const tiers = await MarkupRule.find({ isActive: true }).sort({ minAmount: 1 });
  const tier = tiers.find(t => baseRate >= t.minAmount && (t.maxAmount === null || baseRate <= t.maxAmount));
  const multiplier = tier ? tier.markupMultiplier : 1;
  return Math.round(baseRate * multiplier * 100) / 100;
}

// Retires the old tier (rather than overwriting it) and inserts a new one, so a historical
// quote's stated markup rule stays explainable. Not exposed via a route yet — this is the
// service function an admin markup-editing endpoint will call once one exists.
async function updateMarkupTier(actingUserId, { minAmount, maxAmount, markupMultiplier }) {
  const now = new Date();
  const old = await MarkupRule.findOneAndUpdate(
    { minAmount, isActive: true },
    { isActive: false, effectiveTo: now },
    { new: false }
  );

  const updated = await MarkupRule.create({
    minAmount,
    maxAmount,
    markupMultiplier,
    effectiveFrom: now,
    isActive: true,
  });

  activityLogService.logActivity(actingUserId, null, 'markup_rule_changed', {
    tier: minAmount,
    oldMultiplier: old?.markupMultiplier ?? null,
    newMultiplier: markupMultiplier,
  });

  return updated;
}

module.exports = { applyMarkup, updateMarkupTier };
