-- ============================================================
-- MERGED MIGRATION (000..008), EXCLUDING 009_tao_ho_khau.sql
--
-- This file concatenates the existing migrations in order so you
-- can run a single SQL file for fresh setup.
--
-- Included (in order):
--  - 000_initial_schema_postgresql.sql
--  - 001_update_requests_schema.sql
--  - 002_update_requests_schema_extended.sql
--  - 003_add_user_person_linking.sql
--  - 004_add_personid_to_users.sql
--  - 004_add_tamtru_tamvang_types.sql
--  - 005_add_attachments_to_tam_tru_vang.sql
--  - 005_add_ho_khau_sequence.sql
--  - 006_trigger_lich_su.sql
--  - 006_update_solanphananh (patched to reference users, not nguoi_dan)
--  - 007_add_ho_khau_history.sql
--  - 008_split_notes_minimal.sql
--
-- Not included by request:
--  - 009_tao_ho_khau.sql
-- ============================================================

-- ==================== 000_initial_schema_postgresql.sql ====================
-- ============================================
-- FULL SCHEMA (PostgreSQL) - Census Management
-- Case study TDP7 La Khê (scope 1 tuần, demo-friendly)
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Auto-update updatedAt column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1) USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'nguoi_dan'
        CHECK (role IN ('to_truong', 'to_pho', 'can_bo', 'nguoi_dan')),
    "fullName" VARCHAR(100) NOT NULL,
    cccd VARCHAR(12) UNIQUE,
    phone VARCHAR(10),
    email VARCHAR(100),
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_cccd ON users(cccd);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- ============================================
-- 2) HO_KHAU
-- chuHoId FK sang nhan_khau: cho NULL để tạo hộ trước
-- ============================================
-- ============================================
-- HO_KHAU (Sổ hộ khẩu)
-- - chuHoId nullable để hỗ trợ tách hộ/tạo hộ
-- - nhưng hộ active bắt buộc có chủ hộ (CHECK)
-- ============================================
CREATE TABLE IF NOT EXISTS ho_khau (
    id SERIAL PRIMARY KEY,

    "soHoKhau" VARCHAR(20) UNIQUE NOT NULL,

    -- bạn có thể giữ "diaChi" như mô tả tự do
    "diaChi" TEXT NOT NULL,
    -- địa chỉ chi tiết (phục vụ lọc/thống kê)
    "tinhThanh" VARCHAR(100),
    "quanHuyen" VARCHAR(100),
    "phuongXa" VARCHAR(100),
    "duongPho" VARCHAR(200),
    "soNha" VARCHAR(50),
    "diaChiDayDu" TEXT,
    -- Chủ hộ: sẽ add FK sau khi tạo nhan_khau
    "chuHoId" INTEGER NULL,
    "ngayCap" DATE,

    "trangThai" VARCHAR(20) DEFAULT 'inactive'
        CHECK ("trangThai" IN ('active', 'inactive', 'deleted')),

    -- Rule nghiệp vụ: hộ active phải có chủ hộ
    CONSTRAINT chk_active_household_has_head
        CHECK (("trangThai" <> 'active') OR ("chuHoId" IS NOT NULL)),

    "ghiChu" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ho_khau_so_ho_khau ON ho_khau("soHoKhau");
CREATE INDEX IF NOT EXISTS idx_ho_khau_chu_ho ON ho_khau("chuHoId");
CREATE INDEX IF NOT EXISTS idx_ho_khau_tinh_thanh ON ho_khau("tinhThanh");
CREATE INDEX IF NOT EXISTS idx_ho_khau_quan_huyen ON ho_khau("quanHuyen");
CREATE INDEX IF NOT EXISTS idx_ho_khau_phuong_xa ON ho_khau("phuongXa");
CREATE INDEX IF NOT EXISTS idx_ho_khau_trang_thai ON ho_khau("trangThai");




-- ============================================
-- 3) NHAN_KHAU
-- Thêm userId UNIQUE để link account -> nhân khẩu (dân xem hộ của mình)
-- ============================================
CREATE TABLE IF NOT EXISTS nhan_khau (
    id SERIAL PRIMARY KEY,

    "hoTen" VARCHAR(100) NOT NULL,
    "biDanh" VARCHAR(100),

    cccd VARCHAR(12) UNIQUE,
    "ngayCapCCCD" DATE,
    "noiCapCCCD" VARCHAR(100),

    "ngaySinh" DATE,
    "gioiTinh" VARCHAR(10) CHECK ("gioiTinh" IN ('nam', 'nu', 'khac')),
    "noiSinh" VARCHAR(100),
    "nguyenQuan" VARCHAR(100),
    "danToc" VARCHAR(50),
    "tonGiao" VARCHAR(50),
    "quocTich" VARCHAR(50) DEFAULT 'Việt Nam',

    "hoKhauId" INTEGER NOT NULL,
    "quanHe" VARCHAR(20) NOT NULL
        CHECK ("quanHe" IN ('chu_ho', 'vo_chong', 'con', 'cha_me', 'anh_chi_em', 'ong_ba', 'chau', 'khac')),

    "ngayDangKyThuongTru" DATE,
    "diaChiThuongTruTruoc" VARCHAR(200),

    "ngheNghiep" VARCHAR(100),
    "noiLamViec" VARCHAR(200),

    "ghiChu" TEXT,

    "trangThai" VARCHAR(20) DEFAULT 'active'
        CHECK ("trangThai" IN ('active', 'tam_vang', 'tam_tru', 'chuyen_di', 'khai_tu', 'deleted')),

    "userId" INTEGER UNIQUE, -- user<->nhan_khau (để dân chỉ xem đúng của mình)

    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_nhan_khau_ho_khau
        FOREIGN KEY ("hoKhauId") REFERENCES ho_khau(id) ON DELETE RESTRICT,
    CONSTRAINT fk_nhan_khau_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_nhan_khau_ho_ten ON nhan_khau("hoTen");
CREATE INDEX IF NOT EXISTS idx_nhan_khau_cccd ON nhan_khau(cccd);
CREATE INDEX IF NOT EXISTS idx_nhan_khau_ho_khau ON nhan_khau("hoKhauId");
CREATE INDEX IF NOT EXISTS idx_nhan_khau_trang_thai ON nhan_khau("trangThai");
CREATE INDEX IF NOT EXISTS idx_nhan_khau_user_id ON nhan_khau("userId");

-- Add FK for chủ hộ sau khi có nhan_khau
ALTER TABLE ho_khau
DROP CONSTRAINT IF EXISTS fk_ho_khau_chu_ho;

ALTER TABLE ho_khau
ADD CONSTRAINT fk_ho_khau_chu_ho
FOREIGN KEY ("chuHoId") REFERENCES nhan_khau(id) ON DELETE SET NULL;


CREATE OR REPLACE FUNCTION validate_chu_ho_belongs_to_household()
RETURNS TRIGGER AS $$
DECLARE
    v_ho_khau_id INTEGER;
BEGIN
    IF NEW."chuHoId" IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT "hoKhauId"
    INTO v_ho_khau_id
    FROM nhan_khau
    WHERE id = NEW."chuHoId";

    IF NOT FOUND THEN
        RAISE EXCEPTION '"chuHoId" does not exist in nhan_khau';
    END IF;

    IF v_ho_khau_id <> NEW.id THEN
        RAISE EXCEPTION '"chuHoId" must belong to the same ho_khau';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_chu_ho_belongs ON ho_khau;
CREATE TRIGGER trg_validate_chu_ho_belongs
BEFORE INSERT OR UPDATE OF "chuHoId" ON ho_khau
FOR EACH ROW
EXECUTE FUNCTION validate_chu_ho_belongs_to_household();



-- ============================================
-- 4) BIEN_DONG
-- ============================================
CREATE TABLE IF NOT EXISTS bien_dong (
    id SERIAL PRIMARY KEY,
    "nhanKhauId" INTEGER NOT NULL,
    loai VARCHAR(20) NOT NULL
        CHECK (loai IN ('chuyen_di', 'chuyen_den', 'khai_sinh', 'khai_tu', 'thay_doi_quan_he', 'thay_doi_thong_tin')),
    "ngayThucHien" DATE NOT NULL,
    "noiDung" TEXT,
    "diaChiCu" VARCHAR(200),
    "diaChiMoi" VARCHAR(200),
    "nguoiThucHien" INTEGER,
    "canBoXacNhan" INTEGER,
    "trangThai" VARCHAR(20) DEFAULT 'cho_duyet'
        CHECK ("trangThai" IN ('cho_duyet', 'da_duyet', 'tu_choi')),
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bien_dong_nhan_khau
        FOREIGN KEY ("nhanKhauId") REFERENCES nhan_khau(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bien_dong_nguoi_thuc_hien
        FOREIGN KEY ("nguoiThucHien") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bien_dong_can_bo
        FOREIGN KEY ("canBoXacNhan") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bien_dong_nhan_khau ON bien_dong("nhanKhauId");
CREATE INDEX IF NOT EXISTS idx_bien_dong_loai ON bien_dong(loai);
CREATE INDEX IF NOT EXISTS idx_bien_dong_trang_thai ON bien_dong("trangThai");
CREATE INDEX IF NOT EXISTS idx_bien_dong_ngay_thuc_hien ON bien_dong("ngayThucHien");


-- ============================================
-- 5) TAM_TRU_VANG
-- ============================================
CREATE TABLE IF NOT EXISTS tam_tru_vang (
    id SERIAL PRIMARY KEY,
    "nhanKhauId" INTEGER,
    loai VARCHAR(20) NOT NULL CHECK (loai IN ('tam_tru', 'tam_vang')),
    "tuNgay" DATE NOT NULL,
    "denNgay" DATE,
    "diaChi" VARCHAR(200),
    "lyDo" TEXT,
    "nguoiDangKy" INTEGER,
    "nguoiDuyet" INTEGER,
    "trangThai" VARCHAR(20) DEFAULT 'cho_duyet'
        CHECK ("trangThai" IN ('cho_duyet', 'da_duyet', 'dang_thuc_hien', 'ket_thuc', 'tu_choi')),
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tam_tru_vang_nhan_khau
        FOREIGN KEY ("nhanKhauId") REFERENCES nhan_khau(id) ON DELETE SET NULL,
    CONSTRAINT fk_tam_tru_vang_nguoi_dang_ky
        FOREIGN KEY ("nguoiDangKy") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tam_tru_vang_nguoi_duyet
        FOREIGN KEY ("nguoiDuyet") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tam_tru_vang_nhan_khau ON tam_tru_vang("nhanKhauId");
CREATE INDEX IF NOT EXISTS idx_tam_tru_vang_loai ON tam_tru_vang(loai);
CREATE INDEX IF NOT EXISTS idx_tam_tru_vang_trang_thai ON tam_tru_vang("trangThai");
CREATE INDEX IF NOT EXISTS idx_tam_tru_vang_tu_ngay ON tam_tru_vang("tuNgay");


-- ============================================
-- 6) PHAN_ANH
-- ============================================
CREATE TABLE IF NOT EXISTS phan_anh (
    id SERIAL PRIMARY KEY,
    "tieuDe" VARCHAR(200) NOT NULL,
    "noiDung" TEXT NOT NULL,
    "nguoiPhanAnh" INTEGER,
    loai VARCHAR(20) NOT NULL
        CHECK (loai IN ('co_so_ha_tang', 'moi_truong', 'an_ninh', 'y_te', 'giao_duc', 'khac')),
    "trangThai" VARCHAR(20) DEFAULT 'cho_xu_ly'
        CHECK ("trangThai" IN ('cho_xu_ly', 'dang_xu_ly', 'da_xu_ly', 'tu_choi')),
    "nguoiXuLy" INTEGER,
    "nguoiDuyet" INTEGER,
    "ketQuaXuLy" TEXT,
    "ngayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ngayXuLy" TIMESTAMP,
    "ngayDuyet" TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phan_anh_nguoi_phan_anh
        FOREIGN KEY ("nguoiPhanAnh") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_phan_anh_nguoi_xu_ly
        FOREIGN KEY ("nguoiXuLy") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_phan_anh_nguoi_duyet
        FOREIGN KEY ("nguoiDuyet") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_phan_anh_nguoi_phan_anh_user ON phan_anh("nguoiPhanAnh");
CREATE INDEX IF NOT EXISTS idx_phan_anh_loai ON phan_anh(loai);
CREATE INDEX IF NOT EXISTS idx_phan_anh_trang_thai ON phan_anh("trangThai");
CREATE INDEX IF NOT EXISTS idx_phan_anh_ngay_tao ON phan_anh("ngayTao");


-- ============================================
-- 7) PHAN_ANH_NGUOI
-- ============================================
CREATE TABLE IF NOT EXISTS phan_anh_nguoi (
    id SERIAL PRIMARY KEY,
    "phanAnhId" INTEGER NOT NULL,
    "nguoiPhanAnhId" INTEGER NOT NULL,
    "soLan" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phan_anh_nguoi_phan_anh
        FOREIGN KEY ("phanAnhId") REFERENCES phan_anh(id) ON DELETE CASCADE,
    CONSTRAINT fk_phan_anh_nguoi_user
        FOREIGN KEY ("nguoiPhanAnhId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_phan_anh_nguoi UNIQUE ("phanAnhId", "nguoiPhanAnhId")
);

CREATE INDEX IF NOT EXISTS idx_phan_anh_nguoi_phan_anh ON phan_anh_nguoi("phanAnhId");
CREATE INDEX IF NOT EXISTS idx_phan_anh_nguoi_user ON phan_anh_nguoi("nguoiPhanAnhId");


-- ============================================
-- 8) PHAN_CONG (Option 1 + thong_ke)
-- ============================================
CREATE TABLE IF NOT EXISTS phan_cong (
    id SERIAL PRIMARY KEY,
    "canBoId" INTEGER NOT NULL,
    "nghiepVu" VARCHAR(20) NOT NULL
        CHECK ("nghiepVu" IN ('ho_khau', 'nhan_khau', 'bien_dong', 'tam_tru_vang', 'phan_anh', 'thong_ke')),
    "moTa" TEXT,
    "nguoiPhanCong" INTEGER,
    "trangThai" VARCHAR(20) DEFAULT 'active' CHECK ("trangThai" IN ('active', 'inactive')),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phan_cong_can_bo FOREIGN KEY ("canBoId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_phan_cong_nguoi_phan_cong FOREIGN KEY ("nguoiPhanCong") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_phan_cong_can_bo ON phan_cong("canBoId");
CREATE INDEX IF NOT EXISTS idx_phan_cong_nghiep_vu ON phan_cong("nghiepVu");
CREATE INDEX IF NOT EXISTS idx_phan_cong_trang_thai ON phan_cong("trangThai");

CREATE UNIQUE INDEX IF NOT EXISTS uq_phan_cong_active
ON phan_cong("canBoId", "nghiepVu")
WHERE "trangThai" = 'active';

CREATE OR REPLACE FUNCTION validate_phan_cong_roles()
RETURNS TRIGGER AS $$
DECLARE
    v_role_canbo VARCHAR(20);
    v_role_assigner VARCHAR(20);
BEGIN
    SELECT role INTO v_role_canbo FROM users WHERE id = NEW."canBoId";
    IF v_role_canbo IS DISTINCT FROM 'can_bo' THEN
        RAISE EXCEPTION '"canBoId" must refer to a user with role=can_bo';
    END IF;

    IF NEW."nguoiPhanCong" IS NOT NULL THEN
        SELECT role INTO v_role_assigner FROM users WHERE id = NEW."nguoiPhanCong";
        IF v_role_assigner NOT IN ('to_truong', 'to_pho') THEN
            RAISE EXCEPTION '"nguoiPhanCong" must have role to_truong/to_pho';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_phan_cong_roles ON phan_cong;
CREATE TRIGGER trg_validate_phan_cong_roles
BEFORE INSERT OR UPDATE ON phan_cong
FOR EACH ROW EXECUTE FUNCTION validate_phan_cong_roles();


-- ============================================
-- 9) LICH_SU_THAY_DOI
-- ============================================
CREATE TABLE IF NOT EXISTS lich_su_thay_doi (
    id SERIAL PRIMARY KEY,
    bang VARCHAR(50) NOT NULL,
    "banGhiId" INTEGER NOT NULL,
    "hanhDong" VARCHAR(20) NOT NULL CHECK ("hanhDong" IN ('create', 'update', 'delete')),
    truong VARCHAR(50),
    "noiDungCu" TEXT,
    "noiDungMoi" TEXT,
    "nguoiThucHien" INTEGER,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lich_su_nguoi_thuc_hien FOREIGN KEY ("nguoiThucHien") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lich_su_bang ON lich_su_thay_doi(bang);
CREATE INDEX IF NOT EXISTS idx_lich_su_ban_ghi ON lich_su_thay_doi(bang, "banGhiId");
CREATE INDEX IF NOT EXISTS idx_lich_su_nguoi_thuc_hien ON lich_su_thay_doi("nguoiThucHien");
CREATE INDEX IF NOT EXISTS idx_lich_su_created_at ON lich_su_thay_doi("createdAt");

-- Trigger ghi nhận lịch sử tự động cho bảng nhan_khau
CREATE OR REPLACE FUNCTION log_nhan_khau_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id TEXT;
    v_old JSONB;
    v_new JSONB;
    v_key TEXT;
    v_old_val TEXT;
    v_new_val TEXT;
BEGIN
    -- Lấy userId từ session (SET LOCAL qua set_config), nếu không có sẽ để NULL
    BEGIN
        v_user_id := NULLIF(current_setting('app.user_id', true), '');
    EXCEPTION WHEN others THEN
        v_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO lich_su_thay_doi (bang, "banGhiId", "hanhDong", truong, "noiDungCu", "noiDungMoi", "nguoiThucHien")
        VALUES ('nhan_khau', NEW.id, 'create', NULL, NULL, row_to_json(NEW)::text, NULLIF(v_user_id, '')::INTEGER);
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
                    'nhan_khau',
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

DROP TRIGGER IF EXISTS trg_log_nhan_khau ON nhan_khau;
CREATE TRIGGER trg_log_nhan_khau
AFTER INSERT OR UPDATE ON nhan_khau
FOR EACH ROW
EXECUTE FUNCTION log_nhan_khau_changes();


-- ============================================
-- 10) NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,

    "type" VARCHAR(30) NOT NULL
        CHECK ("type" IN ('bien_dong', 'tam_tru_vang', 'phan_anh', 'yeu_cau', 'he_thong')),

    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,

    -- tham chiếu bản ghi liên quan (nếu có)
    "refTable" VARCHAR(50),
    "refId" INTEGER,

    "isRead" BOOLEAN DEFAULT FALSE,

    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,

    -- nếu đã set refTable thì phải có refId (và ngược lại)
    CONSTRAINT chk_notifications_ref_pair
        CHECK (
            ("refTable" IS NULL AND "refId" IS NULL)
            OR
            ("refTable" IS NOT NULL AND "refId" IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications("createdAt");

-- index “inbox” hay dùng: lấy noti của user, ưu tiên chưa đọc, mới nhất
CREATE INDEX IF NOT EXISTS idx_notifications_inbox
ON notifications("userId", "isRead", "createdAt");



-- ============================================
-- 11) YEU_CAU_THAY_DOI (dân gửi yêu cầu thay đổi -> quản lý xử lý)
-- ============================================
CREATE TABLE IF NOT EXISTS yeu_cau_thay_doi (
    id SERIAL PRIMARY KEY,

    "nguoiGuiId" INTEGER NOT NULL, -- user gửi (thường là nguoi_dan)
    "hoKhauId" INTEGER,
    "nhanKhauId" INTEGER,

    loai VARCHAR(30) NOT NULL CHECK (loai IN (
        'khai_sinh', 'khai_tu', 'chuyen_di', 'chuyen_den',
        'tam_tru', 'tam_vang', 'sua_thong_tin', 'khac'
    )),

    "tieuDe" VARCHAR(200),
    "noiDung" TEXT NOT NULL,
    "minhChungUrl" TEXT,

    "trangThai" VARCHAR(20) DEFAULT 'moi'
        CHECK ("trangThai" IN ('moi', 'dang_xu_ly', 'da_xu_ly', 'tu_choi')),

    "nguoiXuLyId" INTEGER, -- to_truong/to_pho/can_bo
    "phanHoi" TEXT,

    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_yc_nguoi_gui FOREIGN KEY ("nguoiGuiId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_yc_ho_khau FOREIGN KEY ("hoKhauId") REFERENCES ho_khau(id) ON DELETE SET NULL,
    CONSTRAINT fk_yc_nhan_khau FOREIGN KEY ("nhanKhauId") REFERENCES nhan_khau(id) ON DELETE SET NULL,
    CONSTRAINT fk_yc_nguoi_xu_ly FOREIGN KEY ("nguoiXuLyId") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_yc_trang_thai ON yeu_cau_thay_doi("trangThai");
CREATE INDEX IF NOT EXISTS idx_yc_loai ON yeu_cau_thay_doi(loai);
CREATE INDEX IF NOT EXISTS idx_yc_nguoi_gui ON yeu_cau_thay_doi("nguoiGuiId");
CREATE INDEX IF NOT EXISTS idx_yc_ho_khau ON yeu_cau_thay_doi("hoKhauId");


-- ============================================
-- 12) FUNCTIONS/TRIGGERS
-- ============================================

-- updatedAt helper
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updatedAt triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ho_khau_updated_at ON ho_khau;
CREATE TRIGGER update_ho_khau_updated_at
BEFORE UPDATE ON ho_khau
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nhan_khau_updated_at ON nhan_khau;
CREATE TRIGGER update_nhan_khau_updated_at
BEFORE UPDATE ON nhan_khau
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bien_dong_updated_at ON bien_dong;
CREATE TRIGGER update_bien_dong_updated_at
BEFORE UPDATE ON bien_dong
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tam_tru_vang_updated_at ON tam_tru_vang;
CREATE TRIGGER update_tam_tru_vang_updated_at
BEFORE UPDATE ON tam_tru_vang
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_phan_anh_updated_at ON phan_anh;
CREATE TRIGGER update_phan_anh_updated_at
BEFORE UPDATE ON phan_anh
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_phan_anh_nguoi_updated_at ON phan_anh_nguoi;
CREATE TRIGGER update_phan_anh_nguoi_updated_at
BEFORE UPDATE ON phan_anh_nguoi
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_phan_cong_updated_at ON phan_cong;
CREATE TRIGGER update_phan_cong_updated_at
BEFORE UPDATE ON phan_cong
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_yc_updated_at ON yeu_cau_thay_doi;
CREATE TRIGGER update_yc_updated_at
BEFORE UPDATE ON yeu_cau_thay_doi
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- diaChiDayDu helper
CREATE OR REPLACE FUNCTION update_dia_chi_day_du()
RETURNS TRIGGER AS $$
BEGIN
    NEW."diaChiDayDu" = TRIM(BOTH ', ' FROM CONCAT_WS(', ',
        NULLIF(NEW."soNha", ''),
        NULLIF(NEW."duongPho", ''),
        NULLIF(NEW."phuongXa", ''),
        NULLIF(NEW."quanHuyen", ''),
        NULLIF(NEW."tinhThanh", '')
    ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- diaChiDayDu triggers
DROP TRIGGER IF EXISTS trg_ho_khau_update_dia_chi_insert ON ho_khau;
CREATE TRIGGER trg_ho_khau_update_dia_chi_insert
BEFORE INSERT ON ho_khau
FOR EACH ROW
WHEN (NEW."diaChiDayDu" IS NULL OR NEW."diaChiDayDu" = '')
EXECUTE FUNCTION update_dia_chi_day_du();

DROP TRIGGER IF EXISTS trg_ho_khau_update_dia_chi_update ON ho_khau;
CREATE TRIGGER trg_ho_khau_update_dia_chi_update
BEFORE UPDATE ON ho_khau
FOR EACH ROW
WHEN (OLD."soNha" IS DISTINCT FROM NEW."soNha"
   OR OLD."duongPho" IS DISTINCT FROM NEW."duongPho"
   OR OLD."phuongXa" IS DISTINCT FROM NEW."phuongXa"
   OR OLD."quanHuyen" IS DISTINCT FROM NEW."quanHuyen"
   OR OLD."tinhThanh" IS DISTINCT FROM NEW."tinhThanh")
EXECUTE FUNCTION update_dia_chi_day_du();


-- ============================================
-- 13) VIEWS
-- ============================================

-- View thống kê địa chỉ (đúng + nhẹ)
CREATE OR REPLACE VIEW vw_thong_ke_dia_chi AS
SELECT
    hk."tinhThanh",
    hk."quanHuyen",
    hk."phuongXa",
    COUNT(DISTINCT hk.id) AS "soHoKhau",
    COUNT(DISTINCT hk."chuHoId") AS "soChuHo",
    COUNT(nk.id) FILTER (WHERE nk."trangThai" = 'active') AS "tongNhanKhau"
FROM ho_khau hk
LEFT JOIN nhan_khau nk ON nk."hoKhauId" = hk.id
WHERE hk."trangThai" = 'active'
GROUP BY hk."tinhThanh", hk."quanHuyen", hk."phuongXa";

-- View phản ánh chi tiết (gộp người phản ánh + số lần)
CREATE OR REPLACE VIEW vw_phan_anh_chi_tiet AS
SELECT
    pa.id,
    pa."tieuDe",
    pa."noiDung",
    pa.loai,
    pa."trangThai",
    pa."ngayTao",
    pa."nguoiXuLy",
    pa."nguoiDuyet",
    STRING_AGG(
        CONCAT(u."fullName", ' (', pan."soLan", ' lần)'),
        ', ' ORDER BY pan."createdAt"
    ) AS "danhSachNguoiPhanAnh",
    COUNT(DISTINCT pan."nguoiPhanAnhId") AS "soNguoiPhanAnh"
FROM phan_anh pa
LEFT JOIN phan_anh_nguoi pan ON pa.id = pan."phanAnhId"
LEFT JOIN users u ON pan."nguoiPhanAnhId" = u.id
GROUP BY
    pa.id, pa."tieuDe", pa."noiDung", pa.loai, pa."trangThai",
    pa."ngayTao", pa."nguoiXuLy", pa."nguoiDuyet";


-- ============================================
-- 14) TASK-BASED PERMISSIONS (TDP7 La Khê)
-- - Thêm cột users.task
-- - Ràng buộc chỉ cho 4 task code hợp lệ
-- - Seed một số user mẫu cho demo
-- ============================================

-- 14.1) Thêm cột task vào bảng users (nullable)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS task VARCHAR(30);

-- 14.2) Ràng buộc CHECK cho cột task
ALTER TABLE users
DROP CONSTRAINT IF EXISTS chk_users_task;

ALTER TABLE users
ADD CONSTRAINT chk_users_task
CHECK (
  task IS NULL
  OR task IN ('hokhau_nhankhau', 'tamtru_tamvang', 'thongke', 'kiennghi')
);

-- 14.4) Bảng REQUESTS (Đơn yêu cầu)
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,

    "requesterUserId" INTEGER NOT NULL,

    type VARCHAR(50) NOT NULL
        CHECK (type IN ('ADD_NEWBORN')),

    payload JSONB NOT NULL,

    status VARCHAR(20) DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),

    "rejectionReason" TEXT,

    "reviewedBy" INTEGER,
    "reviewedAt" TIMESTAMP,

    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_requests_requester
        FOREIGN KEY ("requesterUserId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_requests_reviewer
        FOREIGN KEY ("reviewedBy") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests("requesterUserId");
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests("createdAt");

-- 14.3) Seed / update user mẫu (idempotent theo username)
-- Lưu ý: password đang ở dạng plain text chỉ để demo

-- Tổ trưởng: full quyền, task = NULL
INSERT INTO users (username, password, role, "fullName", cccd, phone, email, "isActive")
VALUES ('totruong01', '123456', 'to_truong', 'Tổ trưởng TDP7 La Khê', '111111111111', '0900000001', 'totruong01@example.com', TRUE)
ON CONFLICT (username) DO UPDATE
SET role = EXCLUDED.role,
    password = EXCLUDED.password,
    "fullName" = EXCLUDED."fullName",
    task = NULL,
    "isActive" = TRUE;

-- Tổ phó: full quyền, task = NULL
INSERT INTO users (username, password, role, "fullName", cccd, phone, email, "isActive")
VALUES ('topho01', '123456', 'to_pho', 'Tổ phó TDP7 La Khê', '222222222222', '0900000002', 'topho01@example.com', TRUE)
ON CONFLICT (username) DO UPDATE
SET role = EXCLUDED.role,
    password = EXCLUDED.password,
    "fullName" = EXCLUDED."fullName",
    task = NULL,
    "isActive" = TRUE;

-- Cán bộ 1: phụ trách hộ khẩu/nhân khẩu
INSERT INTO users (username, password, role, "fullName", cccd, phone, email, task, "isActive")
VALUES ('canbo01', '123456', 'can_bo', 'Cán bộ HK/NK TDP7 La Khê', '333333333333', '0900000003', 'canbo01@example.com', 'hokhau_nhankhau', TRUE)
ON CONFLICT (username) DO UPDATE
SET role = EXCLUDED.role,
    password = EXCLUDED.password,
    "fullName" = EXCLUDED."fullName",
    task = 'hokhau_nhankhau',
    "isActive" = TRUE;

-- Cán bộ 2: phụ trách kiến nghị (KHÔNG được làm hộ khẩu/nhân khẩu)
INSERT INTO users (username, password, role, "fullName", cccd, phone, email, task, "isActive")
VALUES ('canbo02', '123456', 'can_bo', 'Cán bộ kiến nghị TDP7 La Khê', '444444444444', '0900000004', 'canbo02@example.com', 'kiennghi', TRUE)
ON CONFLICT (username) DO UPDATE
SET role = EXCLUDED.role,
    password = EXCLUDED.password,
    "fullName" = EXCLUDED."fullName",
    task = 'kiennghi',
    "isActive" = TRUE;

-- Người dân: không được tạo hộ khẩu / nhân khẩu
INSERT INTO users (username, password, role, "fullName", cccd, phone, email, "isActive")
VALUES ('nguoidan01', '123456', 'nguoi_dan', 'Người dân TDP7 La Khê', '555555555555', '0900000005', 'nguoidan01@example.com', TRUE)
ON CONFLICT (username) DO UPDATE
SET role = EXCLUDED.role,
    password = EXCLUDED.password,
    "fullName" = EXCLUDED."fullName",
    task = NULL,
    "isActive" = TRUE;


-- ==================== 001_update_requests_schema.sql ====================
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


-- ==================== 002_update_requests_schema_extended.sql ====================
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


-- ==================== 003_add_user_person_linking.sql ====================
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


-- ==================== 004_add_personid_to_users.sql ====================
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


-- ==================== 004_add_tamtru_tamvang_types.sql ====================
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
  'TAM_TRU',           -- Tạm trú
  'TAM_VANG',          -- Tạm vắng
  'MOVE_OUT',
  'DECEASED'
));

CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);


-- ==================== 005_add_attachments_to_tam_tru_vang.sql ====================
-- Add attachments support to tam_tru_vang table
ALTER TABLE tam_tru_vang
ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN tam_tru_vang.attachments IS 'Array of file attachments with metadata: [{id, name, originalName, mimeType, size, path, url, uploadedAt}]';


-- ==================== 005_add_ho_khau_sequence.sql ====================
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


-- ==================== 006_trigger_lich_su.sql ====================
-- Trigger ghi nhận lịch sử tự động cho bảng nhan_khau
CREATE OR REPLACE FUNCTION log_nhan_khau_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id TEXT;
    v_old JSONB;
    v_new JSONB;
    v_key TEXT;
    v_old_val TEXT;
    v_new_val TEXT;
BEGIN
    -- Lấy userId từ session (SET LOCAL qua set_config), nếu không có sẽ để NULL
    BEGIN
        v_user_id := NULLIF(current_setting('app.user_id', true), '');
    EXCEPTION WHEN others THEN
        v_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO lich_su_thay_doi (bang, "banGhiId", "hanhDong", truong, "noiDungCu", "noiDungMoi", "nguoiThucHien")
        VALUES ('nhan_khau', NEW.id, 'create', NULL, NULL, row_to_json(NEW)::text, NULLIF(v_user_id, '')::INTEGER);
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
                    'nhan_khau',
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

DROP TRIGGER IF EXISTS trg_log_nhan_khau ON nhan_khau;
CREATE TRIGGER trg_log_nhan_khau
AFTER INSERT OR UPDATE ON nhan_khau
FOR EACH ROW
EXECUTE FUNCTION log_nhan_khau_changes();


-- ==================== 006_update_solanphananh (patched) ====================
-- NOTE: Original file referenced table nguoi_dan which is not present in this schema.
-- This merged version keeps the intended schema update but references users.

ALTER TABLE phan_anh
  ADD COLUMN IF NOT EXISTS "soLanPhanAnh" INTEGER DEFAULT 1;

-- Ensure join table exists (already created in 000, but safe)
CREATE TABLE IF NOT EXISTS phan_anh_nguoi (
    id SERIAL PRIMARY KEY,
    "phanAnhId" INTEGER NOT NULL,
    "nguoiPhanAnhId" INTEGER NOT NULL,
    "soLan" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phan_anh_nguoi_phan_anh
        FOREIGN KEY ("phanAnhId") REFERENCES phan_anh(id) ON DELETE CASCADE,
    CONSTRAINT fk_phan_anh_nguoi_user
        FOREIGN KEY ("nguoiPhanAnhId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_phan_anh_nguoi UNIQUE ("phanAnhId", "nguoiPhanAnhId")
);

-- Backfill from legacy phan_anh."nguoiPhanAnh" if present
INSERT INTO phan_anh_nguoi ("phanAnhId", "nguoiPhanAnhId")
SELECT id, "nguoiPhanAnh"::int
FROM phan_anh
WHERE "nguoiPhanAnh" IS NOT NULL
ON CONFLICT DO NOTHING;


-- ==================== 007_add_ho_khau_history.sql ====================
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


-- ==================== 008_split_notes_minimal.sql ====================
-- 008_split_notes_minimal.sql
-- Minimal schema updates to reduce ambiguity between:
-- - Household member note vs. Person profile note
-- - Missing-ID reason vs. free-form note

ALTER TABLE nhan_khau
  ADD COLUMN IF NOT EXISTS "ghiChuHoKhau" TEXT,
  ADD COLUMN IF NOT EXISTS "lyDoKhongCoCCCD" TEXT;
