function buildEvidence({ runId, symbol, condition, value, status, provider, endpoint, requestId, asOf, retrievedAt, rawFields = [], formulaVersion = 'provider-value' }) {
  return { run_id: runId, symbol, condition_id: condition.id, metric: condition.metric, raw_fields: rawFields, derived_value: value, derived_unit: condition.unit, operator: condition.operator, threshold: condition.value, status, provider, endpoint, request_id: requestId, as_of: asOf, retrieved_at: retrievedAt, formula_version: formulaVersion, data_quality: status === 'unknown' ? 'unknown' : 'ok' };
}

module.exports = { buildEvidence };
