-- Notebooks Migration
-- Working surfaces for accumulating and organizing thought products

-- ===================
-- NOTEBOOKS TABLE
-- ===================

CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT, -- Freeform markdown scratchpad area
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notebooks_workspace ON notebooks(workspace_id);

-- ===================
-- NOTEBOOK ENTRIES (Junction Table)
-- ===================

-- Links thought products to notebooks with optional ordering and annotations
CREATE TABLE notebook_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  thought_product_id UUID NOT NULL REFERENCES thought_products(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0, -- For user-defined ordering
  annotation TEXT, -- Per-entry note about why this TP is in this notebook
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A thought product can only be in a notebook once
  UNIQUE(notebook_id, thought_product_id)
);

CREATE INDEX idx_notebook_entries_notebook ON notebook_entries(notebook_id);
CREATE INDEX idx_notebook_entries_thought_product ON notebook_entries(thought_product_id);

-- ===================
-- ROW LEVEL SECURITY
-- ===================

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;

-- Permissive policies for local development (matches existing pattern)
CREATE POLICY "Allow all for authenticated users" ON notebooks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON notebooks
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON notebook_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon users" ON notebook_entries
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ===================
-- HELPER FUNCTION
-- ===================

-- Auto-update updated_at on notebooks
CREATE OR REPLACE FUNCTION update_notebook_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notebooks_updated_at
  BEFORE UPDATE ON notebooks
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_timestamp();
