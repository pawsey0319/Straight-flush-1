function intEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) ? value : fallback;
}

function getConfig() {
  return {
    ai: { baseUrl: (process.env.AI_BASE_URL || '').replace(/\/$/, ''), model: process.env.AI_MODEL || '', apiKey: process.env.AI_API_KEY || '', timeoutMs: intEnv('AI_TIMEOUT_MS', 12000) },
    fuyao: { baseUrl: (process.env.FUYAO_BASE_URL || 'https://fuyao.aicubes.cn').replace(/\/$/, ''), apiKey: process.env.FUYAO_API_KEY || '', timeoutMs: intEnv('FUYAO_TIMEOUT_MS', 8000), maxConcurrency: intEnv('FUYAO_MAX_CONCURRENCY', 4), maxSymbols: intEnv('FUYAO_MAX_SYMBOLS', 0), paths: { universe: process.env.FUYAO_UNIVERSE_PATH || '/api/meta/tickers/list', valuation: process.env.FUYAO_VALUATION_PATH || '/api/a-share/valuations/snapshot', financial: process.env.FUYAO_FINANCIAL_PATH || '/api/a-share/financials/indicators', kline: process.env.FUYAO_KLINE_PATH || '/api/a-share/prices/historical' } },
    database: { url: process.env.DATABASE_URL || '', ttlDays: intEnv('MEMORY_TTL_DAYS', 90) },
    demoMode: process.env.DEMO_MODE === 'true'
  };
}

module.exports = { getConfig };
