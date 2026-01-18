-- Enable pg_trgm extension for fuzzy string matching
-- Used for customer duplicate detection (similarity search on name, email, phone)

-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for fast similarity search on customers table
-- These indexes support the % operator for trigram similarity search

-- Index on customer name for fuzzy name matching
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

-- Create a composite index for common search patterns
-- Note: For email and phone, we create indexes on the contacts table since
-- that's where the actual email/phone data lives in this schema

-- Index on contacts email for fuzzy email matching
CREATE INDEX IF NOT EXISTS idx_contacts_email_trgm ON contacts USING GIN (email gin_trgm_ops);

-- Index on contacts phone for fuzzy phone matching
CREATE INDEX IF NOT EXISTS idx_contacts_phone_trgm ON contacts USING GIN (phone gin_trgm_ops);

-- Index on contacts mobile for fuzzy mobile matching
CREATE INDEX IF NOT EXISTS idx_contacts_mobile_trgm ON contacts USING GIN (mobile gin_trgm_ops);

-- Set default similarity threshold (can be adjusted per-query)
-- Default threshold is 0.3 which is a good balance for duplicate detection
-- Higher = more strict matching, Lower = more fuzzy matches

-- Add comment for documentation
COMMENT ON EXTENSION pg_trgm IS 'Trigram extension for fuzzy string matching - used for customer duplicate detection';
