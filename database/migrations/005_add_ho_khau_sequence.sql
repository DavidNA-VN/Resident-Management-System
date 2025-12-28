-- Tự động sinh số hộ khẩu bằng sequence và đảm bảo duy nhất
-- Sequence dùng làm nguồn cấp số tăng dần: HK001, HK002, ...
CREATE SEQUENCE IF NOT EXISTS ho_khau_code_seq START 1;

-- Function tự sinh số hộ khẩu HKxxx
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

-- Đồng bộ sequence với giá trị lớn nhất hiện có (nếu đã có dữ liệu)
DO $$
DECLARE
  max_code INT;
BEGIN
  -- Tìm số cao nhất từ các soHoKhau hiện có dạng HKxxx
  SELECT COALESCE(MAX(substring("soHoKhau" from 3)::INTEGER), 0)
  INTO max_code
  FROM ho_khau
  WHERE "soHoKhau" LIKE 'HK%' AND length("soHoKhau") = 5;

  -- Nếu có dữ liệu cũ, set sequence về max_code + 1
  IF max_code > 0 THEN
    PERFORM setval('ho_khau_code_seq', max_code, true);
  END IF;
END $$;

-- Đảm bảo unique constraint có tên rõ ràng
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = current_schema()
      AND tc.table_name = 'ho_khau'
      AND tc.constraint_type = 'UNIQUE'
      AND ccu.column_name = 'soHoKhau'
  ) THEN
    ALTER TABLE ho_khau ADD CONSTRAINT uq_ho_khau_so UNIQUE ("soHoKhau");
  END IF;
END $$;
