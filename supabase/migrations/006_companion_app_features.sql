-- Companion App Features Migration
-- Adds support for thoughtmap visualization features:
-- - Thread states (active/complete)
-- - Pipeline stages (8-stage Double Diamond)
-- - Structural patterns (fork, bridge, loop, join, iteration, sidebar, link)
-- - Node iterations (version history)
-- - Cross-thread links
-- - Context corpus

-- ===================
-- NEW ENUMS
-- ===================

CREATE TYPE thread_state AS ENUM ('active', 'complete');

CREATE TYPE pipeline_stage AS ENUM (
  'insights',
  'personas',
  'vision',
  'problems',
  'journeys',
  'concepting',
  'definition',
  'handoff'
);

CREATE TYPE pattern_type AS ENUM (
  'fork',      -- Divergent branch within thread
  'bridge',    -- Cross-thread connection
  'loop',      -- Return to earlier exploration
  'join',      -- Convergence of branches
  'iteration', -- Versioned refinement
  'sidebar',   -- Context marker
  'link'       -- General connection
);

-- ===================
-- ALTER EXISTING TABLES
-- ===================

-- threads: Add state column
ALTER TABLE threads
ADD COLUMN state thread_state NOT NULL DEFAULT 'active';

-- nodes: Add headline and stage columns
ALTER TABLE nodes
ADD COLUMN headline TEXT,
ADD COLUMN stage pipeline_stage;

-- ===================
-- NEW TABLES
-- ===================

-- node_iterations: Version history for nodes
CREATE TABLE node_iterations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  headline TEXT,
  summary TEXT,
  message_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(node_id, version)
);

-- patterns: Structural patterns linking nodes
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type pattern_type NOT NULL,
  label TEXT,
  source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- cross_thread_links: Links between nodes across threads
CREATE TABLE cross_thread_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  link_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_node_id, to_node_id)
);

-- context_items: External references and context corpus
CREATE TABLE context_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'quote', 'reference', 'link', 'document', 'note'
  title TEXT,
  content TEXT NOT NULL,
  source_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX idx_threads_state ON threads(state);
CREATE INDEX idx_nodes_stage ON nodes(stage);
CREATE INDEX idx_node_iterations_node ON node_iterations(node_id);
CREATE INDEX idx_patterns_workspace ON patterns(workspace_id);
CREATE INDEX idx_patterns_source_node ON patterns(source_node_id);
CREATE INDEX idx_patterns_type ON patterns(type);
CREATE INDEX idx_cross_thread_links_workspace ON cross_thread_links(workspace_id);
CREATE INDEX idx_cross_thread_links_from ON cross_thread_links(from_node_id);
CREATE INDEX idx_cross_thread_links_to ON cross_thread_links(to_node_id);
CREATE INDEX idx_context_items_workspace ON context_items(workspace_id);
CREATE INDEX idx_context_items_node ON context_items(node_id);

-- ===================
-- ROW LEVEL SECURITY
-- ===================

ALTER TABLE node_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_thread_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_items ENABLE ROW LEVEL SECURITY;

-- Permissive policies for local development (matches existing pattern)
CREATE POLICY "Allow all for authenticated users" ON node_iterations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON node_iterations
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON patterns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON patterns
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON cross_thread_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON cross_thread_links
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON context_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON context_items
  FOR ALL TO anon USING (true) WITH CHECK (true);
