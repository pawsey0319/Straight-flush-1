const { getVisitorId, json, methodGuard } = require('../../lib/http');
const { listMemories, saveMemory } = require('../../lib/memory-store');

module.exports = async function handler(request, response) { if (!methodGuard(request, response)) return; try { const visitorId = getVisitorId(request, response); const body = request.body || {}; if (!body.concept_id || !body.definition_id) return json(response, 400, { error: 'concept_and_definition_required' }); const memories = await saveMemory(visitorId, body); return json(response, 200, { status: 'saved', memories }); } catch (error) { return json(response, 503, { error: 'memory_save_failed', message: error.message }); } };
