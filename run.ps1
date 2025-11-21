# Remote Desktop Server - PowerShell Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Remote Desktop Server - PowerShell" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra port từ tham số
if ($args.Count -eq 0) {
    $PORT = 8082
    Write-Host "Sử dụng port mặc định: $PORT" -ForegroundColor Yellow
} else {
    $PORT = $args[0]
    Write-Host "Sử dụng port: $PORT" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Đang build project..." -ForegroundColor Green
& mvn clean install -q

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "LỖI: Build thất bại!" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát"
    exit 1
}

Write-Host ""
Write-Host "Đang khởi động server trên port $PORT..." -ForegroundColor Green
Write-Host ""
& mvn exec:java "-Dexec.args=$PORT"

Read-Host "`nNhấn Enter để thoát"

