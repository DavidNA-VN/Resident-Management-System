# Cập nhật Hệ thống Requests - Thiết kế mở rộng

## Tổng quan
Đã cập nhật hệ thống requests với cấu trúc **mở rộng** để hỗ trợ nhiều loại yêu cầu khác nhau, không chỉ ADD_NEWBORN mà còn ADD_PERSON và các loại khác trong tương lai.

## Những thay đổi chính

### 1. Database Schema (Bảng requests)
- **Thêm các cột mới:**
  - `code`: Mã đơn tự động (REQ-2025-000123)
  - `priority`: Độ ưu tiên (0-10)
  - `targetHouseholdId`: Hộ khẩu liên quan
  - `targetPersonId`: Nhân khẩu liên quan
  - `attachments`: File đính kèm (JSONB)
  - `rejectionReason`: Lý do từ chối
  - `reviewedBy`: Người duyệt
  - `reviewedAt`: Thời gian duyệt

- **Mở rộng enum type:**
  - `ADD_PERSON`: Thêm nhân khẩu người lớn
  - `ADD_NEWBORN`: Thêm trẻ sơ sinh
  - `UPDATE_PERSON`: Sửa thông tin nhân khẩu
  - `REMOVE_PERSON`: Xóa nhân khẩu
  - `CHANGE_HEAD`: Đổi chủ hộ
  - `UPDATE_HOUSEHOLD`: Sửa hộ khẩu
  - `SPLIT_HOUSEHOLD`: Tách hộ
  - `TEMPORARY_RESIDENCE`: Tạm trú
  - `TEMPORARY_ABSENCE`: Tạm vắng
  - `MOVE_OUT`: Chuyển đi
  - `DECEASED`: Khai tử

### 2. Backend API
- **Dispatcher pattern**: Tự động route đến handler phù hợp dựa trên type
- **Transaction safety**: Tất cả approval đều chạy trong transaction
- **Validation**: Kiểm tra đầy đủ constraints và business rules

### 3. Frontend
- **Thêm modal AddPersonModal**: Form đầy đủ cho việc thêm nhân khẩu
- **Cập nhật YeuCau.tsx**: Hỗ trợ cả ADD_PERSON và ADD_NEWBORN
- **Cập nhật Requests.tsx**: Hiển thị và quản lý các loại request mới

## Cách cập nhật Database

### Bước 1: Import migration mới
```bash
# Chạy file migration để cập nhật schema
psql -U your_username -d your_database -f database/migrations/002_update_requests_schema_extended.sql
```

### Bước 2: Kiểm tra kết quả
```sql
-- Kiểm tra bảng requests đã được cập nhật
\d requests

-- Kiểm tra dữ liệu hiện có vẫn hoạt động
SELECT id, code, type, status, "createdAt" FROM requests LIMIT 5;
```

### Bước 3: Restart backend
```bash
cd backend/backend
npm run dev
```

## Testing

### 1. Test ADD_PERSON (Người dân)
1. Đăng nhập với role `nguoi_dan`
2. Vào trang "Yêu cầu"
3. Click "Thêm nhân khẩu"
4. Điền đầy đủ thông tin (quan hệ, CCCD, v.v.)
5. Gửi yêu cầu
6. Kiểm tra request xuất hiện trong danh sách

### 2. Test ADD_NEWBORN (Người dân)
1. Đăng nhập với role `nguoi_dan`
2. Vào trang "Yêu cầu"
3. Click "Thêm con sơ sinh"
4. Điền thông tin trẻ sơ sinh
5. Gửi yêu cầu

### 3. Test Approve (Tổ trưởng)
1. Đăng nhập với role `to_truong`
2. Vào trang "Requests"
3. Xem danh sách PENDING requests
4. Click vào request để xem chi tiết
5. Click "Approve" để duyệt
6. Kiểm tra dữ liệu được tự động thêm vào bảng `nhan_khau`

### 4. Test Reject (Tổ trưởng)
1. Click "Reject" trên request
2. Nhập lý do từ chối
3. Kiểm tra request chuyển sang trạng thái REJECTED

## Payload Structure

### ADD_PERSON
```json
{
  "type": "ADD_PERSON",
  "targetHouseholdId": 123,
  "payload": {
    "person": {
      "hoTen": "Nguyễn Văn A",
      "cccd": "123456789012",
      "ngaySinh": "1990-01-01",
      "gioiTinh": "nam",
      "noiSinh": "Hà Nội",
      "quanHe": "con",
      // ... các field khác
    }
  }
}
```

### ADD_NEWBORN
```json
{
  "type": "ADD_NEWBORN",
  "targetHouseholdId": 123,
  "payload": {
    "newborn": {
      "hoTen": "Nguyễn Thị Bé",
      "ngaySinh": "2025-01-01",
      "gioiTinh": "nu",
      "noiSinh": "Hà Nội",
      "isMoiSinh": true,
      // ... các field khác
    }
  }
}
```

## Lưu ý quan trọng

1. **Transaction Safety**: Tất cả approval đều chạy trong database transaction
2. **Validation**: CCCD unique, household exists, relationship valid
3. **Backward Compatibility**: Hỗ trợ dữ liệu cũ
4. **Extensible**: Dễ dàng thêm loại request mới bằng cách:
   - Thêm type vào enum
   - Tạo validation function
   - Tạo approval handler
   - Cập nhật frontend

## Troubleshooting

### Lỗi "column does not exist"
- Đảm bảo đã chạy migration file
- Kiểm tra lại tên cột (camelCase vs snake_case)

### Lỗi "permission denied"
- Đảm bảo user database có quyền ALTER TABLE

### Frontend không hiển thị
- Clear browser cache
- Restart frontend dev server

## Tiếp theo
Hệ thống đã sẵn sàng để:
1. Thêm các loại request khác (UPDATE_PERSON, SPLIT_HOUSEHOLD, v.v.)
2. Thêm file attachments
3. Thêm notification system
4. Thêm workflow approval phức tạp hơn

