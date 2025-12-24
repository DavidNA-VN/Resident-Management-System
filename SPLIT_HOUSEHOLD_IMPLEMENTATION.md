# Implementation Guide: Yêu cầu tách hộ khẩu

## Tóm tắt

Đã implement tính năng "Yêu cầu tách hộ khẩu" cho role người dân với component `SplitHouseholdRequestModal.tsx` và tích hợp vào trang `/citizen/yeu-cau`.

## Files đã tạo/cập nhật

### 1. Component mới
- **`frontend/src/components/SplitHouseholdRequestModal.tsx`**
  - Modal form đầy đủ cho yêu cầu tách hộ khẩu
  - Style đồng bộ với các modal khác trong dự án
  - Validation đầy đủ ở frontend

### 2. Files đã cập nhật
- **`frontend/src/pages/citizen/YeuCau.tsx`**
  - Tích hợp `SplitHouseholdRequestModal`
  - Load household data khi mở modal
  - Handle submit và success message

- **`frontend/src/services/api.ts`**
  - Thêm method `getMyHousehold()` - có mock fallback
  - Thêm method `createSplitHouseholdRequest()` - có mock fallback

## Cấu trúc Component

### SplitHouseholdRequestModal Props
```typescript
interface SplitHouseholdRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SplitHouseholdRequestData) => Promise<void>;
  household: Household | null;
  nhanKhauList: NhanKhau[];
  isLoading?: boolean;
}
```

### Data Interface
```typescript
interface SplitHouseholdRequestData {
  hoKhauId: number;
  selectedNhanKhauIds: number[];
  newChuHoId: number;
  newAddress: string;
  expectedDate: string;
  reason: string;
  note?: string;
}
```

## Flow hoạt động

1. **User click card "Yêu cầu tách hộ khẩu"**
   - `selectedType` được set thành `"TACH_HO_KHAU"`
   - Modal `SplitHouseholdRequestModal` được mở

2. **Load data khi mở modal**
   - Nếu chưa có `householdInfo`, gọi `getMyHousehold()` để load
   - Hiển thị loading state nếu đang fetch

3. **User điền form**
   - Chọn nhân khẩu (checkbox, >= 1 người)
   - Chọn chủ hộ mới (dropdown, chỉ từ danh sách đã chọn)
   - Nhập địa chỉ hộ mới, ngày dự kiến, lý do, ghi chú

4. **Validation**
   - Frontend validate: selectedNhanKhauIds, newChuHoId, newAddress, expectedDate, reason
   - Hiển thị error inline dưới mỗi field

5. **Submit**
   - Gọi `handleSubmitSplitHousehold()` trong `YeuCau.tsx`
   - Gọi API `createSplitHouseholdRequest()`
   - Nếu thành công: hiển thị toast "Gửi yêu cầu tách hộ khẩu thành công!"
   - Đóng modal, refresh danh sách yêu cầu

## API Integration

### Hiện tại (tạm thời)

#### GET /citizen/household
- Endpoint hiện có trong backend
- Response format: 
  ```json
  {
    "success": true,
    "data": {
      "household": { ... },
      "members": [ ... ],
      "chuHo": { ... }
    }
  }
  ```
- Code đã adapt data structure trong `getMyHousehold()`

#### POST /requests
- Endpoint hiện có trong backend
- Body format:
  ```json
  {
    "type": "TACH_HO_KHAU",
    "payload": {
      "hoKhauId": 123,
      "selectedNhanKhauIds": [1, 2, 3],
      "newChuHoId": 2,
      "newAddress": "...",
      "expectedDate": "2025-12-24",
      "reason": "...",
      "note": "..."
    }
  }
  ```

### Khi backend sẵn sàng (cần thay đổi)

#### 1. GET /citizen/my-household (endpoint mới)

**File cần sửa:** `frontend/src/services/api.ts`

**Tìm method:** `getMyHousehold()`

**Thay đổi:**
```typescript
// TỪ:
return await this.request<{...}>("/citizen/household", {...});

// THÀNH:
return await this.request<{
  success: boolean;
  data: {
    hoKhau: any;
    nhanKhauList: any[];
  };
}>("/citizen/my-household", {
  method: "GET",
});
```

**Response format mong đợi:**
```json
{
  "success": true,
  "data": {
    "hoKhau": {
      "id": 123,
      "soHoKhau": "HK001234",
      "diaChi": "...",
      "diaChiDayDu": "...",
      "chuHo": {
        "hoTen": "...",
        "cccd": "..."
      }
    },
    "nhanKhauList": [
      {
        "id": 1,
        "hoTen": "...",
        "cccd": "...",
        "quanHe": "chu_ho"
      }
    ]
  }
}
```

#### 2. POST /citizen/requests/split-household (endpoint mới)

**File cần sửa:** `frontend/src/services/api.ts`

**Tìm method:** `createSplitHouseholdRequest()`

**Thay đổi:**
```typescript
// TỪ:
return await this.request<{...}>("/requests", {
  method: "POST",
  body: JSON.stringify({
    type: "TACH_HO_KHAU",
    payload: data,
  }),
});

// THÀNH:
return await this.request<{ success: boolean; data: any }>("/citizen/requests/split-household", {
  method: "POST",
  body: JSON.stringify(data),
});
```

**Request body format:**
```json
{
  "hoKhauId": 123,
  "selectedNhanKhauIds": [1, 2, 3],
  "newChuHoId": 2,
  "newAddress": "Số 789, Đường TDP7, Phường La Khê...",
  "expectedDate": "2025-12-24",
  "reason": "Gia đình muốn tách hộ khẩu để quản lý riêng biệt",
  "note": "Đã chuẩn bị đầy đủ giấy tờ"
}
```

**Response format mong đợi:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "hoKhauId": 123,
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Validation Rules

### Frontend (đã implement)
- ✅ Phải chọn >= 1 nhân khẩu
- ✅ Phải chọn chủ hộ mới
- ✅ Địa chỉ hộ mới không rỗng
- ✅ Ngày dự kiến tách hộ không rỗng
- ✅ Lý do không rỗng

### Backend (nên thêm)
- Validate `hoKhauId` thuộc về user hiện tại
- Validate tất cả `selectedNhanKhauIds` thuộc `hoKhauId`
- Validate `newChuHoId` thuộc `selectedNhanKhauIds`
- Validate `expectedDate` >= ngày hiện tại
- Validate `reason` min length

## UI/UX Features

- ✅ Modal style đồng bộ với các modal khác
- ✅ Form sections rõ ràng (A, B, C, D, E)
- ✅ Checkbox table với select all
- ✅ Dropdown chủ hộ mới chỉ hiện nhân khẩu đã chọn
- ✅ Inline error messages
- ✅ Loading state khi fetch data
- ✅ Disable submit button khi đang submit
- ✅ Toast success message sau khi submit thành công

## Testing Checklist

- [ ] Mở modal khi click card "Yêu cầu tách hộ khẩu"
- [ ] Load được thông tin hộ khẩu hiện tại
- [ ] Hiển thị danh sách nhân khẩu với checkbox
- [ ] Select all checkbox hoạt động đúng
- [ ] Dropdown chủ hộ mới chỉ hiện nhân khẩu đã chọn
- [ ] Validation hiển thị đúng khi submit không đầy đủ
- [ ] Submit thành công và hiển thị toast
- [ ] Modal đóng sau khi submit thành công
- [ ] Danh sách yêu cầu được refresh

## Notes

- Component sử dụng TypeScript strict mode
- Style sử dụng Tailwind CSS (đồng bộ với dự án)
- API calls có try-catch và mock fallback để dễ test
- Code đã được format và không có linter errors


