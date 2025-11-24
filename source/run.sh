#!/bin/bash

echo "========================================"
echo "Remote Desktop Server - Linux/Mac"
echo "========================================"
echo ""

# Kiểm tra port từ tham số
if [ -z "$1" ]; then
    PORT=8082
    echo "Sử dụng port mặc định: $PORT"
else
    PORT=$1
    echo "Sử dụng port: $PORT"
fi

echo ""
echo "Đang build project..."
mvn clean install -q

if [ $? -ne 0 ]; then
    echo ""
    echo "LỖI: Build thất bại!"
    exit 1
fi

echo ""
echo "Đang khởi động server trên port $PORT..."
echo ""
mvn exec:java -Dexec.args="$PORT"

