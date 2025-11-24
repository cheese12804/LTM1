@echo off
echo ========================================
echo Remote Desktop Server - Windows
echo ========================================
echo.

REM Kiểm tra port từ tham số
if "%1"=="" (
    set PORT=8082
    echo Su dung port mac dinh: 8082
) else (
    set PORT=%1
    echo Su dung port: %PORT%
)

echo.
echo Dang build project...
call mvn clean install -q

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo LOI: Build that bai!
    pause
    exit /b 1
)

echo.
echo Dang khoi dong server tren port %PORT%...
echo.
call mvn exec:java -Dexec.args="%PORT%"

pause

