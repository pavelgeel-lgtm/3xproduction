-- 021: Add period column to units (temporal concept like "советское", "XVIII век")
ALTER TABLE units ADD COLUMN IF NOT EXISTS period TEXT;
