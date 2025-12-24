# Kế hoạch phát triển hệ thống Quản lý Dân cư - Tổ dân phố 7, Phường La Khê

## 📋 MỤC LỤC
1. [Phân tích nghiệp vụ](#1-phân-tích-nghiệp-vụ)
2. [Thiết kế Database](#2-thiết-kế-database)
3. [Thiết kế API](#3-thiết-kế-api)
4. [Logic Backend](#4-logic-backend)
5. [Các bước triển khai](#5-các-bước-triển-khai)

---

## 1. PHÂN TÍCH NGHIỆP VỤ

### 1.1. Các chức năng chính

#### A. Quản lý Hộ khẩu
- **Thêm mới hộ khẩu**: Ghi nhận hộ khẩu mới với chủ hộ
- **Cập nhật thông tin**: Sửa đổi thông tin hộ khẩu (địa chỉ, chủ hộ, v.v.)
- **Xóa hộ khẩu**: Chỉ khi không còn nhân khẩu nào
- **Tìm kiếm**: Theo số hộ khẩu, địa chỉ, tên chủ hộ, CCCD

#### B. Quản lý Nhân khẩu
- **Thêm nhân khẩu**: Thêm người vào hộ khẩu (quan hệ với chủ hộ)
- **Cập nhật**: Sửa thông tin cá nhân
- **Xóa**: Chuyển trạng thái (không xóa vật lý)
- **Tìm kiếm**: Theo tên, CCCD, số hộ khẩu

#### C. Biến động Nhân khẩu
- **Chuyển đi**: Ghi nhận khi nhân khẩu chuyển đi nơi khác
- **Chuyển đến**: Ghi nhận khi nhân khẩu từ nơi khác chuyển đến
- **Khai sinh**: Thêm trẻ em mới sinh
- **Khai tử**: Ghi nhận người qua đời
- **Thay đổi quan hệ**: Thay đổi quan hệ với chủ hộ
- **Lịch sử**: Lưu toàn bộ lịch sử biến động

#### D. Tạm trú / Tạm vắng
- **Đăng ký tạm trú**: Người từ nơi khác đến tạm trú
- **Đăng ký tạm vắng**: Người trong hộ khẩu đi tạm vắng
- **Gia hạn**: Gia hạn thời gian tạm trú/vắng
- **Kết thúc**: Kết thúc tạm trú/vắng
- **Thống kê**: Số lượng tạm trú/vắng theo thời gian

#### E. Phản ánh Kiến nghị
- **Tạo phản ánh**: Người dân hoặc cán bộ tạo phản ánh
- **Phân công xử lý**: Tổ trưởng phân công cán bộ xử lý
- **Xử lý**: Cán bộ cập nhật tiến độ xử lý
- **Duyệt**: Tổ trưởng duyệt kết quả xử lý
- **Trạng thái**: Chờ xử lý, Đang xử lý, Đã xử lý, Từ chối
- **Tìm kiếm**: Theo trạng thái, người phản ánh, thời gian

#### F. Phân quyền
- **Tổ trưởng/Tổ phó**: Toàn quyền (CRUD tất cả)
- **Cán bộ phụ trách**: Chỉ được thao tác trên nghiệp vụ được phân công
- **Người dân**: Chỉ xem thông tin của mình, tạo phản ánh

#### G. Thống kê và Báo cáo
- **Thống kê tổng quan**: Số hộ khẩu, nhân khẩu, biến động
- **Báo cáo theo thời gian**: Tháng, quý, năm
- **Xuất báo cáo**: PDF, Excel

---

## 2. THIẾT KẾ DATABASE

### 2.1. Sơ đồ ERD (Entity Relationship Diagram)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Users     │         │  HoKhau     │         │  NhanKhau   │
├─────────────┤         ├─────────────┤         ├─────────────┤
│ id (PK)     │         │ id (PK)     │◄──┐     │ id (PK)     │
│ username    │         │ soHoKhau    │   │     │ hoTen       │
│ password    │         │ diaChi      │   │     │ cccd        │
│ role        │         │ chuHoId (FK)│   │     │ ngaySinh    │
│ fullName    │         │ ngayCap     │   │     │ gioiTinh    │
│ cccd        │         │ trangThai   │   │     │ hoKhauId(FK)│
│ phone       │         └─────────────┘   │     │ quanHe      │
│ createdAt   │                           │     │ trangThai   │
└─────────────┘                           │     └─────────────┘
                                          │
┌─────────────┐         ┌─────────────┐ │     ┌─────────────┐
│ BienDong    │         │ TamTruVang  │ │     │ PhanAnh     │
├─────────────┤         ├─────────────┤ │     ├─────────────┤
│ id (PK)     │         │ id (PK)     │ │     │ id (PK)     │
│ nhanKhauId  │         │ nhanKhauId  │ │     │ tieuDe      │
│ loai        │         │ loai        │ │     │ noiDung     │
│ ngayThucHien│         │ tuNgay      │ │     │ nguoiPhanAnh│
│ noiDung     │         │ denNgay     │ │     │ trangThai   │
│ nguoiThucHien│        │ diaChi      │ │     │ nguoiXuLy   │
│ createdAt   │         │ lyDo        │ │     │ ngayTao     │
└─────────────┘         │ trangThai   │ │     │ ngayXuLy    │
                        └─────────────┘ │     └─────────────┘
                                       │
                        ┌─────────────┐ │
                        │ LichSuThayDoi│
                        ├─────────────┤
                        │ id (PK)     │
                        │ bang        │
                        │ banGhiId    │
                        │ hanhDong    │
                        │ noiDungCu   │
                        │ noiDungMoi  │
                        │ nguoiThucHien│
                        │ createdAt   │
                        └─────────────┘
```

### 2.2. Chi tiết các bảng

#### **2.2.1. Bảng `users` (Người dùng hệ thống)**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Hashed
    role ENUM('to_truong', 'to_pho', 'can_bo', 'nguoi_dan') NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    cccd VARCHAR(12) UNIQUE,
    phone VARCHAR(10),
    email VARCHAR(100),
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **2.2.2. Bảng `ho_khau` (Hộ khẩu)**
```sql
CREATE TABLE ho_khau (
    id INT PRIMARY KEY AUTO_INCREMENT,
    soHoKhau VARCHAR(20) UNIQUE NOT NULL,
    diaChi TEXT NOT NULL, -- Giữ lại để backward compatibility
    -- Địa chỉ chi tiết (để thống kê)
    tinhThanh VARCHAR(100) NULL,
    quanHuyen VARCHAR(100) NULL,
    phuongXa VARCHAR(100) NULL,
    duongPho VARCHAR(200) NULL,
    soNha VARCHAR(50) NULL,
    diaChiDayDu TEXT NULL, -- Tự động tạo từ các trường trên
    chuHoId INT NOT NULL, -- FK to nhan_khau
    ngayCap DATE,
    trangThai ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
    ghiChu TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chuHoId) REFERENCES nhan_khau(id),
    INDEX idx_tinh_thanh (tinhThanh),
    INDEX idx_quan_huyen (quanHuyen),
    INDEX idx_phuong_xa (phuongXa)
);
```

#### **2.2.3. Bảng `nhan_khau` (Nhân khẩu)**
```sql
CREATE TABLE nhan_khau (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hoTen VARCHAR(100) NOT NULL,
    biDanh VARCHAR(100) NULL,
    cccd VARCHAR(12) UNIQUE,
    ngayCapCCCD DATE NULL,
    noiCapCCCD VARCHAR(100) NULL,
    ngaySinh DATE,
    gioiTinh ENUM('nam', 'nu', 'khac'),
    noiSinh VARCHAR(100),
    nguyenQuan VARCHAR(100),
    danToc VARCHAR(50),
    tonGiao VARCHAR(50),
    quocTich VARCHAR(50) DEFAULT 'Việt Nam',
    hoKhauId INT NOT NULL, -- FK to ho_khau
    quanHe ENUM('chu_ho', 'vo_chong', 'con', 'cha_me', 'anh_chi_em', 'ong_ba', 'chau', 'khac') NOT NULL,
    ngayDangKyThuongTru DATE NULL,
    diaChiThuongTruTruoc VARCHAR(200) NULL,
    ngheNghiep VARCHAR(100),
    noiLamViec VARCHAR(200),
    trangThai ENUM('active', 'tam_vang', 'tam_tru', 'chuyen_di', 'khai_tu', 'deleted') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hoKhauId) REFERENCES ho_khau(id)
);
```

#### **2.2.4. Bảng `bien_dong` (Biến động nhân khẩu)**
```sql
CREATE TABLE bien_dong (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nhanKhauId INT NOT NULL,
    loai ENUM('chuyen_di', 'chuyen_den', 'khai_sinh', 'khai_tu', 'thay_doi_quan_he', 'thay_doi_thong_tin') NOT NULL,
    ngayThucHien DATE NOT NULL,
    noiDung TEXT,
    diaChiCu VARCHAR(200),
    diaChiMoi VARCHAR(200),
    nguoiThucHien INT, -- FK to users
    canBoXacNhan INT, -- FK to users
    trangThai ENUM('cho_duyet', 'da_duyet', 'tu_choi') DEFAULT 'cho_duyet',
    ghiChu TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nhanKhauId) REFERENCES nhan_khau(id),
    FOREIGN KEY (nguoiThucHien) REFERENCES users(id),
    FOREIGN KEY (canBoXacNhan) REFERENCES users(id)
);
```

#### **2.2.5. Bảng `tam_tru_vang` (Tạm trú/Tạm vắng)**
```sql
CREATE TABLE tam_tru_vang (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nhanKhauId INT,
    loai ENUM('tam_tru', 'tam_vang') NOT NULL,
    tuNgay DATE NOT NULL,
    denNgay DATE,
    diaChi VARCHAR(200),
    lyDo TEXT,
    nguoiDangKy INT, -- FK to users
    nguoiDuyet INT, -- FK to users
    trangThai ENUM('cho_duyet', 'da_duyet', 'dang_thuc_hien', 'ket_thuc', 'tu_choi') DEFAULT 'cho_duyet',
    ghiChu TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (nhanKhauId) REFERENCES nhan_khau(id),
    FOREIGN KEY (nguoiDangKy) REFERENCES users(id),
    FOREIGN KEY (nguoiDuyet) REFERENCES users(id)
);
```

#### **2.2.6. Bảng `phan_anh` (Phản ánh kiến nghị)**
```sql
CREATE TABLE phan_anh (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tieuDe VARCHAR(200) NOT NULL,
    noiDung TEXT NOT NULL,
    nguoiPhanAnh INT NULL, -- FK to users (người phản ánh đầu tiên - backward compatibility)
    loai ENUM('co_so_ha_tang', 'moi_truong', 'an_ninh', 'y_te', 'giao_duc', 'khac') NOT NULL,
    trangThai ENUM('cho_xu_ly', 'dang_xu_ly', 'da_xu_ly', 'tu_choi') DEFAULT 'cho_xu_ly',
    nguoiXuLy INT, -- FK to users (cán bộ được phân công)
    nguoiDuyet INT, -- FK to users (tổ trưởng)
    ketQuaXuLy TEXT,
    ngayTao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ngayXuLy TIMESTAMP NULL,
    ngayDuyet TIMESTAMP NULL,
    FOREIGN KEY (nguoiPhanAnh) REFERENCES users(id),
    FOREIGN KEY (nguoiXuLy) REFERENCES users(id),
    FOREIGN KEY (nguoiDuyet) REFERENCES users(id)
);
```

#### **2.2.6a. Bảng `phan_anh_nguoi` (Nhiều người phản ánh cùng một kiến nghị)**
```sql
CREATE TABLE phan_anh_nguoi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phanAnhId INT NOT NULL,
    nguoiPhanAnhId INT NOT NULL,
    soLan INT DEFAULT 1 COMMENT 'Số lần người này phản ánh về vấn đề này',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (phanAnhId) REFERENCES phan_anh(id) ON DELETE CASCADE,
    FOREIGN KEY (nguoiPhanAnhId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_phan_anh_nguoi (phanAnhId, nguoiPhanAnhId),
    INDEX idx_phan_anh (phanAnhId),
    INDEX idx_nguoi_phan_anh (nguoiPhanAnhId)
);
```

#### **2.2.7. Bảng `lich_su_thay_doi` (Lịch sử thay đổi)**
```sql
CREATE TABLE lich_su_thay_doi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bang VARCHAR(50) NOT NULL, -- 'ho_khau', 'nhan_khau', 'bien_dong', etc.
    banGhiId INT NOT NULL,
    hanhDong ENUM('create', 'update', 'delete') NOT NULL,
    truong VARCHAR(50), -- Tên trường thay đổi
    noiDungCu TEXT,
    noiDungMoi TEXT,
    nguoiThucHien INT, -- FK to users
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nguoiThucHien) REFERENCES users(id)
);
```

#### **2.2.8. Bảng `phan_cong` (Phân công cán bộ)**
```sql
CREATE TABLE phan_cong (
    id INT PRIMARY KEY AUTO_INCREMENT,
    canBoId INT NOT NULL, -- FK to users
    nghiepVu ENUM('ho_khau', 'nhan_khau', 'bien_dong', 'tam_tru_vang', 'phan_anh') NOT NULL,
    moTa TEXT,
    nguoiPhanCong INT, -- FK to users (tổ trưởng)
    trangThai ENUM('active', 'inactive') DEFAULT 'active',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (canBoId) REFERENCES users(id),
    FOREIGN KEY (nguoiPhanCong) REFERENCES users(id)
);
```

---

## 3. THIẾT KẾ API

### 3.1. Authentication & Authorization

```
POST   /api/auth/login          - Đăng nhập
POST   /api/auth/register       - Đăng ký
POST   /api/auth/logout         - Đăng xuất
GET    /api/auth/me             - Lấy thông tin user hiện tại
PUT    /api/auth/change-password - Đổi mật khẩu
```

### 3.2. Quản lý Hộ khẩu

```
GET    /api/ho-khau             - Danh sách hộ khẩu (có filter, pagination)
GET    /api/ho-khau/:id         - Chi tiết hộ khẩu
POST   /api/ho-khau             - Tạo hộ khẩu mới
PUT    /api/ho-khau/:id         - Cập nhật hộ khẩu
DELETE /api/ho-khau/:id         - Xóa hộ khẩu (soft delete)
GET    /api/ho-khau/search      - Tìm kiếm hộ khẩu
GET    /api/ho-khau/:id/nhan-khau - Danh sách nhân khẩu trong hộ
```

### 3.3. Quản lý Nhân khẩu

```
GET    /api/nhan-khau           - Danh sách nhân khẩu
GET    /api/nhan-khau/:id       - Chi tiết nhân khẩu
POST   /api/nhan-khau           - Thêm nhân khẩu mới
PUT    /api/nhan-khau/:id       - Cập nhật nhân khẩu
DELETE /api/nhan-khau/:id       - Xóa nhân khẩu (soft delete)
GET    /api/nhan-khau/search    - Tìm kiếm nhân khẩu
```

### 3.4. Biến động Nhân khẩu

```
GET    /api/bien-dong           - Danh sách biến động
GET    /api/bien-dong/:id       - Chi tiết biến động
POST   /api/bien-dong           - Tạo biến động mới
PUT    /api/bien-dong/:id       - Cập nhật biến động
POST   /api/bien-dong/:id/duyet - Duyệt biến động
GET    /api/bien-dong/nhan-khau/:id - Lịch sử biến động của nhân khẩu
```

### 3.5. Tạm trú/Tạm vắng

```
GET    /api/tam-tru-vang        - Danh sách tạm trú/vắng
GET    /api/tam-tru-vang/:id    - Chi tiết
POST   /api/tam-tru-vang        - Đăng ký tạm trú/vắng
PUT    /api/tam-tru-vang/:id    - Cập nhật
POST   /api/tam-tru-vang/:id/duyet - Duyệt
POST   /api/tam-tru-vang/:id/ket-thuc - Kết thúc
GET    /api/tam-tru-vang/thong-ke - Thống kê
```

### 3.6. Phản ánh Kiến nghị

```
GET    /api/phan-anh            - Danh sách phản ánh
GET    /api/phan-anh/:id        - Chi tiết
POST   /api/phan-anh             - Tạo phản ánh
PUT    /api/phan-anh/:id        - Cập nhật
POST   /api/phan-anh/:id/phan-cong - Phân công xử lý
PUT    /api/phan-anh/:id/xu-ly  - Cập nhật kết quả xử lý
POST   /api/phan-anh/:id/duyet  - Duyệt kết quả
GET    /api/phan-anh/thong-ke   - Thống kê theo trạng thái
POST   /api/phan-anh/:id/dong-y - Đồng ý với phản ánh (tăng soLan)
DELETE /api/phan-anh/:id/dong-y - Hủy đồng ý
GET    /api/phan-anh/:id/nguoi-phan-anh - Danh sách người phản ánh
```

### 3.7. Phân công

```
GET    /api/phan-cong           - Danh sách phân công
POST   /api/phan-cong           - Tạo phân công
PUT    /api/phan-cong/:id      - Cập nhật
DELETE /api/phan-cong/:id      - Xóa phân công
GET    /api/phan-cong/can-bo/:id - Phân công của cán bộ
```

### 3.8. Thống kê

```
GET    /api/thong-ke/tong-quan  - Thống kê tổng quan
GET    /api/thong-ke/ho-khau    - Thống kê hộ khẩu
GET    /api/thong-ke/nhan-khau  - Thống kê nhân khẩu
GET    /api/thong-ke/bien-dong  - Thống kê biến động
GET    /api/thong-ke/tam-tru-vang - Thống kê tạm trú/vắng
GET    /api/thong-ke/dia-chi    - Thống kê theo địa chỉ
GET    /api/thong-ke/dia-chi/phuong - Thống kê theo phường
GET    /api/thong-ke/dia-chi/quan   - Thống kê theo quận
```

### 3.9. Lịch sử

```
GET    /api/lich-su             - Lịch sử thay đổi (có filter)
GET    /api/lich-su/:bang/:id  - Lịch sử của một bản ghi cụ thể
```

---

## 4. LOGIC BACKEND

### 4.1. Authentication & Authorization

#### **Middleware phân quyền:**
```javascript
// Kiểm tra quyền truy cập
function checkPermission(user, action, resource) {
    // Tổ trưởng/Tổ phó: toàn quyền
    if (user.role === 'to_truong' || user.role === 'to_pho') {
        return true;
    }
    
    // Cán bộ: chỉ được thao tác trên nghiệp vụ được phân công
    if (user.role === 'can_bo') {
        const phanCong = getPhanCong(user.id, resource);
        return phanCong && phanCong.trangThai === 'active';
    }
    
    // Người dân: chỉ xem thông tin của mình
    if (user.role === 'nguoi_dan') {
        return action === 'read' && resource.nguoiPhanAnh === user.id;
    }
    
    return false;
}
```

### 4.2. Logic nghiệp vụ

#### **A. Quản lý Hộ khẩu**

**Thêm hộ khẩu:**
1. Validate dữ liệu (số hộ khẩu, địa chỉ, chủ hộ)
2. Kiểm tra số hộ khẩu đã tồn tại chưa
3. Kiểm tra chủ hộ có phải là nhân khẩu hợp lệ không
4. Tạo hộ khẩu mới
5. Ghi lịch sử thay đổi
6. Trả về kết quả

**Cập nhật hộ khẩu:**
1. Kiểm tra quyền
2. Validate dữ liệu
3. Lưu dữ liệu cũ vào lịch sử
4. Cập nhật dữ liệu mới
5. Ghi lịch sử thay đổi

**Xóa hộ khẩu:**
1. Kiểm tra hộ khẩu còn nhân khẩu không
2. Nếu còn → không cho xóa
3. Nếu không → soft delete (đổi trạng thái)

#### **B. Quản lý Nhân khẩu**

**Thêm nhân khẩu:**
1. Validate CCCD (nếu có)
2. Kiểm tra CCCD đã tồn tại chưa
3. Kiểm tra quan hệ với chủ hộ
4. Tạo nhân khẩu mới
5. Ghi lịch sử

**Cập nhật nhân khẩu:**
1. Kiểm tra quyền
2. Lưu dữ liệu cũ
3. Cập nhật dữ liệu mới
4. Ghi lịch sử

#### **C. Biến động Nhân khẩu**

**Tạo biến động:**
1. Validate loại biến động
2. Kiểm tra nhân khẩu tồn tại
3. Tạo bản ghi biến động với trạng thái "chờ duyệt"
4. Nếu là khai sinh → tự động thêm nhân khẩu mới
5. Nếu là khai tử → cập nhật trạng thái nhân khẩu
6. Ghi lịch sử

**Duyệt biến động:**
1. Chỉ tổ trưởng/tổ phó được duyệt
2. Cập nhật trạng thái biến động
3. Thực hiện hành động tương ứng:
   - Chuyển đi: Cập nhật trạng thái nhân khẩu
   - Chuyển đến: Thêm nhân khẩu vào hộ khẩu mới
   - Khai sinh: Xác nhận nhân khẩu mới
   - Khai tử: Cập nhật trạng thái
4. Ghi lịch sử

#### **D. Tạm trú/Tạm vắng**

**Đăng ký tạm trú/vắng:**
1. Validate thời gian (từ ngày < đến ngày)
2. Kiểm tra nhân khẩu tồn tại
3. Tạo bản ghi với trạng thái "chờ duyệt"
4. Ghi lịch sử

**Duyệt:**
1. Chỉ tổ trưởng/tổ phó được duyệt
2. Cập nhật trạng thái
3. Nếu tạm trú → thêm vào danh sách tạm trú
4. Nếu tạm vắng → cập nhật trạng thái nhân khẩu
5. Ghi lịch sử

**Kết thúc:**
1. Cập nhật trạng thái
2. Cập nhật trạng thái nhân khẩu về "active"
3. Ghi lịch sử

#### **E. Phản ánh Kiến nghị**

**Tạo phản ánh:**
1. Bất kỳ user nào cũng có thể tạo
2. Tạo với trạng thái "chờ xử lý"
3. Ghi lịch sử

**Phân công xử lý:**
1. Chỉ tổ trưởng/tổ phó được phân công
2. Kiểm tra cán bộ có được phân công nghiệp vụ "phan_anh" không
3. Cập nhật người xử lý và trạng thái "đang xử lý"
4. Ghi lịch sử

**Xử lý:**
1. Chỉ cán bộ được phân công mới được xử lý
2. Cập nhật kết quả xử lý
3. Chuyển trạng thái về "chờ duyệt"
4. Ghi lịch sử

**Duyệt:**
1. Chỉ tổ trưởng/tổ phó được duyệt
2. Cập nhật trạng thái "đã xử lý"
3. Ghi lịch sử

### 4.3. Validation Rules

**Hộ khẩu:**
- Số hộ khẩu: Bắt buộc, unique, format: HK-YYYY-XXXX
- Địa chỉ: Bắt buộc, tối đa 200 ký tự
- Chủ hộ: Bắt buộc, phải là nhân khẩu hợp lệ

**Nhân khẩu:**
- Họ tên: Bắt buộc, tối đa 100 ký tự
- CCCD: Unique (nếu có), 12 số
- Ngày sinh: Bắt buộc, không được lớn hơn ngày hiện tại
- Quan hệ: Bắt buộc

**Biến động:**
- Loại: Bắt buộc
- Ngày thực hiện: Bắt buộc
- Nhân khẩu: Bắt buộc, phải tồn tại

---

## 5. CÁC BƯỚC TRIỂN KHAI

### Phase 1: Setup & Authentication (Tuần 1-2)
- [ ] Setup backend framework (Node.js + Express/NestJS)
- [ ] Setup database (MySQL/PostgreSQL)
- [ ] Tạo các bảng database
- [ ] Implement authentication (JWT)
- [ ] Implement authorization middleware
- [ ] API đăng nhập/đăng ký
- [ ] Test authentication

### Phase 2: Core Features - Hộ khẩu & Nhân khẩu (Tuần 3-4)
- [ ] API CRUD Hộ khẩu
- [ ] API CRUD Nhân khẩu
- [ ] Validation & Business logic
- [ ] Lịch sử thay đổi
- [ ] Tìm kiếm
- [ ] Test các API

### Phase 3: Biến động & Tạm trú/Vắng (Tuần 5-6)
- [ ] API Biến động nhân khẩu
- [ ] Logic duyệt biến động
- [ ] API Tạm trú/Tạm vắng
- [ ] Logic duyệt và kết thúc
- [ ] Test các API

### Phase 4: Phản ánh & Phân công (Tuần 7-8)
- [ ] API Phản ánh kiến nghị
- [ ] Logic phân công và xử lý
- [ ] API Phân công cán bộ
- [ ] Test các API

### Phase 5: Thống kê & Báo cáo (Tuần 9)
- [ ] API Thống kê tổng quan
- [ ] API Thống kê chi tiết
- [ ] Export báo cáo (PDF/Excel)
- [ ] Test

### Phase 6: Frontend Integration (Tuần 10-12)
- [ ] Tích hợp API vào frontend
- [ ] Xử lý lỗi và validation
- [ ] Loading states
- [ ] Test end-to-end

### Phase 7: Testing & Deployment (Tuần 13-14)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Security testing
- [ ] Performance testing
- [ ] Deploy production
- [ ] Documentation

---

## 6. CÔNG NGHỆ ĐỀ XUẤT

### Backend:
- **Framework**: NestJS (TypeScript) hoặc Express.js
- **Database**: MySQL hoặc PostgreSQL
- **ORM**: TypeORM hoặc Prisma
- **Authentication**: JWT
- **Validation**: class-validator, joi
- **File upload**: multer
- **PDF/Excel**: pdfkit, exceljs

### Frontend:
- **Framework**: React + TypeScript (đã có)
- **State Management**: React Query hoặc Zustand
- **HTTP Client**: Axios
- **Form**: React Hook Form
- **UI**: TailwindCSS (đã có)

### DevOps:
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Deployment**: Docker + Nginx
- **Monitoring**: PM2 hoặc Docker Compose

---

## 7. LƯU Ý QUAN TRỌNG

1. **Bảo mật:**
   - Hash password (bcrypt)
   - JWT với refresh token
   - Rate limiting
   - Input validation & sanitization
   - SQL injection prevention

2. **Performance:**
   - Database indexing
   - Caching (Redis - optional)
   - Pagination cho danh sách
   - Lazy loading

3. **Data Integrity:**
   - Foreign key constraints
   - Transactions cho các thao tác phức tạp
   - Soft delete thay vì hard delete
   - Backup định kỳ

4. **User Experience:**
   - Loading indicators
   - Error messages rõ ràng
   - Confirmation dialogs cho thao tác quan trọng
   - Responsive design

---

## 8. NEXT STEPS

1. **Review và approve plan này**
2. **Chọn công nghệ cụ thể** (NestJS vs Express, MySQL vs PostgreSQL)
3. **Setup development environment**
4. **Bắt đầu Phase 1**

