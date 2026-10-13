const { FuyaoProvider, calculateVolatility } = require('./fuyao-provider');
const { conditionPasses, validateStrategy } = require('./strategy-validator');
const { normalizeProviderError } = require('./provider-errors');
const { traceId } = require('./http');

async function mapLimit(items, limit, worker) {
  const output = [];
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, run));
  return output;
}

function errorDetails(error) {
  const normalized = normalizeProviderError(error);
  return {
    error_code: normalized.code,
    provider_code: normalized.providerCode ?? null,
    request_id: normalized.requestId || null,
    endpoint: normalized.endpoint || null,
    message: normalized.message
  };
}

function sourceFor(metric, provider) {
  if (metric === 'pe_ttm' || metric === 'pe_percentile_5y') return provider.paths.valuation;
  if (metric === 'revenue_yoy' || metric === 'net_profit_yoy') return provider.paths.financial;
  return provider.paths.historical;
}

function contextFor(metric, valuation, financial, kline, errors) {
  const context = metric === 'pe_ttm' || metric === 'pe_percentile_5y' ? valuation : metric === 'revenue_yoy' || metric === 'net_profit_yoy' ? financial : kline;
  if (context?.requestId || context?.requestIds?.length) return context;
  return errors[metric] || null;
}

function statusReason(metric, value, context, errors) {
  if (errors[metric]) return errors[metric].error_code;
  if (metric === 'pe_percentile_5y') return 'fuyao_pe_percentile_5y_unsupported';
  if (value === null || value === undefined) {
    if (metric === 'pe_ttm') return 'missing_or_invalid_pe_ttm';
    if (metric === 'volatility_60d_annualized') return 'historical_window_insufficient_or_invalid';
    return 'missing_or_invalid_financial_value';
  }
  if (metric === 'pe_ttm' && Number(value) < 0) return 'negative_pe_is_unknown';
  return context?.providerCode ? `fuyao_${context.providerCode}` : null;
}

function asOfFor(metric, valuation, financial, kline, retrievedAt) {
  if (metric === 'revenue_yoy' || metric === 'net_profit_yoy') {
    return financial?.row?.report_date_ms || financial?.row?.provider_timestamp || retrievedAt;
  }
  if (metric === 'pe_ttm' || metric === 'pe_percentile_5y') return valuation?.providerTimestamp || retrievedAt;
  const rows = kline?.rows || [];
  const last = rows[rows.length - 1];
  return last?.date || last?.trade_date || last?.datetime || kline?.providerTimestamp || retrievedAt;
}

async function runScreen(strategy) {
  const validation = validateStrategy(strategy);
  if (!validation.valid) return { status: 'blocked', message: 'strategy_validation_failed', errors: validation.errors };

  const provider = new FuyaoProvider();
  const runId = traceId('run');
  const retrievedAt = new Date().toISOString();
  let universe;
  try {
    universe = await provider.universe();
  } catch (error) {
    const details = errorDetails(error);
    return { status: 'provider_error', message: details.message, error_code: details.error_code, provider_code: details.provider_code, request_id: details.request_id, endpoint: details.endpoint, provider: 'fuyao', run_id: runId, retrieved_at: retrievedAt };
  }

  const symbols = universe.rows.slice(0, provider.config.maxSymbols || universe.rows.length);
  const valuationBySymbol = new Map();
  const financialBySymbol = new Map();
  const klineBySymbol = new Map();
  const valuationErrors = new Map();
  const financialErrors = new Map();
  const klineErrors = new Map();
  const requestIds = [...(universe.requestIds || [])];
  const providerCodes = [...(universe.providerCodes || [])];

  for (let index = 0; index < symbols.length; index += 100) {
    const chunk = symbols.slice(index, index + 100);
    try {
      const result = await provider.valuation(chunk.map((item) => item.symbol));
      result.rows.forEach((row) => valuationBySymbol.set(row.symbol, { ...result, row }));
      requestIds.push(...(result.requestIds || [result.requestId].filter(Boolean)));
      if (result.providerCode !== null && result.providerCode !== undefined) providerCodes.push(result.providerCode);
      const returned = new Set(result.rows.map((row) => row.symbol));
      chunk.forEach((item) => {
        if (!returned.has(item.symbol)) valuationBySymbol.set(item.symbol, { ...result, row: null, missing: true });
      });
    } catch (error) {
      const details = errorDetails(error);
      chunk.forEach((item) => valuationErrors.set(item.symbol, details));
    }
  }

  await mapLimit(symbols, provider.config.maxConcurrency, async (item) => {
    try {
      const result = await provider.financial(item.symbol);
      financialBySymbol.set(item.symbol, result);
      if (result.requestId) requestIds.push(result.requestId);
      if (result.providerCode !== null && result.providerCode !== undefined) providerCodes.push(result.providerCode);
    } catch (error) {
      financialErrors.set(item.symbol, errorDetails(error));
    }
    try {
      const result = await provider.kline(item.symbol);
      klineBySymbol.set(item.symbol, result);
      if (result.requestId) requestIds.push(result.requestId);
      if (result.providerCode !== null && result.providerCode !== undefined) providerCodes.push(result.providerCode);
    } catch (error) {
      klineErrors.set(item.symbol, errorDetails(error));
    }
  });

  const results = symbols.map((item) => {
    const valuation = valuationBySymbol.get(item.symbol);
    const financial = financialBySymbol.get(item.symbol);
    const kline = klineBySymbol.get(item.symbol);
    const errors = {
      pe_ttm: valuationErrors.get(item.symbol),
      pe_percentile_5y: valuationErrors.get(item.symbol),
      revenue_yoy: financialErrors.get(item.symbol),
      net_profit_yoy: financialErrors.get(item.symbol),
      volatility_60d_annualized: klineErrors.get(item.symbol)
    };
    const values = {
      revenue_yoy: financial?.row?.revenue_yoy ?? null,
      net_profit_yoy: financial?.row?.net_profit_yoy ?? null,
      pe_ttm: valuation?.row?.pe_ttm ?? null,
      pe_percentile_5y: null,
      volatility_60d_annualized: kline?.rows ? calculateVolatility(kline.rows) : null
    };
    const evidence = strategy.conditions.map((condition) => {
      const metric = condition.metric;
      const context = contextFor(metric, valuation, financial, kline, errors);
      const reason = statusReason(metric, values[metric], context, errors);
      const status = metric === 'pe_percentile_5y' || reason ? 'unknown' : conditionPasses(values[metric], condition);
      const providerCode = context?.providerCode ?? errors[metric]?.provider_code ?? null;
      const requestId = context?.requestId || context?.requestIds?.[0] || errors[metric]?.request_id || null;
      return {
        condition_id: condition.id,
        metric,
        status,
        derived_value: values[metric],
        threshold: condition.value,
        unit: condition.unit,
        operator: condition.operator,
        provider: 'fuyao',
        endpoint: sourceFor(metric, provider),
        request_id: requestId,
        request_ids: context?.requestIds || (requestId ? [requestId] : []),
        error_code: reason || errors[metric]?.error_code || null,
        provider_code: providerCode,
        provider_timestamp: context?.providerTimestamp || null,
        report_date_ms: financial?.row?.report_date_ms || null,
        period_end_ms: financial?.row?.period_end_ms || null,
        as_of: asOfFor(metric, valuation, financial, kline, retrievedAt),
        retrieved_at: context?.retrievedAt || retrievedAt,
        formula_version: metric === 'volatility_60d_annualized' ? 'volatility-v1-60-observations-qfq-252' : metric === 'pe_percentile_5y' ? 'unsupported' : 'provider-value',
        data_quality: status === 'unknown' ? (metric === 'pe_percentile_5y' ? 'unsupported' : 'unknown') : 'ok'
      };
    });
    const statuses = evidence.map((entry) => entry.status);
    const status = statuses.includes('unknown') ? 'unknown' : statuses.includes('fail') ? 'fail' : 'pass';
    return {
      symbol: item.symbol,
      name: item.name,
      status,
      metrics: values,
      evidence,
      evidence_id: `${runId}_${item.symbol}`,
      as_of: evidence.map((entry) => entry.as_of).find(Boolean) || retrievedAt,
      data_quality: status === 'unknown' ? 'partial' : 'ok',
      explanation: status === 'pass' ? '所有当前支持的条件均通过。' : status === 'fail' ? '至少一个条件未满足，具体原因见证据账本。' : '关键字段缺失、数据源异常或当前数据源不支持该条件。'
    };
  });

  return {
    status: 'complete',
    run_id: runId,
    provider: { name: 'fuyao', ok: true, request_ids: [...new Set(requestIds.filter(Boolean))], error_codes: [...new Set(providerCodes.filter((code) => code !== null && code !== undefined))] },
    data_as_of: results.map((item) => item.as_of).find(Boolean) || null,
    retrieved_at: retrievedAt,
    counts: {
      pass: results.filter((item) => item.status === 'pass').length,
      fail: results.filter((item) => item.status === 'fail').length,
      unknown: results.filter((item) => item.status === 'unknown').length
    },
    results,
    warnings: strategy.conditions.some((condition) => condition.metric === 'pe_percentile_5y') ? ['pe_percentile_5y_not_supported_by_current_provider'] : []
  };
}

module.exports = { runScreen };
