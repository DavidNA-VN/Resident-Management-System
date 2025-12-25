# Thiết kế màn hình "Yêu cầu tách hộ khẩu"

## 1. Wireframe (Layout mô tả bằng text)

```
┌─────────────────────────────────────────────────────────────────┐
│  Yêu cầu tách hộ khẩu                                    [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Thông tin hộ khẩu hiện tại ───────────────────────────┐   │
│  │  Số hộ khẩu: HK001234                                    │   │
│  │  Địa chỉ: Số 123, Đường ABC, Phường XYZ...             │   │
│  │  Chủ hộ: Nguyễn Văn A (079912345678)                    │   │
│  │                                                           │   │
│  │  ┌─ Bảng nhân khẩu (read-only) ──────────────┐         │   │
│  │  │ Họ tên | CCCD | Ngày sinh | Giới tính | ... │        │   │
│  │  │ Nguyễn Văn A | 079912345678 | ...        │        │   │
│  │  └─────────────────────────────────────────────┘         │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Chọn nhân khẩu tách ra ────────────────────────────────┐   │
│  │  [✓] Select All                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ [ ] Họ tên | CCCD | Ngày sinh | ...              │   │   │
│  │  │ [✓] Nguyễn Thị B | 079912345679 | ...            │   │   │
│  │  │ [✓] Nguyễn Văn C | 079912345680 | ...            │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Chọn chủ hộ mới ──────────────────────────────────────┐   │
│  │  [Dropdown: Chọn từ danh sách đã tick]                 │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Quan hệ với chủ hộ mới ───────────────────────────────┐   │
│  │  Nhân khẩu          | Quan hệ                           │   │
│  │  Nguyễn Thị B       | [Dropdown: Vợ/Chồng]             │   │
│  │  Nguyễn Văn C       | [Dropdown: Con]                   │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Thông tin hộ khẩu mới ─────────────────────────────────┐   │
│  │  Tỉnh/Thành:    [________________]                       │   │
│  │  Quận/Huyện:    [________________]                       │   │
│  │  Phường/Xã:     [________________]                       │   │
│  │  Đường/Phố:     [________________]                       │   │
│  │  Số nhà:        [________________]                       │   │
│  │  Địa chỉ đầy đủ: [________________]                      │   │
│  │  Ngày hiệu lực:  [Date Picker]                          │   │
│  │  Lý do:         [Textarea 4 rows]                       │   │
│  │  Ghi chú:       [Textarea 2 rows]                       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ Đính kèm giấy tờ ─────────────────────────────────────┐   │
│  │  [Choose Files] PDF, JPG, PNG (max 10MB)                │   │
│  │  [File 1.pdf] (123 KB) [X]                              │   │
│  │  [File 2.jpg] (456 KB) [X]                              │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  [✓] Tôi cam kết thông tin đúng sự thật                  │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Hủy]                                          [Gửi yêu cầu]   │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Danh sách Component React

### 2.1 Page Components
- **`YeuCau.tsx`** - Trang chính hiển thị danh sách loại yêu cầu và các yêu cầu đã gửi

### 2.2 Modal Components
- **`TachHoKhauModal.tsx`** - Modal riêng cho form tách hộ khẩu (phức tạp, nhiều section)
- **`RequestModal.tsx`** - Modal chung cho các yêu cầu đơn giản (tạm vắng, tạm trú, sửa, xóa)

### 2.3 Sub-components (trong TachHoKhauModal)
- **Thông tin hộ khẩu hiện tại** (read-only section)
- **Bảng chọn nhân khẩu** (table với checkbox)
- **Dropdown chọn chủ hộ mới** (filtered từ danh sách đã chọn)
- **Bảng quan hệ** (table để set quan hệ cho từng nhân khẩu)
- **Form địa chỉ mới** (grid form với nhiều field)
- **File upload** (với preview và remove)

## 3. Danh sách Field + Type + Validation

### 3.1 Thông tin hộ khẩu hiện tại (Read-only)
| Field | Type | Validation |
|-------|------|------------|
| Số hộ khẩu | string | - |
| Địa chỉ | string | - |
| Chủ hộ | string + CCCD | - |
| Bảng nhân khẩu | Array<NhanKhau> | - |

### 3.2 Chọn nhân khẩu tách ra
| Field | Type | Validation |
|-------|------|------------|
| selectedNhanKhauIds | number[] | Required, min 1 item, chỉ chọn active |

### 3.3 Chọn chủ hộ mới
| Field | Type | Validation |
|-------|------|------------|
| chuHoMoiId | number | Required, phải thuộc selectedNhanKhauIds |

### 3.4 Quan hệ trong hộ mới
| Field | Type | Validation |
|-------|------|------------|
| quanHeMap | Record<number, string> | Optional, key = nhanKhauId, value = quanHe enum |

### 3.5 Thông tin hộ khẩu mới
| Field | Type | Validation |
|-------|------|------------|
| tinhThanh | string | Required |
| quanHuyen | string | Required |
| phuongXa | string | Required |
| duongPho | string | Required |
| soNha | string | Required |
| diaChiDayDu | string | Optional (auto-fill từ các field trên) |
| ngayHieuLuc | date | Required, future date |
| lyDo | string | Required, min 10 chars |
| ghiChu | string | Optional |

### 3.6 Đính kèm giấy tờ
| Field | Type | Validation |
|-------|------|------------|
| files | File[] | Optional, max 10MB/file, accept: pdf/jpg/png |

### 3.7 Cam kết
| Field | Type | Validation |
|-------|------|------------|
| camKet | boolean | Required, must be true |

## 4. Payload JSON mẫu cho "Yêu cầu tách hộ khẩu"

```json
{
  "type": "TACH_HO_KHAU",
  "payload": {
    "hoKhauCuId": 123,
    "nhanKhauIds": [456, 457, 458],
    "chuHoMoiId": 456,
    "diaChiMoi": {
      "tinhThanh": "Hà Nội",
      "quanHuyen": "Hà Đông",
      "phuongXa": "La Khê",
      "duongPho": "Đường TDP7",
      "soNha": "Số 789",
      "diaChiDayDu": "Số 789, Đường TDP7, Phường La Khê, Quận Hà Đông, Hà Nội"
    },
    "ngayHieuLuc": "2024-03-15",
    "lyDo": "Gia đình muốn tách hộ khẩu để quản lý riêng biệt",
    "ghiChu": "Đã chuẩn bị đầy đủ giấy tờ",
    "quanHeMap": {
      "456": "chu_ho",
      "457": "vo_chong",
      "458": "con"
    },
    "attachments": [
      {
        "name": "CCCD_chu_ho.pdf",
        "size": 123456,
        "type": "application/pdf"
      },
      {
        "name": "giay_to_nha.jpg",
        "size": 456789,
        "type": "image/jpeg"
      }
    ]
  }
}
```

## 5. API Endpoint

### POST /requests
- **Content-Type**: `application/json` (cho các yêu cầu thông thường) hoặc `multipart/form-data` (cho tách hộ khẩu có file)
- **Authorization**: Bearer token
- **Request Body** (JSON):
  ```json
  {
    "type": "TACH_HO_KHAU",
    "payload": { ... }
  }
  ```
- **Request Body** (FormData khi có file):
  - `type`: "TACH_HO_KHAU"
  - `hoKhauCuId`: number
  - `nhanKhauIds`: JSON string array
  - `chuHoMoiId`: number
  - `diaChiMoi`: JSON string object
  - `ngayHieuLuc`: date string
  - `lyDo`: string
  - `ghiChu`: string (optional)
  - `quanHeMap`: JSON string object (optional)
  - `attachments`: File[] (optional)

## 6. UI Style Requirements

- Modal form theo style hiện có (giống form "Thêm nhân khẩu mới")
- Bảng chọn nhân khẩu rõ ràng, có highlight khi selected
- Checkbox với visual feedback (checked state)
- Dropdown chủ hộ mới chỉ hiện khi có nhân khẩu được chọn
- Form địa chỉ mới: 2 cột grid, responsive
- File upload: hiển thị tên + size + nút xóa
- Thông báo lỗi hiển thị ngay dưới field
- Disable submit button khi đang gửi

## 7. Flow xử lý

1. User click "Yêu cầu tách hộ khẩu" card
2. Modal mở, load thông tin hộ khẩu hiện tại
3. User chọn nhân khẩu (checkbox)
4. User chọn chủ hộ mới (dropdown filtered)
5. User set quan hệ cho từng nhân khẩu (nếu cần)
6. User nhập thông tin hộ khẩu mới
7. User upload file (optional)
8. User tick cam kết
9. User click "Gửi yêu cầu"
10. Validate form
11. Gọi API (với FormData nếu có file)
12. Hiển thị toast success + mã yêu cầu
13. Đóng modal, refresh danh sách yêu cầu

## 8. Error Handling

- Validation errors: hiển thị ngay dưới field
- API errors: hiển thị ở top của modal
- File size errors: warning message
- Network errors: retry button


