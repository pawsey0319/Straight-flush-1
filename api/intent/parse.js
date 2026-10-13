const { getVisitorId, json, methodGuard, traceId } = require('../../lib/http');
const { parseIntent } = require('../../lib/ai-provider');
const { listMemories } = require('../../lib/memory-store');

module.exports = async function handler(request, response) {
  if (!methodGuard(request, response)) return;
  try { const visitorId = getVisitorId(request, response); const body = request.body || {}; const text = String(body.text || '').trim(); if (!text) return json(response, 400, { error: 'text_required' }); const memories = await listMemories(visitorId); const result = await parseIntent({ text, memoryContext: body.memory_context?.length ? body.memory_context : memories, currentStrategy: body.current_strategy || {} }); return json(response, 200, { ...result, trace_id: result.trace_id || traceId('parse') }); } catch (error) { return json(response, 502, { error: 'intent_parse_failed', message: error.message }); }
};
