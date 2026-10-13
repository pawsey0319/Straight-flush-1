CREATE TABLE IF NOT EXISTS anonymous_visitors (
  visitor_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS preference_memories (
  id BIGSERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES anonymous_visitors(visitor_id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  concept_label TEXT NOT NULL,
  definition_id TEXT NOT NULL,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  window_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL,
  confirmation_count INTEGER NOT NULL DEFAULT 1,
  last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(visitor_id, concept_id)
);

CREATE TABLE IF NOT EXISTS clarification_events (
  id BIGSERIAL PRIMARY KEY,
  visitor_id TEXT NOT NULL REFERENCES anonymous_visitors(visitor_id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  normalized_answer_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS preference_memories_visitor_idx ON preference_memories(visitor_id);
CREATE INDEX IF NOT EXISTS clarification_events_visitor_idx ON clarification_events(visitor_id);
