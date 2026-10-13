const ALLOWED_METRICS = new Set(['revenue_yoy', 'net_profit_yoy', 'pe_ttm', 'pe_percentile_5y', 'volatility_60d_annualized']);
const ALLOWED_OPERATORS = new Set(['>=', '<=', '>', '<', '=', '==']);

function validateStrategy(strategy) {
  const errors = [];
  if (!strategy || typeof strategy !== 'object') errors.push('strategy_required');
  const conditions = Array.isArray(strategy?.conditions) ? strategy.conditions : [];
  if (!conditions.length) errors.push('conditions_required');
  conditions.forEach((condition) => {
    if (!condition.id || !ALLOWED_METRICS.has(condition.metric)) errors.push(`unsupported_metric:${condition.metric || 'missing'}`);
    if (!ALLOWED_OPERATORS.has(condition.operator)) errors.push(`unsupported_operator:${condition.operator || 'missing'}`);
    if (!Number.isFinite(Number(condition.value))) errors.push(`invalid_value:${condition.id || 'unknown'}`);
    if (!condition.unit) errors.push(`missing_unit:${condition.id || 'unknown'}`);
  });
  const byMetric = new Map();
  conditions.forEach((condition) => { if (!byMetric.has(condition.metric)) byMetric.set(condition.metric, []); byMetric.get(condition.metric).push(condition); });
  for (const [metric, group] of byMetric) {
    const lower = group.find((condition) => ['>=', '>'].includes(condition.operator));
    const upper = group.find((condition) => ['<=', '<'].includes(condition.operator));
    if (lower && upper && Number(lower.value) > Number(upper.value)) errors.push(`range_conflict:${metric}`);
  }
  return { valid: errors.length === 0, errors };
}

function conditionPasses(value, condition) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'unknown';
  const actual = Number(value); const expected = Number(condition.value);
  if (condition.metric === 'pe_ttm' && actual < 0) return 'unknown';
  if (condition.operator === '>=') return actual >= expected ? 'pass' : 'fail';
  if (condition.operator === '<=') return actual <= expected ? 'pass' : 'fail';
  if (condition.operator === '>') return actual > expected ? 'pass' : 'fail';
  if (condition.operator === '<') return actual < expected ? 'pass' : 'fail';
  return actual === expected ? 'pass' : 'fail';
}

module.exports = { ALLOWED_METRICS, conditionPasses, validateStrategy };
