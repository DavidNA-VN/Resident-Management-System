# Sửa UI Liên kết User - Nhân khẩu

## Vấn đề ban đầu
Người dân đăng nhập mà chưa có nhân khẩu liên kết, UI hiển thị **lỗi chết** thay vì trạng thái hợp lệ theo OPTION B.

## Giải pháp

### 1. Backend Fixes
**File:** `backend/backend/src/routes/citizen.routes.ts`

- **Sửa API `/citizen/household`:** Thay vì trả error 404, trả success=false với code "NOT_LINKED"
- **Thêm API `/citizen/households`:** Trả về danh sách hộ khẩu active để người dân chọn

### 2. Frontend Citizen Home
**File:** `frontend/src/pages/citizen/Home.tsx`

- **Empty state đẹp:** Hiển thị hướng dẫn chi tiết thay vì error
- **Smart loading:** Chỉ call API household khi user đã linked
- **Better UX:** Hiển thị step-by-step guide cho user mới

### 3. Frontend Request Form
**File:** `frontend/src/pages/citizen/YeuCau.tsx`

- **Load households:** API call để lấy danh sách hộ khẩu
- **Dropdown selection:** Thay input text bằng dropdown chọn hộ khẩu
- **Better UX:** Hiển thị tên hộ khẩu + địa chỉ

### 4. API Service
**File:** `frontend/src/services/api.ts`

- **Thêm method:** `getCitizenHouseholds()` cho dropdown

## Flow mới

### User mới đăng ký:
1. **Đăng ký** → CCCD làm username
2. **Đăng nhập** → `linked: false` (không phải error)
3. **Citizen Home** → Empty state với hướng dẫn
4. **Tạo request** → Chọn hộ khẩu từ dropdown
5. **Tổ trưởng duyệt** → Tự động link
6. **Đăng nhập lại** → `linked: true`, thấy dữ liệu

## Response Examples

### Login (chưa linked):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "123456789012",
      "role": "nguoi_dan",
      "linked": false,
      "message": "Chưa có hồ sơ nhân khẩu..."
    }
  }
}
```

### getCitizenHousehold (chưa linked):
```json
{
  "success": false,
  "error": {
    "code": "NOT_LINKED",
    "message": "Tài khoản chưa liên kết với hồ sơ nhân khẩu"
  }
}
```

### getCitizenHouseholds:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "soHoKhau": "HK001",
      "diaChi": "123 Đường ABC, Quận 1, TP.HCM"
    }
  ]
}
```

## UI States

### Citizen Home - Chưa linked:
```
👤 Tài khoản chưa liên kết hồ sơ nhân khẩu

[Bạn đã đăng ký thành công nhưng chưa có hồ sơ nhân khẩu trong hệ thống.]

Để sử dụng đầy đủ chức năng:
1. Tạo yêu cầu thêm nhân khẩu
   → Chọn hộ khẩu bạn muốn gia nhập và điền thông tin cá nhân
2. Chờ tổ trưởng duyệt
   → Tổ trưởng sẽ kiểm tra và thêm bạn vào hệ thống
3. Đăng nhập lại
   → Sau khi được duyệt, tài khoản sẽ tự động liên kết

[📝 Tạo yêu cầu ngay]
```

### Add Person Modal - Chưa linked:
```
Hộ khẩu: [Dropdown: HK001 - 123 Đường ABC... ▼]
[Chọn hộ khẩu bạn muốn gia nhập...]
```

## Files Changed
```
backend/backend/src/routes/citizen.routes.ts      # Fixed household API + added public list
frontend/src/pages/citizen/Home.tsx               # Better empty state UI
frontend/src/pages/citizen/YeuCau.tsx             # Added household dropdown
frontend/src/services/api.ts                      # Added getCitizenHouseholds method
```

## Testing

### Test Case 1: User mới
1. Đăng ký account mới
2. Login → Thấy empty state (không error)
3. Click "Tạo yêu cầu" → Thấy dropdown hộ khẩu
4. Chọn hộ khẩu + điền info → Submit
5. Tổ trưởng approve → User login lại → Thấy dữ liệu

### Test Case 2: User đã linked
1. Login → Thấy household info bình thường
2. Tạo request → Dùng household của mình

## Backward Compatibility
- User cũ đã linked: Hoạt động bình thường
- User mới: Có trải nghiệm onboarding tốt
- Không break existing functionality

## Performance
- Lazy loading: Chỉ load household list khi cần
- Smart API calls: Tránh call API khi không cần thiết
- Efficient queries: Chỉ select fields cần thiết cho dropdown

## Kết luận
Bây giờ **trạng thái chưa liên kết là hợp lệ**, không phải error. User có trải nghiệm onboarding tốt với hướng dẫn rõ ràng và dropdown chọn hộ khẩu tiện lợi.

**OPTION B flow hoàn chỉnh!** 🎉

