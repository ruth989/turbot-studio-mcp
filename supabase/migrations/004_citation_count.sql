-- Citation Count Migration
-- Track how often thought products are referenced (load-bearing indicator)

-- Add citation_count column
ALTER TABLE thought_products
ADD COLUMN citation_count INTEGER NOT NULL DEFAULT 0;

-- Create index for sorting by most-cited
CREATE INDEX idx_thought_products_citation_count ON thought_products(citation_count DESC);

-- Helper function to increment citation count
CREATE OR REPLACE FUNCTION increment_citation_count(tp_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE thought_products
  SET citation_count = citation_count + 1
  WHERE id = tp_id;
END;
$$ LANGUAGE plpgsql;
