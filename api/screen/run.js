const { getVisitorId, json, methodGuard } = require('../../lib/http');
const { runScreen } = require('../../lib/screen-engine');

module.exports = async function handler(request, response) {
  if (!methodGuard(request, response)) return;
  try {
    getVisitorId(request, response);
    const body = request.body || {};
    const result = await runScreen(body.strategy || {});
    const statusCode = result.status === 'complete' ? 200 : result.status === 'blocked' ? 400 : 502;
    return json(response, statusCode, result);
  } catch (error) {
    return json(response, 502, {
      status: 'provider_error',
      error: 'screen_run_failed',
      error_code: error.code || 'screen_run_failed',
      provider_code: error.providerCode ?? null,
      request_id: error.requestId || null,
      message: error.message
    });
  }
};
