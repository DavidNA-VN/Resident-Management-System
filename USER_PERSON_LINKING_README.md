# Hệ thống Liên kết User - Nhân khẩu

## Tổng quan
Implement OPTION B: Người dân đăng ký bằng CCCD trước, hệ thống tự động liên kết khi tổ trưởng duyệt yêu cầu thêm nhân khẩu.

## Các thay đổi chính

### 1. Database Schema
- **Migration:** `database/migrations/003_add_user_person_linking.sql`
- **Thêm cột:** `users.personId` (FK -> nhan_khau.id)
- **Hàm chuẩn hoá:** `normalize_cccd(text)` - loại bỏ ký tự không phải số
- **Trigger tự động:** Liên kết user khi insert nhan_khau có CCCD
- **Unique constraint:** nhan_khau.cccd (sử dụng hàm normalize)

### 2. Backend Authentication
- **Register:** Người dân dùng CCCD làm username (tự động normalize)
- **Login:** Kiểm tra liên kết nhan_khau, trả về `linked`, `personInfo`, `message`
- **GET /auth/me:** Cũng trả về thông tin liên kết

### 3. Auto-linking Logic
- **Trigger:** Tự động liên kết khi insert nhan_khau có CCCD
- **Login:** Nếu chưa có personId cứng thì tìm theo CCCD và tự động link
- **Approve requests:** Trigger sẽ xử lý việc liên kết

### 4. Frontend Updates
- **Login response:** Hiển thị thông báo nếu chưa linked
- **Citizen Home:** Hiển thị hướng dẫn tạo yêu cầu nếu chưa linked
- **API interfaces:** Thêm `linked`, `personInfo`, `message` fields

## Cách sử dụng

### 1. Import Database
```bash
psql -U username -d database -f database/migrations/003_add_user_person_linking.sql
```

### 2. Test Register (Người dân)
```json
POST /auth/register
{
  "username": "123456789012",  // CCCD
  "password": "password123",
  "fullName": "Nguyễn Văn A",
  "role": "nguoi_dan"
}
```
- Username sẽ được normalize thành "123456789012"

### 3. Test Login (Người dân)
```json
POST /auth/login
{
  "username": "123456789012",
  "password": "password123"
}
```
**Response nếu chưa linked:**
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "user": {
      "id": 1,
      "username": "123456789012",
      "role": "nguoi_dan",
      "fullName": "Nguyễn Văn A",
      "linked": false,
      "message": "Chưa có hồ sơ nhân khẩu. Vui lòng tạo yêu cầu hoặc chờ tổ trưởng duyệt."
    }
  }
}
```

**Response nếu đã linked:**
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "user": {
      "id": 1,
      "username": "123456789012",
      "role": "nguoi_dan",
      "fullName": "Nguyễn Văn A",
      "linked": true,
      "personInfo": {
        "personId": 123,
        "hoTen": "Nguyễn Văn A",
        "householdId": 456
      }
    }
  }
}
```

### 4. Test Approve Request
1. Tổ trưởng approve request ADD_PERSON với CCCD "123456789012"
2. Hệ thống tự động insert nhan_khau và liên kết với user
3. Lần login sau, user sẽ thấy linked=true

## Validation Rules

### CCCD Normalization
- Input: `" 0123-456-789  abc  "` → Output: `"0123456789"`
- Chỉ giữ lại ký tự số 0-9
- Độ dài: 9-12 ký tự (có thể điều chỉnh)

### Unique Constraints
- `users.username`: unique (CCCD đã normalize)
- `nhan_khau.cccd`: unique nếu có giá trị (sử dụng normalize)

### Business Rules
- Người dân có thể register trước, không cần nhan_khau
- Login tự động tìm và link nhan_khau theo CCCD
- Chỉ trẻ sơ sinh mới được phép không có CCCD
- Một user chỉ link với một nhan_khau

## File Structure

```
database/migrations/
├── 003_add_user_person_linking.sql    # Migration chính

backend/backend/src/routes/
├── auth.routes.ts                      # Updated register/login

frontend/src/
├── services/api.ts                     # Updated interfaces
├── pages/Login.tsx                     # Updated login handling
└── pages/citizen/Home.tsx              # Updated UI cho linked status
```

## Troubleshooting

### Lỗi "CCCD không hợp lệ"
- CCCD phải chứa ít nhất 9-12 ký tự số
- Không được chứa ký tự đặc biệt hoặc chữ cái

### Không tự động link sau approve
- Kiểm tra trigger đã được tạo: `SELECT * FROM pg_trigger WHERE tgname = 'trg_auto_link_user_on_person_insert';`
- Kiểm tra nhan_khau.cccd có giá trị và đúng format

### Login chậm
- Thêm index cho users.personId và nhan_khau.cccd nếu cần

## Security Notes
- CCCD được lưu dưới dạng normalize (chỉ số)
- Password vẫn dùng plaintext (demo), production nên dùng bcrypt
- JWT token có thể chứa thêm personId để tối ưu query

## Future Enhancements
- Batch linking cho import dữ liệu cũ
- Manual linking/unlinking cho admin
- Multiple CCCD support (quá khứ/hiện tại)
- CCCD verification với external services

