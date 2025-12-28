# Cập nhật Schema Database.

## 📋 Tổng quan các thay đổi

### ✅ Đánh giá và Nhận xét

Các thay đổi bạn đề xuất là **rất hợp lý và cần thiết**:

1. ✅ **Thêm fields cho nhan_khau**: Bổ sung thông tin quan trọng về CCCD và lịch sử thường trú
2. ✅ **Bảng phụ phan_anh_nguoi**: Giải quyết bài toán nhiều người cùng phản ánh một vấn đề
3. ✅ **Tách địa chỉ chi tiết**: Hỗ trợ thống kê và tìm kiếm tốt hơn

---

## 1. Thêm fields cho `nhan_khau`

### Lý do:
- **biDanh**: Cần thiết cho một số trường hợp đặc biệt
- **ngayCapCCCD, noiCapCCCD**: Thông tin quan trọng để xác minh CCCD
- **ngayDangKyThuongTru**: Theo dõi lịch sử đăng ký
- **diaChiThuongTruTruoc**: Quan trọng cho biến động nhân khẩu

### SQL Migration:
```sql
ALTER TABLE nhan_khau
    ADD COLUMN biDanh VARCHAR(100) NULL,
    ADD COLUMN ngayCapCCCD DATE NULL,
    ADD COLUMN noiCapCCCD VARCHAR(100) NULL,
    ADD COLUMN ngayDangKyThuongTru DATE NULL,
    ADD COLUMN diaChiThuongTruTruoc VARCHAR(200) NULL;
```

### ✅ Đánh giá: **Rất tốt** - Bổ sung đầy đủ thông tin cần thiết

---

## 2. Bảng phụ `phan_anh_nguoi`

### Lý do:
- Cho phép nhiều người cùng phản ánh một vấn đề
- Theo dõi số lần mỗi người phản ánh
- Hỗ trợ thống kê: "Vấn đề này được bao nhiêu người quan tâm?"

### Cải tiến đề xuất:
```sql
CREATE TABLE phan_anh_nguoi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phanAnhId INT NOT NULL,
    nguoiPhanAnhId INT NOT NULL,
    soLan INT DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (phanAnhId) REFERENCES phan_anh(id) ON DELETE CASCADE,
    FOREIGN KEY (nguoiPhanAnhId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_phan_anh_nguoi (phanAnhId, nguoiPhanAnhId), -- Tránh duplicate
    INDEX idx_phan_anh (phanAnhId),
    INDEX idx_nguoi_phan_anh (nguoiPhanAnhId)
);
```

### Logic xử lý:
- Khi người dùng phản ánh, kiểm tra đã tồn tại chưa:
  - Nếu chưa: Tạo mới với `soLan = 1`
  - Nếu rồi: Tăng `soLan` lên 1
- API: `POST /api/phan-anh/:id/dong-y` - Đồng ý với phản ánh này

### ✅ Đánh giá: **Xuất sắc** - Giải quyết bài toán thực tế

---

## 3. Tách địa chỉ chi tiết trong `ho_khau`

### Lý do:
- **Thống kê theo địa chỉ**: Số hộ khẩu theo phường/quận
- **Tìm kiếm tốt hơn**: Tìm theo đường phố, số nhà
- **Báo cáo chi tiết**: Xuất báo cáo theo từng khu vực

### Schema đề xuất:
```sql
ALTER TABLE ho_khau
    ADD COLUMN tinhThanh VARCHAR(100) NULL COMMENT 'Tỉnh/Thành phố',
    ADD COLUMN quanHuyen VARCHAR(100) NULL COMMENT 'Quận/Huyện',
    ADD COLUMN phuongXa VARCHAR(100) NULL COMMENT 'Phường/Xã',
    ADD COLUMN duongPho VARCHAR(200) NULL COMMENT 'Đường/Phố',
    ADD COLUMN soNha VARCHAR(50) NULL COMMENT 'Số nhà',
    ADD COLUMN diaChiDayDu TEXT NULL COMMENT 'Địa chỉ đầy đủ (auto-generated)';
```

### Cách xử lý:
1. **Giữ lại `diaChi` cũ** để backward compatibility
2. **Tự động tạo `diaChiDayDu`** từ các trường chi tiết bằng trigger
3. **Cho phép nhập cả 2 cách**:
   - Cách 1: Nhập địa chỉ đầy đủ vào `diaChi` (như cũ)
   - Cách 2: Nhập từng phần → tự động tạo `diaChiDayDu`

### Trigger tự động:
```sql
-- Tự động tạo địa chỉ đầy đủ từ các trường chi tiết
CREATE TRIGGER trg_ho_khau_update_dia_chi
BEFORE INSERT ON ho_khau
FOR EACH ROW
BEGIN
    SET NEW.diaChiDayDu = CONCAT_WS(', ',
        IFNULL(NEW.soNha, ''),
        IFNULL(NEW.duongPho, ''),
        IFNULL(NEW.phuongXa, ''),
        IFNULL(NEW.quanHuyen, ''),
        IFNULL(NEW.tinhThanh, '')
    );
END;
```

### View thống kê:
```sql
CREATE VIEW vw_thong_ke_dia_chi AS
SELECT 
    tinhThanh,
    quanHuyen,
    phuongXa,
    COUNT(*) as soHoKhau,
    SUM((SELECT COUNT(*) FROM nhan_khau WHERE hoKhauId = ho_khau.id)) as tongNhanKhau
FROM ho_khau
WHERE trangThai = 'active'
GROUP BY tinhThanh, quanHuyen, phuongXa;
```

### ✅ Đánh giá: **Rất tốt** - Hỗ trợ thống kê và báo cáo tốt hơn nhiều

---

## 4. Cập nhật API cần thiết

### API mới cho phan_anh_nguoi:
```
POST   /api/phan-anh/:id/dong-y        - Đồng ý với phản ánh (tăng soLan)
DELETE /api/phan-anh/:id/dong-y        - Hủy đồng ý
GET    /api/phan-anh/:id/nguoi-phan-anh - Danh sách người phản ánh
```

### API thống kê địa chỉ:
```
GET    /api/thong-ke/dia-chi           - Thống kê theo địa chỉ
GET    /api/thong-ke/dia-chi/phuong    - Thống kê theo phường
GET    /api/thong-ke/dia-chi/quan      - Thống kê theo quận
```

---

## 5. Migration Strategy

### Bước 1: Backup database
```bash
mysqldump -u root -p census_management > backup_before_migration.sql
```

### Bước 2: Chạy migration
```bash
mysql -u root -p census_management < database/migrations/001_update_schema.sql
```

### Bước 3: Migrate dữ liệu cũ (nếu có)
- Parse `diaChi` cũ để điền vào các trường mới (nếu có thể)
- Hoặc để NULL và nhập lại dần

### Bước 4: Cập nhật code
- Cập nhật models/entities
- Cập nhật API endpoints
- Cập nhật frontend forms

---

## 6. Lưu ý quan trọng

### ⚠️ Backward Compatibility:
- Giữ lại `diaChi` cũ để không break code hiện tại
- `nguoiPhanAnh` trong `phan_anh` vẫn giữ để tương thích

### ⚠️ Data Migration:
- Cần script để migrate dữ liệu cũ (nếu có)
- Parse địa chỉ cũ thành các trường mới (có thể dùng regex hoặc manual)

### ⚠️ Validation:
- Validate các trường mới khi nhập
- Đảm bảo tính nhất quán dữ liệu

---

## 7. Kết luận

### ✅ Tất cả các thay đổi đều **RẤT TỐT** và **CẦN THIẾT**

1. ✅ Bổ sung thông tin đầy đủ hơn cho nhân khẩu
2. ✅ Giải quyết bài toán nhiều người phản ánh
3. ✅ Hỗ trợ thống kê và báo cáo tốt hơn

### 📝 Next Steps:
1. Review và approve migration script
2. Test trên database dev
3. Cập nhật code backend
4. Cập nhật code frontend
5. Deploy lên production

