const { getVisitorId, json, methodGuard } = require('../../lib/http');
const { queryKnowledge } = require('../../lib/ai-provider');

module.exports = async function handler(request, response) {
  if (!methodGuard(request, response)) return;
  try { getVisitorId(request, response); const body = request.body || {}; if (!String(body.question || '').trim() && !body.concept_id) return json(response, 400, { error: 'question_or_concept_required' }); return json(response, 200, await queryKnowledge({ question: String(body.question || ''), conceptId: body.concept_id, strategyContext: body.strategy_context || {} })); } catch (error) { return json(response, 502, { error: 'knowledge_query_failed', message: error.message }); }
};
