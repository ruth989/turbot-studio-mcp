-- Double Diamond Pipeline & Pattern Type Migration
--
-- Changes:
-- 1. Add 'pattern' to thought_product_type enum
-- 2. Replace 8-stage pipeline with 4-stage Double Diamond

-- ===================
-- ADD PATTERN TYPE
-- ===================

ALTER TYPE thought_product_type ADD VALUE IF NOT EXISTS 'pattern';

-- ===================
-- UPDATE PIPELINE STAGES
-- ===================

-- Create new 4-stage Double Diamond enum
CREATE TYPE pipeline_stage_new AS ENUM (
  'discover',   -- Diverge: research, gather insights, understand context
  'define',     -- Converge: synthesize, frame problems, validate
  'develop',    -- Diverge: ideate, explore solutions, concept
  'deliver'     -- Converge: refine, specify, hand off
);

-- Migrate existing nodes to new stages
-- Mapping: insights/personas/vision -> discover
--          problems/journeys -> define
--          concepting -> develop
--          definition/handoff -> deliver

ALTER TABLE nodes ADD COLUMN stage_new pipeline_stage_new;

UPDATE nodes SET stage_new =
  CASE
    WHEN stage IN ('insights', 'personas', 'vision') THEN 'discover'::pipeline_stage_new
    WHEN stage IN ('problems', 'journeys') THEN 'define'::pipeline_stage_new
    WHEN stage = 'concepting' THEN 'develop'::pipeline_stage_new
    WHEN stage IN ('definition', 'handoff') THEN 'deliver'::pipeline_stage_new
    ELSE NULL
  END;

-- Drop old column and rename new
ALTER TABLE nodes DROP COLUMN stage;
ALTER TABLE nodes RENAME COLUMN stage_new TO stage;

-- Drop old enum type (must do after column is removed)
DROP TYPE pipeline_stage;

-- Rename new enum to standard name
ALTER TYPE pipeline_stage_new RENAME TO pipeline_stage;

-- ===================
-- UPDATE INDEX
-- ===================

-- Recreate index if it existed
DROP INDEX IF EXISTS idx_nodes_stage;
CREATE INDEX idx_nodes_stage ON nodes(stage);
