-- Ghi nhận lịch sử thay đổi cho bảng ho_khau vào bảng lich_su_thay_doi
-- Sử dụng cùng cấu trúc như log_nhan_khau_changes nhưng áp dụng cho ho_khau

CREATE OR REPLACE FUNCTION log_ho_khau_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id TEXT;
    v_old JSONB;
    v_new JSONB;
    v_key TEXT;
    v_old_val TEXT;
    v_new_val TEXT;
BEGIN
    -- Lấy userId từ session (SET LOCAL app.user_id), nếu không có thì NULL
    BEGIN
        v_user_id := NULLIF(current_setting('app.user_id', true), '');
    EXCEPTION WHEN others THEN
        v_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO lich_su_thay_doi (bang, "banGhiId", "hanhDong", truong, "noiDungCu", "noiDungMoi", "nguoiThucHien")
        VALUES ('ho_khau', NEW.id, 'create', NULL, NULL, row_to_json(NEW)::text, NULLIF(v_user_id, '')::INTEGER);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);

        FOR v_key IN
            SELECT jsonb_object_keys(v_old || v_new)
        LOOP
            -- Bỏ qua các trường hệ thống
            IF v_key IN ('id', 'createdAt', 'updatedAt') THEN
                CONTINUE;
            END IF;

            v_old_val := v_old ->> v_key;
            v_new_val := v_new ->> v_key;

            IF v_old_val IS DISTINCT FROM v_new_val THEN
                INSERT INTO lich_su_thay_doi (bang, "banGhiId", "hanhDong", truong, "noiDungCu", "noiDungMoi", "nguoiThucHien")
                VALUES (
                    'ho_khau',
                    NEW.id,
                    'update',
                    v_key,
                    v_old_val,
                    v_new_val,
                    NULLIF(v_user_id, '')::INTEGER
                );
            END IF;
        END LOOP;

        RETURN NEW;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_ho_khau ON ho_khau;
CREATE TRIGGER trg_log_ho_khau
AFTER INSERT OR UPDATE ON ho_khau
FOR EACH ROW
EXECUTE FUNCTION log_ho_khau_changes();
