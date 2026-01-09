-- Add all output types that may be missing from the enum
-- PostgreSQL enums need explicit ALTER TYPE commands

-- Original types that might be missing
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'persona_preview';
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'adept';
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'epics';
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'strategic_context';
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'information_architecture';
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'handoff_notes';

-- New solution design types
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'solution_brief';
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'feature_spec';
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'content_brief';
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'technical_context';
ALTER TYPE output_type ADD VALUE IF NOT EXISTS 'positioning';
