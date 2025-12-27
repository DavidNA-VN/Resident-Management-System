-- Add attachments support to tam_tru_vang table
ALTER TABLE tam_tru_vang
ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN tam_tru_vang.attachments IS 'Array of file attachments with metadata: [{id, name, originalName, mimeType, size, path, url, uploadedAt}]';




