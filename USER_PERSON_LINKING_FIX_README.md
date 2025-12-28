# Sửa lỗi liên kết User - Nhân khẩu cho người dùng mới

## Vấn đề ban đầu
Người dùng mới tạo account (chưa có hồ sơ nhân khẩu) không thể tạo request ADD_PERSON vì:
- Hệ thống yêu cầu targetHouseholdId
- User mới chưa có household nào
- Không có cách nào để user mới tạo request để được thêm vào hệ thống

## Giải pháp

### 1. Backend Changes
**File:** `backend/backend/src/routes/requests.routes.ts`

- **Sửa validation targetHouseholdId:** Cho phép user chưa linked chỉ định householdId hoặc để trống
- **Cập nhật validateAddPersonPayload:** Không yêu cầu quanHe nếu user chưa linked (vì họ sẽ chỉ định household)
- **Sửa approve endpoint:** Nhận householdId từ body để tổ trưởng có thể chỉ định

### 2. Frontend Changes
**File:** `frontend/src/pages/citizen/YeuCau.tsx`

- **Thêm loadUserInfo:** Kiểm tra trạng thái linked của user
- **Cập nhật AddPersonModal:**
  - Hiển thị field householdId tùy chỉnh cho user chưa linked
  - Validation khác nhau dựa trên trạng thái linked
  - Cho phép user nhập householdId hoặc để trống

**File:** `frontend/src/pages/Requests.tsx`

- **Thêm householdId state:** Để tổ trưởng nhập ID hộ khẩu
- **Cập nhật apiService.approveRequest:** Gửi householdId nếu có
- **Thêm field nhập householdId:** Trong modal detail cho ADD_PERSON requests
- **Validation:** Yêu cầu householdId khi approve ADD_PERSON

**File:** `frontend/src/services/api.ts`

- **Cập nhật approveRequest:** Nhận householdId parameter

## Flow mới

### 1. User mới đăng ký
```
Đăng ký → Tạo account với CCCD làm username → linked = false
```

### 2. User tạo request ADD_PERSON
```
- Nếu user chưa linked: Có thể nhập householdId hoặc để trống
- Nếu user đã linked: Sử dụng household của họ
- Gửi request với targetHouseholdId hoặc không
```

### 3. Tổ trưởng duyệt
```
- Xem request ADD_PERSON
- Nhập householdId nếu chưa có
- Approve → Tự động tạo nhan_khau và link user
```

### 4. User sau khi được duyệt
```
Login lại → linked = true → Có thể sử dụng đầy đủ chức năng
```

## Database Migration
**File:** `database/migrations/003_add_user_person_linking.sql`

Đã có sẵn các thành phần:
- Hàm `normalize_cccd()`
- Cột `users.personId`
- Trigger tự động link khi insert nhan_khau
- Unique constraint cho nhan_khau.cccd

## Testing

### Test Case 1: User mới tạo request
1. User đăng ký account mới
2. Login → Hiển thị "Chưa có hồ sơ nhân khẩu"
3. Tạo request ADD_PERSON → Có thể nhập householdId hoặc để trống
4. Tổ trưởng approve với householdId
5. User login lại → linked = true

### Test Case 2: User đã linked tạo request
1. User đã có hồ sơ nhân khẩu
2. Tạo request ADD_PERSON → Tự động dùng household của họ
3. Tổ trưởng approve bình thường

## Backward Compatibility
- User cũ đã linked: Hoạt động bình thường
- User cũ chưa linked: Có thể tạo request như user mới
- Không ảnh hưởng đến các request type khác

## Files Changed
```
database/migrations/003_add_user_person_linking.sql  # (đã có)
backend/backend/src/routes/requests.routes.ts        # Updated validation & approve
frontend/src/pages/citizen/YeuCau.tsx               # Updated AddPersonModal
frontend/src/pages/Requests.tsx                     # Added householdId field
frontend/src/services/api.ts                        # Updated approveRequest
```

## Kết luận
Bây giờ người dùng mới có thể:
1. ✅ Đăng ký account bằng CCCD
2. ✅ Tạo request để được thêm vào hệ thống
3. ✅ Tổ trưởng duyệt và tự động link
4. ✅ Sử dụng đầy đủ chức năng sau khi linked

Hệ thống OPTION B đã hoàn chỉnh! 🎉

