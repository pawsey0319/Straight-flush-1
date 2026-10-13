const { getVisitorId, json, methodGuard } = require('../../lib/http');
const { deleteMemory } = require('../../lib/memory-store');

module.exports = async function handler(request, response) { if (!methodGuard(request, response)) return; try { const visitorId = getVisitorId(request, response); const memories = await deleteMemory(visitorId, request.body || {}); return json(response, 200, { status: 'deleted', memories }); } catch (error) { return json(response, 503, { error: 'memory_delete_failed', message: error.message }); } };
