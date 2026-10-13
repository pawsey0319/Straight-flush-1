const { json, methodGuard } = require('../lib/http');
const { getConfig } = require('../lib/config');

module.exports = async function handler(request, response) { if (!methodGuard(request, response, ['GET'])) return; const config = getConfig(); return json(response, 200, { status: 'ok', services: { ai: Boolean(config.ai.baseUrl && config.ai.model && config.ai.apiKey), fuyao: Boolean(config.fuyao.apiKey && config.fuyao.paths.universe && config.fuyao.paths.valuation && config.fuyao.paths.financial && config.fuyao.paths.kline), database: Boolean(config.database.url) }, mode: config.demoMode ? 'demo_allowed' : 'live_only' }); };
