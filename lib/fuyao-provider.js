const { getConfig } = require('./config');
const { ProviderError } = require('./provider-errors');

const DEFAULT_PATHS = {
  prices: '/api/a-share/prices/snapshot',
  valuation: '/api/a-share/valuations/snapshot',
  financial: '/api/a-share/financials/indicators',
  historical: '/api/a-share/prices/historical',
  universe: '/api/meta/tickers/list'
};

const RETRYABLE_CODES = new Set([4001, 5001, 5002, 5003]);
const NON_ERROR_CODES = new Set([0, 200]);

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? null;
}

function numberOf(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').replace(/%$/, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function timestampOf(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const milliseconds = numeric < 100000000000 ? numeric * 1000 : numeric;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function metadataFrom(body) {
  const data = body?.data && typeof body.data === 'object' ? body.data : {};
  const page = numberOf(firstDefined(data.page, data.page_no, data.page_number, body?.page));
  const pageSize = numberOf(firstDefined(data.page_size, data.pageSize, data.limit, body?.page_size));
  const total = numberOf(firstDefined(data.total, data.total_count, data.count, body?.total));
  const hasMoreValue = firstDefined(data.has_more, data.hasMore, data.next_page, body?.has_more);
  const hasMore = typeof hasMoreValue === 'boolean'
    ? hasMoreValue
    : hasMoreValue === null
      ? null
      : Boolean(hasMoreValue) && String(hasMoreValue) !== '0' && String(hasMoreValue).toLowerCase() !== 'false';
  return {
    timestamp: timestampOf(firstDefined(data.timestamp, data.data_timestamp, data.updated_at, body?.timestamp)),
    page,
    pageSize,
    total,
    hasMore: hasMoreValue === null ? null : hasMore
  };
}

function rowList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  const keys = Object.keys(value);
  const arrayKeys = keys.filter((key) => Array.isArray(value[key]));
  if (arrayKeys.length && arrayKeys.every((key) => value[key].length === value[arrayKeys[0]].length)) {
    return value[arrayKeys[0]].map((_, index) => Object.fromEntries(keys.map((key) => [key, Array.isArray(value[key]) ? value[key][index] : value[key]])));
  }
  return [value];
}

function rowsFrom(body) {
  const data = body?.data ?? body;
  const item = data && typeof data === 'object' ? firstDefined(data.item, data.items, data.rows, data.list, data.records) : null;
  if (item !== null) return rowList(item);
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const metadataKeys = new Set(['timestamp', 'page', 'page_no', 'page_number', 'page_size', 'pageSize', 'total', 'total_count', 'count', 'has_more', 'hasMore', 'next_page']);
    const entries = Object.entries(data).filter(([key]) => !metadataKeys.has(key));
    if (entries.length && entries.every(([, value]) => value && typeof value === 'object' && !Array.isArray(value))) {
      return entries.map(([key, value]) => ({ symbol: key, ...value }));
    }
    return rowList(data);
  }
  return [];
}

function symbolOf(row) {
  return firstDefined(row?.thscode, row?.ts_code, row?.symbol, row?.code, row?.stock_code, row?.ticker, row?.security_code);
}

function valueOf(row, names) {
  for (const name of names) if (row?.[name] !== undefined) return row[name];
  return null;
}

function dateOf(row) {
  return firstDefined(row?.date, row?.trade_date, row?.datetime, row?.time, row?.date_ms, row?.trade_date_ms);
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers?.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1000, 3000);
  return 500 * (attempt + 1);
}

class FuyaoProvider {
  constructor() {
    this.config = getConfig().fuyao;
    this.paths = {
      ...DEFAULT_PATHS,
      ...(this.config.paths || {})
    };
  }

  async request(path, params = {}, attempt = 0) {
    if (!this.config.apiKey) throw new ProviderError('fuyao_not_configured', { code: 'fuyao_not_configured', provider: 'fuyao', status: 503, endpoint: path });
    if (!path) throw new ProviderError('fuyao_endpoint_not_configured', { code: 'fuyao_endpoint_not_configured', provider: 'fuyao', status: 503 });
    const url = new URL(path, `${this.config.baseUrl}/`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal, headers: { 'X-api-key': this.config.apiKey, Accept: 'application/json' } });
      const body = await response.json().catch(() => ({}));
      const providerCodeValue = firstDefined(body?.code, body?.data?.code);
      const providerCode = numberOf(providerCodeValue);
      const businessError = providerCodeValue !== null && !NON_ERROR_CODES.has(providerCode) && (providerCode >= 1000 || Boolean(body?.message));
      const retryable = response.status === 429 || response.status >= 500 || RETRYABLE_CODES.has(providerCode);
      if (!response.ok || businessError) {
        if (retryable && attempt < 1) {
          await sleep(retryDelay(response, attempt));
          return this.request(path, params, attempt + 1);
        }
        const error = new ProviderError(body?.message || `fuyao_http_${response.status}`, {
          code: `fuyao_${providerCodeValue || response.status}`,
          provider: 'fuyao',
          status: response.status >= 400 ? response.status : 502,
          retryable,
          requestId: firstDefined(body?.request_id, body?.requestId, response.headers.get('x-request-id')),
          endpoint: path
        });
        error.providerCode = providerCodeValue;
        error.providerMessage = body?.message || null;
        error.retrievedAt = new Date().toISOString();
        throw error;
      }
      const requestId = firstDefined(body?.request_id, body?.requestId, response.headers.get('x-request-id'));
      return {
        body,
        requestId,
        providerCode: providerCodeValue,
        providerTimestamp: metadataFrom(body).timestamp,
        retrievedAt: new Date().toISOString(),
        endpoint: path,
        params
      };
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (attempt < 1) {
        await sleep(500 * (attempt + 1));
        return this.request(path, params, attempt + 1);
      }
      const timeout = error?.name === 'AbortError';
      const providerError = new ProviderError(timeout ? 'fuyao_timeout' : 'fuyao_network_error', {
        code: timeout ? 'fuyao_timeout' : 'fuyao_network_error',
        provider: 'fuyao',
        status: 502,
        retryable: true,
        endpoint: path
      });
      providerError.providerMessage = error?.message || null;
      providerError.retrievedAt = new Date().toISOString();
      throw providerError;
    } finally {
      clearTimeout(timer);
    }
  }

  async paged(path, params = {}, pageSize = 100) {
    const rows = [];
    const requestIds = [];
    const providerCodes = [];
    const providerTimestamps = [];
    let page = 1;
    let total = null;
    let lastResult = null;
    for (let pageCount = 0; pageCount < 1000; pageCount += 1) {
      const result = await this.request(path, { ...params, limit: pageSize, offset: (page - 1) * pageSize });
      lastResult = result;
      const pageRows = rowsFrom(result.body);
      rows.push(...pageRows);
      if (result.requestId) requestIds.push(result.requestId);
      if (result.providerCode !== null) providerCodes.push(result.providerCode);
      if (result.providerTimestamp) providerTimestamps.push(result.providerTimestamp);
      const metadata = metadataFrom(result.body);
      total = metadata.total ?? total;
      const reachedTotal = total !== null && rows.length >= total;
      const exhaustedPage = pageRows.length === 0 || pageRows.length < pageSize;
      if (reachedTotal || exhaustedPage || metadata.hasMore === false) break;
      page += 1;
    }
    const uniqueRows = [];
    const seen = new Set();
    for (const row of rows) {
      const key = symbolOf(row) || JSON.stringify(row);
      if (!seen.has(key)) { seen.add(key); uniqueRows.push(row); }
    }
    return { ...lastResult, rows: uniqueRows, requestIds, providerCodes, providerTimestamps, pages: page };
  }

  async universe() {
    const result = await this.paged(this.paths.universe, { asset_type: 'a-share' }, 1000);
    return {
      ...result,
      rows: result.rows.map((row) => ({ symbol: symbolOf(row), name: valueOf(row, ['name', 'stock_name', 'security_name']) || symbolOf(row), raw: row })).filter((row) => row.symbol)
    };
  }

  async prices(symbols) {
    const result = await this.request(this.paths.prices, { thscode: symbols.join(','), fields: 'thscode,last' });
    return { ...result, rows: rowsFrom(result.body).map((row) => ({ symbol: symbolOf(row), last: numberOf(valueOf(row, ['last', 'last_price', 'close', 'price'])), raw: row })) };
  }

  async valuation(symbols) {
    const result = await this.request(this.paths.valuation, { thscodes: symbols.join(',') });
    return {
      ...result,
      rows: rowsFrom(result.body).map((row) => ({
        symbol: symbolOf(row),
        pe_ttm: numberOf(valueOf(row, ['pe_ttm', 'peTTM', 'pe'])),
        raw: row
      })).filter((row) => row.symbol)
    };
  }

  async financial(symbol) {
    const result = await this.request(this.paths.financial, { thscode: symbol, report: process.env.FUYAO_REPORT && process.env.FUYAO_REPORT !== 'auto' ? process.env.FUYAO_REPORT : reportPeriod() });
    const row = rowsFrom(result.body)[0] || {};
    return {
      ...result,
      row: {
        symbol,
        revenue_yoy: numberOf(valueOf(row, ['operating_income_yoy_growth_ratio', 'revenue_yoy'])),
        net_profit_yoy: numberOf(valueOf(row, ['net_profit_yoy_growth_ratio', 'net_profit_yoy'])),
        report_date_ms: valueOf(row, ['report_date_ms', 'report_date']),
        period_end_ms: valueOf(row, ['period_end_ms', 'period_end']),
        provider_timestamp: result.providerTimestamp,
        raw: row
      }
    };
  }

  async kline(symbol) {
    const today = new Date();
    const start = new Date(today.getTime() - 120 * 86400000);
    const result = await this.request(this.paths.historical, {
      thscode: symbol,
      interval: '1d',
      start: start.getTime(),
      end: today.getTime(),
      adjust: 'forward'
    });
    return { ...result, rows: rowsFrom(result.body) };
  }
}

function reportPeriod(date = new Date()) {
  const month = date.getUTCMonth() + 1;
  let year = date.getUTCFullYear();
  let quarter = 4;
  if (month >= 10) quarter = 3;
  else if (month >= 7) quarter = 2;
  else if (month >= 4) quarter = 1;
  else year -= 1;
  return `${year}-${quarter}`;
}

function calculateVolatility(rows) {
  const datedRows = rows.map((row, index) => ({ row, index, date: dateOf(row) }))
    .filter(({ row }) => numberOf(valueOf(row, ['close', 'close_price', 'close_px', '收盘价'])) !== null)
    .sort((left, right) => {
      if (!left.date || !right.date) return left.index - right.index;
      return String(left.date).localeCompare(String(right.date));
    });
  const closes = datedRows.map(({ row }) => numberOf(valueOf(row, ['close', 'close_price', 'close_px', '收盘价']))).filter((value) => value !== null && value > 0);
  if (closes.length < 61) return null;
  const returns = closes.slice(1).map((close, index) => Math.log(close / closes[index])).filter(Number.isFinite);
  if (returns.length < 60) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

module.exports = { DEFAULT_PATHS, FuyaoProvider, calculateVolatility, reportPeriod, rowsFrom, symbolOf, valueOf, numberOf, timestampOf };
