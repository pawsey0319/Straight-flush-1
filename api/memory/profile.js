const { getVisitorId, json, methodGuard } = require('../../lib/http');
const { listMemories } = require('../../lib/memory-store');

module.exports = async function handler(request, response) { if (!methodGuard(request, response, ['GET'])) return; try { const visitorId = getVisitorId(request, response); return json(response, 200, { status: 'ok', memories: await listMemories(visitorId), storage: process.env.DATABASE_URL ? 'postgres' : 'preview_memory' }); } catch (error) { return json(response, 503, { error: 'memory_unavailable', message: error.message }); } };
