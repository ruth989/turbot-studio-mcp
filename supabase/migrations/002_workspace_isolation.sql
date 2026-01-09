-- Workspace Isolation Migration
-- Apply this when you add user authentication
-- For now, the permissive policies allow local/single-user use

-- ===================
-- WORKSPACE MEMBERS TABLE
-- ===================

-- Uncomment when ready to add multi-user support:

/*
CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Members can see their own memberships
CREATE POLICY "Users can view their memberships" ON workspace_members
  FOR SELECT USING (auth.uid() = user_id);

-- Only workspace owners/admins can manage members
CREATE POLICY "Admins can manage members" ON workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );
*/

-- ===================
-- STRICT RLS POLICIES
-- ===================

-- When ready for multi-user, replace the permissive policies with these:

/*
-- Drop permissive policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON workspaces;
DROP POLICY IF EXISTS "Allow all for anon users" ON workspaces;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON threads;
DROP POLICY IF EXISTS "Allow all for anon users" ON threads;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON nodes;
DROP POLICY IF EXISTS "Allow all for anon users" ON nodes;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON messages;
DROP POLICY IF EXISTS "Allow all for anon users" ON messages;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON thought_products;
DROP POLICY IF EXISTS "Allow all for anon users" ON thought_products;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON evidence;
DROP POLICY IF EXISTS "Allow all for anon users" ON evidence;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON personas;
DROP POLICY IF EXISTS "Allow all for anon users" ON personas;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON outputs;
DROP POLICY IF EXISTS "Allow all for anon users" ON outputs;

-- Helper function to check workspace access
CREATE OR REPLACE FUNCTION user_has_workspace_access(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspaces: users can see workspaces they're members of
CREATE POLICY "Users can view member workspaces" ON workspaces
  FOR SELECT USING (user_has_workspace_access(id));

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update workspaces" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );

-- Threads: workspace members can access
CREATE POLICY "Workspace members can access threads" ON threads
  FOR ALL USING (user_has_workspace_access(workspace_id));

-- Nodes: workspace members can access
CREATE POLICY "Workspace members can access nodes" ON nodes
  FOR ALL USING (
    user_has_workspace_access(
      (SELECT workspace_id FROM threads WHERE id = nodes.thread_id)
    )
  );

-- Messages: workspace members can access
CREATE POLICY "Workspace members can access messages" ON messages
  FOR ALL USING (
    user_has_workspace_access(
      (SELECT workspace_id FROM threads WHERE id = messages.thread_id)
    )
  );

-- Thought products: workspace members can access
CREATE POLICY "Workspace members can access thought_products" ON thought_products
  FOR ALL USING (user_has_workspace_access(workspace_id));

-- Evidence: workspace members can access
CREATE POLICY "Workspace members can access evidence" ON evidence
  FOR ALL USING (user_has_workspace_access(workspace_id));

-- Personas: workspace members can access
CREATE POLICY "Workspace members can access personas" ON personas
  FOR ALL USING (user_has_workspace_access(workspace_id));

-- Outputs: workspace members can access
CREATE POLICY "Workspace members can access outputs" ON outputs
  FOR ALL USING (user_has_workspace_access(workspace_id));

-- Auto-add creator as owner when workspace is created
CREATE OR REPLACE FUNCTION add_workspace_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_workspace_owner();
*/

-- ===================
-- CURRENT STATE
-- ===================

-- For now, we're using permissive policies for local/single-user development.
-- The policies in 001_initial_schema.sql allow any authenticated or anon user
-- full access to all tables.
--
-- When you're ready for multi-user:
-- 1. Set up Supabase Auth
-- 2. Uncomment the workspace_members table above
-- 3. Uncomment the strict RLS policies
-- 4. Run this migration

SELECT 'Workspace isolation migration ready but not applied. Uncomment when adding auth.' AS status;
