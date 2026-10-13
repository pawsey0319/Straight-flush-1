const test = require('node:test');
const assert = require('node:assert/strict');
const { conditionPasses, validateStrategy } = require('../lib/strategy-validator');
const { calculateVolatility } = require('../lib/fuyao-provider');
const { parseRuleFallback } = require('../lib/ai-provider');

test('rejects a contradictory condition range', () => {
  const result = validateStrategy({ conditions: [{ id: 'a', metric: 'pe_ttm', operator: '>=', value: 40, unit: 'x' }, { id: 'b', metric: 'pe_ttm', operator: '<=', value: 20, unit: 'x' }] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(','), /range_conflict/);
});

test('treats null and negative PE as unknown', () => {
  assert.equal(conditionPasses(null, { metric: 'pe_ttm', operator: '<=', value: 35 }), 'unknown');
  assert.equal(conditionPasses(-2, { metric: 'pe_ttm', operator: '<=', value: 35 }), 'unknown');
  assert.equal(conditionPasses(20, { metric: 'pe_ttm', operator: '<=', value: 35 }), 'pass');
});

test('rule fallback does not invent thresholds for vague language', () => {
  const result = parseRuleFallback('找经营改善、估值合理的 A 股。', []);
  assert.equal(result.provider, 'rule_fallback');
  assert.equal(result.explicit_conditions.length, 0);
  assert.equal(result.execution_status, 'needs_confirmation');
});

test('volatility requires at least 61 close prices', () => {
  assert.equal(calculateVolatility(Array.from({ length: 60 }, (_, index) => ({ close_price: 10 + index }))), null);
  assert.ok(calculateVolatility(Array.from({ length: 61 }, (_, index) => ({ close_price: 10 + index }))));
});
