# Hướng dẫn: Quản lý yêu cầu cho Tổ trưởng/Cán bộ

## Tóm tắt

Đã implement trang quản lý yêu cầu cho tổ trưởng/cán bộ với các tính năng:
- Sidebar menu "Yêu cầu" (chỉ hiển thị cho to_truong và can_bo)
- Trang danh sách yêu cầu với filter theo loại và trạng thái
- Modal xem chi tiết và duyệt/từ chối yêu cầu
- API service methods (có mock fallback)

## Files đã tạo/cập nhật

### 1. Files mới
- **`frontend/src/pages/Requests.tsx`** - Trang danh sách yêu cầu
- **`frontend/src/components/RequestDetailModal.tsx`** - Modal chi tiết và duyệt/từ chối

### 2. Files đã cập nhật
- **`frontend/src/components/Layout.tsx`** - Thêm menu "Yêu cầu" với role-based visibility
- **`frontend/src/App.tsx`** - Thêm route `/requests`
- **`frontend/src/services/api.ts`** - Thêm 4 API methods mới

## Cấu trúc

### Sidebar Menu
- Menu item "Yêu cầu" (icon 📋) được thêm vào sau "Nhân khẩu"
- Chỉ hiển thị khi `userInfo.role === "to_truong" || userInfo.role === "can_bo"`

### Trang Requests.tsx

**Features:**
- Filter theo loại yêu cầu: Tất cả, Tách hộ khẩu, Sửa nhân khẩu, Xoá nhân khẩu
- Filter theo trạng thái: Tất cả, Chờ duyệt, Đã duyệt, Từ chối, Đang xử lý
- Bảng hiển thị: ID, Loại yêu cầu, Người gửi, Hộ khẩu liên quan, Ngày gửi, Trạng thái, Thao tác
- Nút "Xem chi tiết" mở modal

### RequestDetailModal.tsx

**Features:**
- Hiển thị thông tin chung: Loại yêu cầu, Người gửi, Ngày gửi, Hộ khẩu liên quan
- Hiển thị chi tiết theo loại:
  - **Tách hộ khẩu**: Nhân khẩu tách, Chủ hộ mới, Địa chỉ mới, Ngày dự kiến, Lý do, Ghi chú
  - **Sửa nhân khẩu**: Nhân khẩu cần sửa, Thông tin thay đổi, Lý do
  - **Xoá nhân khẩu**: Nhân khẩu cần xoá, Lý do
- Actions (chỉ hiển thị khi status === "pending"):
  - Nút "Duyệt" → gọi API approve
  - Nút "Từ chối" → mở modal nhập lý do từ chối

## API Integration

### Hiện tại (Mock/Temporary)

#### 1. GET /requests?type=&status=
**File:** `frontend/src/services/api.ts`  
**Method:** `getRequestsList()`

**Request:**
```
GET /requests?type=TACH_HO_KHAU&status=pending
```

**Response format mong đợi:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "TACH_HO_KHAU",
      "loaiYeuCau": "Yêu cầu tách hộ khẩu",
      "nguoiGui": {
        "hoTen": "Nguyễn Văn A",
        "cccd": "079912345678"
      },
      "hoKhauLienQuan": {
        "soHoKhau": "HK001234",
        "diaChi": "Số 123, Đường ABC"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "status": "pending",
      "payload": { ... }
    }
  ]
}
```

**Khi backend sẵn sàng:**
- File: `frontend/src/services/api.ts`
- Method: `getRequestsList()` (line ~357)
- Thay đổi: Xóa phần mock fallback, giữ nguyên logic gọi API

#### 2. GET /requests/:id
**File:** `frontend/src/services/api.ts`  
**Method:** `getRequestDetail()`

**Request:**
```
GET /requests/123
```

**Response format mong đợi:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "type": "TACH_HO_KHAU",
    "status": "pending",
    "nguoiGui": {
      "hoTen": "Nguyễn Văn A",
      "cccd": "079912345678"
    },
    "hoKhauLienQuan": {
      "id": 1,
      "soHoKhau": "HK001234",
      "diaChi": "Số 123, Đường ABC"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "payload": {
      "selectedNhanKhauIds": [1, 2],
      "newChuHoId": 2,
      "newAddress": "Số 789, Đường XYZ",
      "expectedDate": "2025-12-24",
      "reason": "Tách hộ để quản lý riêng",
      "note": "Đã chuẩn bị đầy đủ giấy tờ"
    }
  }
}
```

**Khi backend sẵn sàng:**
- File: `frontend/src/services/api.ts`
- Method: `getRequestDetail()` (line ~413)
- Thay đổi: Xóa phần mock fallback

#### 3. POST /requests/:id/approve
**File:** `frontend/src/services/api.ts`  
**Method:** `approveRequest()`

**Request:**
```
POST /requests/123/approve
```

**Response format mong đợi:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "approved"
  }
}
```

**Khi backend sẵn sàng:**
- File: `frontend/src/services/api.ts`
- Method: `approveRequest()` (line ~437)
- Thay đổi: Xóa phần mock fallback

#### 4. POST /requests/:id/reject
**File:** `frontend/src/services/api.ts`  
**Method:** `rejectRequest()`

**Request:**
```
POST /requests/123/reject
Content-Type: application/json

{
  "reason": "Thiếu giấy tờ cần thiết"
}
```

**Response format mong đợi:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "rejected",
    "rejectReason": "Thiếu giấy tờ cần thiết"
  }
}
```

**Khi backend sẵn sàng:**
- File: `frontend/src/services/api.ts`
- Method: `rejectRequest()` (line ~456)
- Thay đổi: Xóa phần mock fallback

## Backend Requirements (TODO)

Cần tạo các endpoints sau:

### 1. GET /requests
- **Auth:** requireAuth, requireRole(["to_truong", "to_pho", "can_bo"])
- **Query params:** `type?`, `status?`
- **Logic:**
  - Query từ bảng `yeu_cau_thay_doi`
  - Join với `users` để lấy thông tin người gửi
  - Join với `ho_khau` để lấy thông tin hộ khẩu liên quan
  - Filter theo type và status nếu có
  - Parse `noiDung` (JSON) thành payload
  - Map `loai` và `trangThai` sang format frontend

### 2. GET /requests/:id
- **Auth:** requireAuth, requireRole(["to_truong", "to_pho", "can_bo"])
- **Logic:**
  - Query chi tiết yêu cầu với đầy đủ thông tin
  - Parse `noiDung` thành payload
  - Trả về format như trên

### 3. POST /requests/:id/approve
- **Auth:** requireAuth, requireRole(["to_truong", "to_pho", "can_bo"])
- **Logic:**
  - Update `trangThai` = 'da_xu_ly'
  - Set `nguoiXuLyId` = req.user.id
  - Có thể thực hiện logic nghiệp vụ tương ứng (tách hộ, sửa nhân khẩu, xoá nhân khẩu)

### 4. POST /requests/:id/reject
- **Auth:** requireAuth, requireRole(["to_truong", "to_pho", "can_bo"])
- **Body:** `{ reason: string }`
- **Logic:**
  - Update `trangThai` = 'tu_choi'
  - Set `phanHoi` = reason
  - Set `nguoiXuLyId` = req.user.id

## Notes

- Filter hiện tại hoạt động ở cả frontend và backend (query params)
- Khi backend hỗ trợ filter, có thể xóa phần filter frontend trong `loadRequests()`
- Status mapping: `moi` → `pending`, `da_xu_ly` → `approved`, `tu_choi` → `rejected`
- Type mapping: `chuyen_di` → `TACH_HO_KHAU`, `sua_thong_tin` → `SUA_NHAN_KHAU`, `khac` → `XOA_NHAN_KHAU`
- Code đã được format và không có linter errors


