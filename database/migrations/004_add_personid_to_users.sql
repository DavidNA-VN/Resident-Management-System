-- 004_add_personid_to_users.sql
-- Add personId column to users and create FK/index

-- Add column if it doesn't exist (idempotent)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "personId" INTEGER;

-- Add FK constraint (drop existing first to be safe)
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS fk_users_person;

ALTER TABLE users
  ADD CONSTRAINT fk_users_person
    FOREIGN KEY ("personId") REFERENCES nhan_khau(id) ON DELETE SET NULL;

-- Add index to speed up lookups
CREATE INDEX IF NOT EXISTS idx_users_person_id ON users("personId");
