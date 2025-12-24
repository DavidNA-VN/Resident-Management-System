# Script start cả backend và frontend
# Sử dụng: .\start-dev.ps1

Write-Host "`n🚀 KHOI DONG BACKEND VA FRONTEND..." -ForegroundColor Cyan
Write-Host ""

# Kiểm tra và kill các process cũ trên port 3000 và 5173
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

if ($port3000) {
    Write-Host "⚠️  Port 3000 đang được sử dụng, đang đóng..." -ForegroundColor Yellow
    Stop-Process -Id $port3000.OwningProcess -Force -ErrorAction SilentlyContinue
}

if ($port5173) {
    Write-Host "⚠️  Port 5173 đang được sử dụng, đang đóng..." -ForegroundColor Yellow
    Stop-Process -Id $port5173.OwningProcess -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# Start Backend
Write-Host "📦 Đang khởi động Backend (port 3000)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location backend
    npm run start:dev
}

# Start Frontend
Write-Host "🎨 Đang khởi động Frontend (port 5173)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location frontend
    npm run dev
}

Write-Host ""
Write-Host "⏳ Đang chờ server khởi động..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

# Kiểm tra trạng thái
$backendRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
$frontendRunning = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue

Write-Host ""
Write-Host "=== TRANG THAI ===" -ForegroundColor Cyan
if ($backendRunning) {
    Write-Host "✅ Backend:  http://localhost:3000/api" -ForegroundColor Green
} else {
    Write-Host "❌ Backend:  Chưa sẵn sàng (kiểm tra terminal)" -ForegroundColor Red
}

if ($frontendRunning) {
    Write-Host "✅ Frontend: http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: Chưa sẵn sàng (kiểm tra terminal)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 LỆNH HỮU ÍCH:" -ForegroundColor Cyan
Write-Host "   Xem log Backend:  Receive-Job -Id $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Xem log Frontend: Receive-Job -Id $($frontendJob.Id)" -ForegroundColor Gray
Write-Host "   Dừng Backend:     Stop-Job -Id $($backendJob.Id); Remove-Job -Id $($backendJob.Id)" -ForegroundColor Gray
Write-Host "   Dừng Frontend:    Stop-Job -Id $($frontendJob.Id); Remove-Job -Id $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Mở trình duyệt: http://localhost:5173" -ForegroundColor Green
Write-Host ""

# Giữ script chạy để xem output
Write-Host "Nhấn Ctrl+C để dừng tất cả..." -ForegroundColor Yellow
try {
    while ($true) {
        Start-Sleep -Seconds 5
        Receive-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue | Write-Host
    }
} finally {
    Write-Host "`n🛑 Đang dừng servers..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
}





