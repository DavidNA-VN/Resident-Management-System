-- Migration: Tự động sinh số hộ khẩu HKxxx
-- Đảm bảo không trùng và tăng dần

BEGIN;

-- 1) Tạo sequence cho số hộ khẩu (bắt đầu từ 1)
CREATE SEQUENCE IF NOT EXISTS ho_khau_code_seq START 1;

-- 2) Thêm unique constraint cho soHoKhau (nếu chưa có)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_ho_khau_so'
  ) THEN
    ALTER TABLE ho_khau ADD CONSTRAINT uq_ho_khau_so UNIQUE ("soHoKhau");
  END IF;
END $$;

-- 3) Function tự sinh số hộ khẩu HKxxx
CREATE OR REPLACE FUNCTION generate_ho_khau_code()
RETURNS TEXT AS $$
DECLARE
  code_number INTEGER;
  so_ho_khau TEXT;
BEGIN
  -- Lấy next value từ sequence
  code_number := nextval('ho_khau_code_seq');

  -- Format thành HKxxx (3 chữ số)
  so_ho_khau := 'HK' || LPAD(code_number::TEXT, 3, '0');

  RETURN so_ho_khau;
END;
$$ LANGUAGE plpgsql;

-- 4) Nếu DB đã có dữ liệu cũ, sync sequence về đúng vị trí
-- Tìm số cao nhất hiện có
DO $$
DECLARE
  max_existing INTEGER;
  max_code INTEGER;
BEGIN
  -- Tìm số cao nhất từ các soHoKhau hiện có dạng HKxxx
  SELECT MAX(substring("soHoKhau" from 3)::INTEGER)
  INTO max_existing
  FROM ho_khau
  WHERE "soHoKhau" LIKE 'HK%' AND length("soHoKhau") = 5;

  -- Nếu có dữ liệu cũ, set sequence >= max + 1
  IF max_existing IS NOT NULL THEN
    -- Set sequence về max_existing, next call sẽ trả max_existing + 1
    PERFORM setval('ho_khau_code_seq', max_existing, true);
    RAISE NOTICE 'Synced ho_khau_code_seq to: %', max_existing;
  ELSE
    RAISE NOTICE 'No existing HK codes found, sequence starts from 1';
  END IF;
END $$;

COMMIT;
