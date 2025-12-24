# 🚀 Hướng dẫn chạy ứng dụng.

## Cách 1: Chạy tự động (Khuyến nghị)

```powershell
.\start-dev.ps1
```

Script này sẽ tự động:
- ✅ Khởi động Backend (port 3000)
- ✅ Khởi động Frontend (port 5173)
- ✅ Hiển thị trạng thái và log

## Cách 2: Chạy thủ công

### Terminal 1 - Backend:
```powershell
cd backend
npm run start:dev
```

### Terminal 2 - Frontend:
```powershell
cd frontend
npm run dev
```

## 🌐 Truy cập

- **Frontend (Giao diện web):** http://localhost:5173
- **Backend API:** http://localhost:3000/api

## 📋 Kiểm tra

### Backend đang chạy?
```powershell
Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet
```

### Frontend đang chạy?
```powershell
Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet
```

## ⚠️ Lưu ý

1. **Database phải đã được tạo** (`census_management` trên PostgreSQL port 5434)
2. **File `.env` phải tồn tại** trong thư mục `backend/`
3. **Node.js version:** 18-20 (khuyến nghị 20.19.6)

## 🐛 Xử lý lỗi

### Port đã được sử dụng?
```powershell
# Tìm process đang dùng port
Get-NetTCPConnection -LocalPort 3000
Get-NetTCPConnection -LocalPort 5173

# Dừng process
Stop-Process -Id <PID> -Force
```

### Database connection error?
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra port trong `.env` (phải là 5434)
- Kiểm tra database `census_management` đã tồn tại





