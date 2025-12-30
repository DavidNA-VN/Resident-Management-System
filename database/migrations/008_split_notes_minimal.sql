-- 008_split_notes_minimal.sql
-- Minimal schema updates to reduce ambiguity between:
-- - Household member note vs. Person profile note
-- - Missing-ID reason vs. free-form note

ALTER TABLE nhan_khau
  ADD COLUMN IF NOT EXISTS "ghiChuHoKhau" TEXT,
  ADD COLUMN IF NOT EXISTS "lyDoKhongCoCCCD" TEXT;
