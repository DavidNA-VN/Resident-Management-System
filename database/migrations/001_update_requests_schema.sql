-- 1) Thêm cột (an toàn)
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "targetHouseholdId" INTEGER,
ADD COLUMN IF NOT EXISTS "targetPersonId" INTEGER,
ADD COLUMN IF NOT EXISTS attachments JSONB,
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP;

-- Nếu requests "cơ bản" chưa có createdAt / updatedAt thì nên bổ sung để trigger dùng được
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2) Foreign keys: phải dùng DO block (vì Postgres không có ADD CONSTRAINT IF NOT EXISTS)
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

-- 3) Check constraint: drop rồi add lại
ALTER TABLE requests
DROP CONSTRAINT IF EXISTS requests_type_check;

ALTER TABLE requests
ADD CONSTRAINT requests_type_check
CHECK (type IN (
  'ADD_PERSON',
  'ADD_NEWBORN',
  'UPDATE_PERSON',
  'REMOVE_PERSON',
  'CHANGE_HEAD',
  'UPDATE_HOUSEHOLD',
  'SPLIT_HOUSEHOLD',
  'TEMPORARY_RESIDENCE',
  'TEMPORARY_ABSENCE',
  'MOVE_OUT',
  'DECEASED'
));

ALTER TABLE requests
DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE requests
ADD CONSTRAINT requests_status_check
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_requests_target_household ON requests("targetHouseholdId");
CREATE INDEX IF NOT EXISTS idx_requests_target_person ON requests("targetPersonId");
CREATE INDEX IF NOT EXISTS idx_requests_priority ON requests(priority);
CREATE INDEX IF NOT EXISTS idx_requests_code ON requests(code);

-- 5) Function tạo mã đơn (REQ-YYYY-NNNNNN)
-- Lưu ý: cách COUNT(*)+1 có rủi ro trùng code khi insert đồng thời (concurrency)
-- Demo nhỏ thì OK; production nên dùng sequence.
CREATE OR REPLACE FUNCTION generate_request_code()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_part TEXT;
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

-- 6) Trigger tạo code
DROP TRIGGER IF EXISTS trg_generate_request_code ON requests;
CREATE TRIGGER trg_generate_request_code
BEFORE INSERT ON requests
FOR EACH ROW
WHEN (NEW.code IS NULL)
EXECUTE FUNCTION generate_request_code();

-- 7) Trigger updatedAt
DROP TRIGGER IF EXISTS trg_requests_updated_at ON requests;
CREATE TRIGGER trg_requests_updated_at
BEFORE UPDATE ON requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
