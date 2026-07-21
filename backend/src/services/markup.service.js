function applyMarkup(baseRate) {
  if (baseRate <= 100) return Math.round(baseRate * 1.70 * 100) / 100;
  if (baseRate <= 250) return Math.round(baseRate * 1.55 * 100) / 100;
  if (baseRate <= 500) return Math.round(baseRate * 1.40 * 100) / 100;
  if (baseRate <= 1000) return Math.round(baseRate * 1.30 * 100) / 100;
  if (baseRate <= 2500) return Math.round(baseRate * 1.20 * 100) / 100;
  return Math.round(baseRate * 1.15 * 100) / 100;
}

module.exports = { applyMarkup };
