-- ============================================
-- INITIAL SCHEMA: Tạo tất cả các bảng cơ bản (PostgreSQL)
-- Ngày: 2024
-- Mô tả: Tạo schema ban đầu cho hệ thống quản lý dân cư
-- ============================================

-- Tạo database (chạy riêng nếu chưa có)
-- CREATE DATABASE census_management;
-- \c census_management;

-- Tạo extension nếu cần
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng users (Người dùng hệ thống)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'nguoi_dan' CHECK (role IN ('to_truong', 'to_pho', 'can_bo', 'nguoi_dan')),
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

-- 2. Bảng ho_khau (Hộ khẩu)
CREATE TABLE IF NOT EXISTS ho_khau (
    id SERIAL PRIMARY KEY,
    "soHoKhau" VARCHAR(20) UNIQUE NOT NULL,
    "diaChi" TEXT NOT NULL,
    -- Địa chỉ chi tiết
    "tinhThanh" VARCHAR(100),
    "quanHuyen" VARCHAR(100),
    "phuongXa" VARCHAR(100),
    "duongPho" VARCHAR(200),
    "soNha" VARCHAR(50),
    "diaChiDayDu" TEXT,
    "chuHoId" INTEGER NOT NULL,
    "ngayCap" DATE,
    "trangThai" VARCHAR(20) DEFAULT 'active' CHECK ("trangThai" IN ('active', 'inactive', 'deleted')),
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

-- 3. Bảng nhan_khau (Nhân khẩu)
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
    "quanHe" VARCHAR(20) NOT NULL CHECK ("quanHe" IN ('chu_ho', 'vo_chong', 'con', 'cha_me', 'anh_chi_em', 'ong_ba', 'chau', 'khac')),
    "ngayDangKyThuongTru" DATE,
    "diaChiThuongTruTruoc" VARCHAR(200),
    "ngheNghiep" VARCHAR(100),
    "noiLamViec" VARCHAR(200),
    "trangThai" VARCHAR(20) DEFAULT 'active' CHECK ("trangThai" IN ('active', 'tam_vang', 'tam_tru', 'chuyen_di', 'khai_tu', 'deleted')),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nhan_khau_ho_khau FOREIGN KEY ("hoKhauId") REFERENCES ho_khau(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_nhan_khau_ho_ten ON nhan_khau("hoTen");
CREATE INDEX IF NOT EXISTS idx_nhan_khau_cccd ON nhan_khau(cccd);
CREATE INDEX IF NOT EXISTS idx_nhan_khau_ho_khau ON nhan_khau("hoKhauId");
CREATE INDEX IF NOT EXISTS idx_nhan_khau_trang_thai ON nhan_khau("trangThai");

-- 4. Bảng bien_dong (Biến động nhân khẩu)
CREATE TABLE IF NOT EXISTS bien_dong (
    id SERIAL PRIMARY KEY,
    "nhanKhauId" INTEGER NOT NULL,
    loai VARCHAR(20) NOT NULL CHECK (loai IN ('chuyen_di', 'chuyen_den', 'khai_sinh', 'khai_tu', 'thay_doi_quan_he', 'thay_doi_thong_tin')),
    "ngayThucHien" DATE NOT NULL,
    "noiDung" TEXT,
    "diaChiCu" VARCHAR(200),
    "diaChiMoi" VARCHAR(200),
    "nguoiThucHien" INTEGER,
    "canBoXacNhan" INTEGER,
    "trangThai" VARCHAR(20) DEFAULT 'cho_duyet' CHECK ("trangThai" IN ('cho_duyet', 'da_duyet', 'tu_choi')),
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bien_dong_nhan_khau FOREIGN KEY ("nhanKhauId") REFERENCES nhan_khau(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bien_dong_nguoi_thuc_hien FOREIGN KEY ("nguoiThucHien") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bien_dong_can_bo FOREIGN KEY ("canBoXacNhan") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bien_dong_nhan_khau ON bien_dong("nhanKhauId");
CREATE INDEX IF NOT EXISTS idx_bien_dong_loai ON bien_dong(loai);
CREATE INDEX IF NOT EXISTS idx_bien_dong_trang_thai ON bien_dong("trangThai");
CREATE INDEX IF NOT EXISTS idx_bien_dong_ngay_thuc_hien ON bien_dong("ngayThucHien");

-- 5. Bảng tam_tru_vang (Tạm trú/Tạm vắng)
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
    "trangThai" VARCHAR(20) DEFAULT 'cho_duyet' CHECK ("trangThai" IN ('cho_duyet', 'da_duyet', 'dang_thuc_hien', 'ket_thuc', 'tu_choi')),
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tam_tru_vang_nhan_khau FOREIGN KEY ("nhanKhauId") REFERENCES nhan_khau(id) ON DELETE SET NULL,
    CONSTRAINT fk_tam_tru_vang_nguoi_dang_ky FOREIGN KEY ("nguoiDangKy") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tam_tru_vang_nguoi_duyet FOREIGN KEY ("nguoiDuyet") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tam_tru_vang_nhan_khau ON tam_tru_vang("nhanKhauId");
CREATE INDEX IF NOT EXISTS idx_tam_tru_vang_loai ON tam_tru_vang(loai);
CREATE INDEX IF NOT EXISTS idx_tam_tru_vang_trang_thai ON tam_tru_vang("trangThai");
CREATE INDEX IF NOT EXISTS idx_tam_tru_vang_tu_ngay ON tam_tru_vang("tuNgay");

-- 6. Bảng phan_anh (Phản ánh kiến nghị)
CREATE TABLE IF NOT EXISTS phan_anh (
    id SERIAL PRIMARY KEY,
    "tieuDe" VARCHAR(200) NOT NULL,
    "noiDung" TEXT NOT NULL,
    "nguoiPhanAnh" INTEGER,
    loai VARCHAR(20) NOT NULL CHECK (loai IN ('co_so_ha_tang', 'moi_truong', 'an_ninh', 'y_te', 'giao_duc', 'khac')),
    "trangThai" VARCHAR(20) DEFAULT 'cho_xu_ly' CHECK ("trangThai" IN ('cho_xu_ly', 'dang_xu_ly', 'da_xu_ly', 'tu_choi')),
    "nguoiXuLy" INTEGER,
    "nguoiDuyet" INTEGER,
    "ketQuaXuLy" TEXT,
    "ngayTao" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ngayXuLy" TIMESTAMP,
    "ngayDuyet" TIMESTAMP,
    CONSTRAINT fk_phan_anh_nguoi_phan_anh FOREIGN KEY ("nguoiPhanAnh") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_phan_anh_nguoi_xu_ly FOREIGN KEY ("nguoiXuLy") REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_phan_anh_nguoi_duyet FOREIGN KEY ("nguoiDuyet") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_phan_anh_nguoi_phan_anh ON phan_anh("nguoiPhanAnh");
CREATE INDEX IF NOT EXISTS idx_phan_anh_loai ON phan_anh(loai);
CREATE INDEX IF NOT EXISTS idx_phan_anh_trang_thai ON phan_anh("trangThai");
CREATE INDEX IF NOT EXISTS idx_phan_anh_ngay_tao ON phan_anh("ngayTao");

-- 7. Bảng phan_anh_nguoi (Nhiều người phản ánh cùng một kiến nghị)
CREATE TABLE IF NOT EXISTS phan_anh_nguoi (
    id SERIAL PRIMARY KEY,
    "phanAnhId" INTEGER NOT NULL,
    "nguoiPhanAnhId" INTEGER NOT NULL,
    "soLan" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_phan_anh_nguoi_phan_anh FOREIGN KEY ("phanAnhId") REFERENCES phan_anh(id) ON DELETE CASCADE,
    CONSTRAINT fk_phan_anh_nguoi_user FOREIGN KEY ("nguoiPhanAnhId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_phan_anh_nguoi UNIQUE ("phanAnhId", "nguoiPhanAnhId")
);

CREATE INDEX IF NOT EXISTS idx_phan_anh_nguoi_phan_anh ON phan_anh_nguoi("phanAnhId");
CREATE INDEX IF NOT EXISTS idx_phan_anh_nguoi_user ON phan_anh_nguoi("nguoiPhanAnhId");

-- 8. Bảng phan_cong (Phân công cán bộ)
CREATE TABLE IF NOT EXISTS phan_cong (
    id SERIAL PRIMARY KEY,
    "canBoId" INTEGER NOT NULL,
    "nghiepVu" VARCHAR(20) NOT NULL CHECK ("nghiepVu" IN ('ho_khau', 'nhan_khau', 'bien_dong', 'tam_tru_vang', 'phan_anh')),
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

-- 9. Bảng lich_su_thay_doi (Lịch sử thay đổi)
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

-- 10. Function để tự động cập nhật updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers để tự động cập nhật updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ho_khau_updated_at BEFORE UPDATE ON ho_khau
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nhan_khau_updated_at BEFORE UPDATE ON nhan_khau
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tam_tru_vang_updated_at BEFORE UPDATE ON tam_tru_vang
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phan_anh_nguoi_updated_at BEFORE UPDATE ON phan_anh_nguoi
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phan_cong_updated_at BEFORE UPDATE ON phan_cong
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Function để tự động tạo địa chỉ đầy đủ
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
$$ language 'plpgsql';

-- Triggers để tự động tạo địa chỉ đầy đủ
CREATE TRIGGER trg_ho_khau_update_dia_chi_insert
    BEFORE INSERT ON ho_khau
    FOR EACH ROW
    WHEN (NEW."diaChiDayDu" IS NULL OR NEW."diaChiDayDu" = '')
    EXECUTE FUNCTION update_dia_chi_day_du();

CREATE TRIGGER trg_ho_khau_update_dia_chi_update
    BEFORE UPDATE ON ho_khau
    FOR EACH ROW
    WHEN (OLD."soNha" IS DISTINCT FROM NEW."soNha" OR 
          OLD."duongPho" IS DISTINCT FROM NEW."duongPho" OR 
          OLD."phuongXa" IS DISTINCT FROM NEW."phuongXa" OR 
          OLD."quanHuyen" IS DISTINCT FROM NEW."quanHuyen" OR 
          OLD."tinhThanh" IS DISTINCT FROM NEW."tinhThanh")
    EXECUTE FUNCTION update_dia_chi_day_du();

-- 12. Views cho thống kê
CREATE OR REPLACE VIEW vw_thong_ke_dia_chi AS
SELECT 
    "tinhThanh",
    "quanHuyen",
    "phuongXa",
    COUNT(*) as "soHoKhau",
    COUNT(DISTINCT "chuHoId") as "soChuHo",
    COALESCE(SUM((
        SELECT COUNT(*) 
        FROM nhan_khau 
        WHERE "hoKhauId" = ho_khau.id AND "trangThai" = 'active'
    )), 0) as "tongNhanKhau"
FROM ho_khau
WHERE "trangThai" = 'active'
GROUP BY "tinhThanh", "quanHuyen", "phuongXa";

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
    ) as "danhSachNguoiPhanAnh",
    COUNT(DISTINCT pan."nguoiPhanAnhId") as "soNguoiPhanAnh"
FROM phan_anh pa
LEFT JOIN phan_anh_nguoi pan ON pa.id = pan."phanAnhId"
LEFT JOIN users u ON pan."nguoiPhanAnhId" = u.id
GROUP BY pa.id, pa."tieuDe", pa."noiDung", pa.loai, pa."trangThai", pa."ngayTao", pa."nguoiXuLy", pa."nguoiDuyet";

