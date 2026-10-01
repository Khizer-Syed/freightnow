// Linear-interpolated percentile — same method as Postgres percentile_cont, which the
// reference Pricing Engine's calibration_report() uses, so numbers stay comparable.
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function round1(n) {
  return n == null ? null : Math.round(n * 10) / 10;
}

module.exports = { percentile, round1 };
