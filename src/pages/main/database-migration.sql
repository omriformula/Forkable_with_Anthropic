-- Migration to add Figma integration fields to screens table
-- Run this in your Supabase SQL editor

-- Add new columns for Figma integration
ALTER TABLE screens 
ADD COLUMN IF NOT EXISTS figma_url TEXT,
ADD COLUMN IF NOT EXISTS figma_file_key TEXT, 
ADD COLUMN IF NOT EXISTS analysis_data JSONB;

-- Update the original_image_url to be nullable since Figma URLs might not have images initially
ALTER TABLE screens 
ALTER COLUMN original_image_url DROP NOT NULL;

-- Update the original_image_path to be nullable since Figma files don't have storage paths
ALTER TABLE screens 
ALTER COLUMN original_image_path DROP NOT NULL;

-- Add an index for figma_file_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_screens_figma_file_key ON screens(figma_file_key);

-- Add a check constraint to ensure either image upload or figma integration
ALTER TABLE screens 
ADD CONSTRAINT chk_screens_source 
CHECK (
  (original_image_url IS NOT NULL AND original_image_path IS NOT NULL) OR 
  (figma_url IS NOT NULL)
);

-- Comment to document the new fields
COMMENT ON COLUMN screens.figma_url IS 'Full Figma file URL or just the file ID';
COMMENT ON COLUMN screens.figma_file_key IS 'Extracted Figma file key/ID for API calls';
COMMENT ON COLUMN screens.analysis_data IS 'JSON data containing Figma analysis results and GPT Vision output'; 