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
CREATE UNIQUE INDEX IF NOT EXISTS uq_nhan_khau_chu_ho_moi_ho
ON nhan_khau("hoKhauId")
WHERE "quanHe" = 'chu_ho';

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

