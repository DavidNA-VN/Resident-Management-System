-- Migration: Cập nhật bảng requests với cấu trúc mở rộng đầy đủ
-- Chạy file này để cập nhật database với cấu trúc requests mở rộng

-- Thêm các cột mới vào bảng requests
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS code VARCHAR(50),
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "targetHouseholdId" INTEGER,
ADD COLUMN IF NOT EXISTS "targetPersonId" INTEGER,
ADD COLUMN IF NOT EXISTS attachments JSONB,
ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP;

-- Thêm constraints foreign key
ALTER TABLE requests
ADD CONSTRAINT IF NOT EXISTS fk_requests_target_household
FOREIGN KEY ("targetHouseholdId") REFERENCES ho_khau(id) ON DELETE SET NULL,
ADD CONSTRAINT IF NOT EXISTS fk_requests_target_person
FOREIGN KEY ("targetPersonId") REFERENCES nhan_khau(id) ON DELETE SET NULL,
ADD CONSTRAINT IF NOT EXISTS fk_requests_reviewer
FOREIGN KEY ("reviewedBy") REFERENCES users(id) ON DELETE SET NULL;

-- Cập nhật check constraint cho type (mở rộng đầy đủ)
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

-- Cập nhật check constraint cho status
ALTER TABLE requests
DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE requests
ADD CONSTRAINT requests_status_check
CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

-- Thêm indexes mới
CREATE INDEX IF NOT EXISTS idx_requests_target_household ON requests("targetHouseholdId");
CREATE INDEX IF NOT EXISTS idx_requests_target_person ON requests("targetPersonId");
CREATE INDEX IF NOT EXISTS idx_requests_priority ON requests(priority);
CREATE INDEX IF NOT EXISTS idx_requests_code ON requests(code);

-- Function tạo mã đơn tự động (REQ-YYYY-NNNN)
CREATE OR REPLACE FUNCTION generate_request_code()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    seq_part TEXT;
BEGIN
    -- Lấy năm hiện tại
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

    -- Tạo sequence number trong năm (có thể reset hàng năm)
    SELECT LPAD(COALESCE(
        (SELECT COUNT(*) + 1 FROM requests
         WHERE EXTRACT(YEAR FROM "createdAt") = EXTRACT(YEAR FROM CURRENT_DATE))::TEXT,
        '1'), 6, '0')
    INTO seq_part;

    NEW.code := 'REQ-' || year_part || '-' || seq_part;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger tự động tạo code
DROP TRIGGER IF EXISTS trg_generate_request_code ON requests;
CREATE TRIGGER trg_generate_request_code
BEFORE INSERT ON requests
FOR EACH ROW
WHEN (NEW.code IS NULL)
EXECUTE FUNCTION generate_request_code();

-- Function cập nhật updated_at (nếu chưa có)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger cập nhật updatedAt
DROP TRIGGER IF EXISTS trg_requests_updated_at ON requests;
CREATE TRIGGER trg_requests_updated_at
BEFORE UPDATE ON requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Cập nhật dữ liệu mẫu (nếu cần)
-- Có thể thêm dữ liệu seed ở đây nếu muốn

COMMIT;
