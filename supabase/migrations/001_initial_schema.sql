-- Turbot MCP Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================
-- ENUMS
-- ===================

CREATE TYPE thought_product_type AS ENUM (
  'insight',
  'idea',
  'claim',
  'assumption',
  'decision',
  'question',
  'tension',
  'principle'
);

CREATE TYPE thought_product_state AS ENUM (
  'surfaced',
  'claimed',
  'supported',
  'challenged',
  'validated',
  'superseded',
  'abandoned'
);

CREATE TYPE evidence_type AS ENUM (
  'quote',
  'observation',
  'data'
);

CREATE TYPE output_type AS ENUM (
  'spec',
  'user_story',
  'journey',
  'problem_frame',
  'design_brief',
  'roadmap'
);

CREATE TYPE message_role AS ENUM (
  'user',
  'assistant',
  'system'
);

-- ===================
-- CORE TABLES
-- ===================

-- Workspace: Top-level container for a project/initiative
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thread: A conversation or thinking session within a workspace
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT,
  spawned_from_node_id UUID, -- Set after nodes table exists
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Node: A point in a thread (can branch)
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  message_ids UUID[] DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add the spawned_from reference now that nodes exists
ALTER TABLE threads
  ADD CONSTRAINT threads_spawned_from_node_fk
  FOREIGN KEY (spawned_from_node_id)
  REFERENCES nodes(id) ON DELETE SET NULL;

-- Message: Individual messages in a conversation
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  model TEXT, -- e.g., 'claude-3-opus', null for user messages
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ThoughtProduct: Core unit of knowledge with provenance
CREATE TABLE thought_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  type thought_product_type NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  state thought_product_state NOT NULL DEFAULT 'surfaced',
  confidence REAL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  influenced_by UUID[] DEFAULT '{}', -- Array of thought_product IDs
  influences UUID[] DEFAULT '{}',    -- Array of thought_product IDs
  superseded_by UUID REFERENCES thought_products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence: Supporting or challenging evidence for thought products
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  thought_product_id UUID NOT NULL REFERENCES thought_products(id) ON DELETE CASCADE,
  type evidence_type NOT NULL,
  content TEXT NOT NULL,
  source TEXT, -- Where this evidence came from
  supports BOOLEAN NOT NULL DEFAULT true, -- true = supporting, false = challenging
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Persona: Simulated user personas for validation
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  traits JSONB DEFAULT '{}',
  voice TEXT, -- Description of how this persona speaks
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Output: Generated artifacts with lineage
CREATE TABLE outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  type output_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  establishes UUID[] DEFAULT '{}', -- thought_product IDs this output establishes
  depends_on UUID[] DEFAULT '{}',  -- thought_product IDs this output depends on
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX idx_threads_workspace ON threads(workspace_id);
CREATE INDEX idx_nodes_thread ON nodes(thread_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_thought_products_workspace ON thought_products(workspace_id);
CREATE INDEX idx_thought_products_type ON thought_products(type);
CREATE INDEX idx_thought_products_state ON thought_products(state);
CREATE INDEX idx_evidence_thought_product ON evidence(thought_product_id);
CREATE INDEX idx_personas_workspace ON personas(workspace_id);
CREATE INDEX idx_outputs_workspace ON outputs(workspace_id);

-- ===================
-- ROW LEVEL SECURITY
-- ===================

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE thought_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;

-- For now, create permissive policies for authenticated users
-- We'll tighten these when we add workspace membership

CREATE POLICY "Allow all for authenticated users" ON workspaces
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON threads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON nodes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON thought_products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON evidence
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON personas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON outputs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon access for local development (remove in production)
CREATE POLICY "Allow all for anon users" ON workspaces
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON threads
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON nodes
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON messages
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON thought_products
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON evidence
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON personas
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON outputs
  FOR ALL TO anon USING (true) WITH CHECK (true);
