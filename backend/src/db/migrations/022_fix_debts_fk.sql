-- Fix debts FK to units: add ON DELETE CASCADE
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_unit_id_fkey;
ALTER TABLE debts ADD CONSTRAINT debts_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;

-- Also fix debts FK to issuances
ALTER TABLE debts DROP CONSTRAINT IF EXISTS debts_issuance_id_fkey;
ALTER TABLE debts ADD CONSTRAINT debts_issuance_id_fkey FOREIGN KEY (issuance_id) REFERENCES issuances(id) ON DELETE SET NULL;

-- Add 'writeoff' to approval_action enum if not exists
DO $$ BEGIN
  ALTER TYPE approval_action ADD VALUE IF NOT EXISTS 'writeoff';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
