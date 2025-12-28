-- Migration: Cập nhật bảng requests với cấu trúc mở rộng đầy đủ
-- Chạy file này để cập nhật database với cấu trúc requests mở rộng

BEGIN;

-- 0) Đảm bảo có createdAt / updatedAt (vì function generate_request_code dùng createdAt,
-- và trigger update_updated_at_column dùng updatedAt)
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 1) Thêm các cột mới vào bảng requests
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "targetHouseholdId" INTEGER,
ADD COLUMN IF NOT EXISTS "targetPersonId" INTEGER,
ADD COLUMN IF NOT EXISTS attachments JSONB,
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP;

-- 2) Thêm constraints foreign key (an toàn, có check tồn tại)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_requests_target_household'
  ) THEN
    ALTER TABLE requests
      ADD CONSTRAINT fk_requests_target_household
      FOREIGN KEY ("targetHouseholdId") REFERENCES ho_khau(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_requests_target_person'
  ) THEN
    ALTER TABLE requests
      ADD CONSTRAINT fk_requests_target_person
      FOREIGN KEY ("targetPersonId") REFERENCES nhan_khau(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_requests_reviewer'
  ) THEN
    ALTER TABLE requests
      ADD CONSTRAINT fk_requests_reviewer
      FOREIGN KEY ("reviewedBy") REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3) Cập nhật check constraint cho type (mở rộng đầy đủ)
ALTER TABLE requests
DROP CONSTRAINT IF EXISTS requests_type_check;

ALTER TABLE requests
ADD CONSTRAINT requests_type_check
CHECK (type IN (
  'ADD_PERSON',           -- Thêm nhân khẩu người lớn
  'ADD_NEWBORN',          -- Thêm trẻ sơ sinh
  'UPDATE_PERSON',        -- Sửa thông tin nhân khẩu
  'REMOVE_PERSON',        -- Xóa nhân khẩu (không xóa cứng)
  'CHANGE_HEAD',          -- Đổi chủ hộ
  'UPDATE_HOUSEHOLD',     -- Sửa thông tin hộ khẩu
  'SPLIT_HOUSEHOLD',      -- Tách hộ khẩu
  'TEMPORARY_RESIDENCE',  -- Tạm trú
  'TEMPORARY_ABSENCE',    -- Tạm vắng
  'MOVE_OUT',             -- Chuyển đi
  'DECEASED'              -- Khai tử
));

-- 4) Cập nhật check constraint cho status
ALTER TABLE requests
DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE requests
ADD CONSTRAINT requests_status_check
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

-- 5) Thêm indexes mới
CREATE INDEX IF NOT EXISTS idx_requests_target_household ON requests("targetHouseholdId");
CREATE INDEX IF NOT EXISTS idx_requests_target_person ON requests("targetPersonId");
CREATE INDEX IF NOT EXISTS idx_requests_priority ON requests(priority);
CREATE INDEX IF NOT EXISTS idx_requests_code ON requests(code);

-- 6) Function tạo mã đơn tự động (REQ-YYYY-NNNNNN)
CREATE OR REPLACE FUNCTION generate_request_code()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_part  TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

  SELECT LPAD(
    (COUNT(*) + 1)::TEXT,
    6,
    '0'
  )
  INTO seq_part
  FROM requests
  WHERE EXTRACT(YEAR FROM "createdAt") = EXTRACT(YEAR FROM CURRENT_DATE);

  NEW.code := 'REQ-' || year_part || '-' || seq_part;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7) Trigger tự động tạo code
DROP TRIGGER IF EXISTS trg_generate_request_code ON requests;
CREATE TRIGGER trg_generate_request_code
BEFORE INSERT ON requests
FOR EACH ROW
WHEN (NEW.code IS NULL)
EXECUTE FUNCTION generate_request_code();

-- 8) Function cập nhật updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9) Trigger cập nhật updatedAt
DROP TRIGGER IF EXISTS trg_requests_updated_at ON requests;
CREATE TRIGGER trg_requests_updated_at
BEFORE UPDATE ON requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;
