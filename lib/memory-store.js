const { getConfig } = require('./config');

const localStore = globalThis.__clarityMemoryStore || (globalThis.__clarityMemoryStore = new Map());
let schemaReady;

async function getSql() {
  const url = getConfig().database.url;
  if (!url) return null;
  const { neon } = require('@neondatabase/serverless');
  return neon(url);
}

async function ensureSchema(sql) {
  if (!schemaReady) schemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS anonymous_visitors (visitor_id TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS preference_memories (id BIGSERIAL PRIMARY KEY, visitor_id TEXT NOT NULL REFERENCES anonymous_visitors(visitor_id) ON DELETE CASCADE, concept_id TEXT NOT NULL, concept_label TEXT NOT NULL, definition_id TEXT NOT NULL, metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb, window_json JSONB NOT NULL DEFAULT '{}'::jsonb, source TEXT NOT NULL, confirmation_count INTEGER NOT NULL DEFAULT 1, last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(visitor_id, concept_id))`;
    await sql`CREATE TABLE IF NOT EXISTS clarification_events (id BIGSERIAL PRIMARY KEY, visitor_id TEXT NOT NULL REFERENCES anonymous_visitors(visitor_id) ON DELETE CASCADE, concept_id TEXT NOT NULL, question_type TEXT NOT NULL, normalized_answer_json JSONB NOT NULL DEFAULT '{}'::jsonb, accepted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  })();
  await schemaReady;
}

async function listMemories(visitorId) {
  const sql = await getSql();
  if (!sql) return [...(localStore.get(visitorId) || [])];
  await ensureSchema(sql);
  const rows = await sql`SELECT id, concept_id, concept_label, definition_id, metrics_json, window_json, source, confirmation_count, last_confirmed_at FROM preference_memories WHERE visitor_id = ${visitorId} AND updated_at > NOW() - (${getConfig().database.ttlDays} || ' days')::interval ORDER BY updated_at DESC`;
  return rows.map((row) => ({ ...row, metrics: row.metrics_json, window: row.window_json }));
}

async function saveMemory(visitorId, memory) {
  const normalized = { ...memory, source: 'user_confirmed', concept_label: memory.concept_label || memory.concept_id, confirmation_count: Number(memory.confirmation_count || 1) };
  const sql = await getSql();
  if (!sql) { const next = [...(localStore.get(visitorId) || []).filter((item) => item.concept_id !== normalized.concept_id), normalized]; localStore.set(visitorId, next); return next; }
  await ensureSchema(sql);
  await sql`INSERT INTO anonymous_visitors(visitor_id, expires_at) VALUES (${visitorId}, NOW() + (${getConfig().database.ttlDays} || ' days')::interval) ON CONFLICT(visitor_id) DO UPDATE SET last_seen_at = NOW(), expires_at = NOW() + (${getConfig().database.ttlDays} || ' days')::interval`;
  await sql`INSERT INTO preference_memories(visitor_id, concept_id, concept_label, definition_id, metrics_json, window_json, source, confirmation_count, last_confirmed_at, updated_at) VALUES (${visitorId}, ${normalized.concept_id}, ${normalized.concept_label}, ${normalized.definition_id || normalized.preferred_definition}, ${JSON.stringify(normalized.metrics || {})}, ${JSON.stringify(normalized.window || {})}, 'user_confirmed', ${normalized.confirmation_count}, ${normalized.last_confirmed_at || new Date().toISOString()}, NOW()) ON CONFLICT(visitor_id, concept_id) DO UPDATE SET definition_id = EXCLUDED.definition_id, metrics_json = EXCLUDED.metrics_json, window_json = EXCLUDED.window_json, confirmation_count = preference_memories.confirmation_count + 1, last_confirmed_at = EXCLUDED.last_confirmed_at, updated_at = NOW()`;
  return listMemories(visitorId);
}

async function deleteMemory(visitorId, { id, conceptId, all }) {
  const sql = await getSql();
  if (!sql) { if (all) localStore.delete(visitorId); else localStore.set(visitorId, (localStore.get(visitorId) || []).filter((item) => item.id !== id && item.concept_id !== conceptId)); return listMemories(visitorId); }
  await ensureSchema(sql);
  if (all) await sql`DELETE FROM preference_memories WHERE visitor_id = ${visitorId}`; else if (id) await sql`DELETE FROM preference_memories WHERE visitor_id = ${visitorId} AND id = ${id}`; else await sql`DELETE FROM preference_memories WHERE visitor_id = ${visitorId} AND concept_id = ${conceptId}`;
  return listMemories(visitorId);
}

module.exports = { deleteMemory, listMemories, saveMemory };
