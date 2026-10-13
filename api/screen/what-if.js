const { getVisitorId, json, methodGuard } = require('../../lib/http');
const { runScreen } = require('../../lib/screen-engine');

module.exports = async function handler(request, response) { if (!methodGuard(request, response)) return; try { getVisitorId(request, response); const body = request.body || {}; const baseline = await runScreen(body.baseline_strategy || {}); const comparison = await runScreen(body.comparison_strategy || {}); return json(response, 200, { status: 'complete', baseline, comparison, diff: { selected_delta: (comparison.counts?.pass || 0) - (baseline.counts?.pass || 0), unknown_delta: (comparison.counts?.unknown || 0) - (baseline.counts?.unknown || 0) } }); } catch (error) { return json(response, 502, { error: 'what_if_failed', message: error.message }); } };
