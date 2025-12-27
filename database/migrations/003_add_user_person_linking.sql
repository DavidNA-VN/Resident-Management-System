-- Migration: Add users.personId, normalize_cccd function and auto-link trigger
-- Idempotent migration: safe to run multiple times
BEGIN;

-- 1) Add personId column to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "personId" INTEGER;

-- 2) Add foreign key constraint from users.personId -> nhan_khau(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_person'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_person
      FOREIGN KEY ("personId") REFERENCES nhan_khau(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) normalize_cccd function used by queries and indexes
CREATE OR REPLACE FUNCTION normalize_cccd(input TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN regexp_replace(trim(input), '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4) Unique index on normalized cccd in nhan_khau (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_nhan_khau_normalized_cccd
ON nhan_khau ((normalize_cccd(cccd)));

-- 5) Backfill existing users: set personId where username matches nhan_khau.cccd (normalized)
UPDATE users
SET "personId" = nk.id
FROM nhan_khau nk
WHERE users."personId" IS NULL
  AND normalize_cccd(users.username) = normalize_cccd(nk.cccd);

-- 5) Trigger function to auto-link users when a matching nhan_khau is inserted
CREATE OR REPLACE FUNCTION trg_link_user_on_nhan_khau_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cccd IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE users
  SET "personId" = NEW.id
  WHERE normalize_cccd(users.username) = normalize_cccd(NEW.cccd)
    AND (users."personId" IS DISTINCT FROM NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_link_user_on_nhan_khau_insert ON nhan_khau;
CREATE TRIGGER trg_link_user_on_nhan_khau_insert
AFTER INSERT OR UPDATE ON nhan_khau
FOR EACH ROW
EXECUTE FUNCTION trg_link_user_on_nhan_khau_insert();

COMMIT;


