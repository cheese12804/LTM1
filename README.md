# Remote Desktop - WebRTC & WebSocket

Dự án Remote Desktop sử dụng WebRTC để truyền tải video và WebSocket để truyền tín hiệu điều khiển (chuột, bàn phím).

## 🚀 Tính năng

- **WebRTC**: Truyền tải video màn hình theo thời gian thực (P2P)
- **WebSocket**: Gửi tín hiệu điều khiển chuột và bàn phím
- **Giao diện đơn giản**: Dễ sử dụng và hiểu

## 📋 Yêu cầu

- Java 11 hoặc cao hơn
- Maven 3.6+
- Trình duyệt hiện đại hỗ trợ WebRTC (Chrome, Firefox, Edge)

## 🔧 Cài đặt nhanh

1. **Build project:**
```bash
mvn clean install
```

2. **Chạy server:**
```powershell
# Windows PowerShell
.\run.ps1 8082
```

```cmd
# Windows CMD
run.bat 8082
```

```bash
# Linux/Mac
./run.sh 8082
```

3. **Mở trình duyệt:**
```
http://localhost:8082
```

> 📖 **Xem hướng dẫn chi tiết:** [HUONG_DAN.md](HUONG_DAN.md)

## 📖 Sử dụng

### Chạy trên 1 máy:
1. Chạy server: `.\run.ps1 8082`
2. Mở trình duyệt: `http://localhost:8082`
3. Mở 2 tab để test P2P

### Chạy trên 2 máy:
1. Máy A: Chạy server, ghi nhớ IP
2. Máy B: Truy cập `http://[IP_MÁY_A]:8082`

> 📖 **Xem hướng dẫn chi tiết:** [HUONG_DAN.md](HUONG_DAN.md)

## 🏗️ Cấu trúc Project

```
LTM1/
├── pom.xml                          # Maven configuration
├── README.md                        # File hướng dẫn
└── src/
    └── main/
        ├── java/
        │   └── com/
        │       └── ltm/
        │           └── remotedesktop/
        │               ├── ServerMain.java              # Server chính
        │               ├── RemoteDesktopWebSocket.java  # WebSocket handler
        │               ├── RemoteDesktopWebSocketCreator.java
        │               └── StaticFileServlet.java       # Static file server
        └── webapp/
            ├── index.html            # Giao diện chính
            ├── style.css             # CSS styling
            ├── main.js               # Main JavaScript
            ├── websocket-client.js   # WebSocket client
            └── webrtc-client.js      # WebRTC client
```

## 🏗️ Kiến trúc

**Server (Java) làm 2 việc:**
1. Phục vụ file client (HTML/JS/CSS) qua HTTP
2. Xử lý WebSocket để nhận tín hiệu điều khiển

**Client (HTML/JS) chạy trên trình duyệt:**
- Được tải từ server khi truy cập `http://localhost:8082`
- Kết nối WebSocket đến server để gửi tín hiệu

> 📖 **Xem giải thích chi tiết:** [KIEN_TRUC.md](KIEN_TRUC.md)

## 🔍 Giải thích Code

### Server Side (Java)

- **ServerMain.java**: Khởi động HTTP server và WebSocket server
- **RemoteDesktopWebSocket.java**: 
  - Nhận tín hiệu điều khiển từ client
  - Sử dụng Java Robot để điều khiển chuột/bàn phím
  - Xử lý WebRTC signaling

### Client Side (JavaScript)

- **websocket-client.js**: 
  - Kết nối WebSocket
  - Gửi tín hiệu chuột, bàn phím
  - Gửi/nhận WebRTC signaling

- **webrtc-client.js**: 
  - Lấy màn hình từ browser (getDisplayMedia)
  - Thiết lập PeerConnection
  - Xử lý video stream

- **main.js**: 
  - Điều phối WebRTC và WebSocket
  - Xử lý events từ UI
  - Chuyển đổi tọa độ chuột

## ⚙️ Cấu hình

### Thay đổi Port

**Cách 1: Tham số dòng lệnh (Khuyến nghị)**
```bash
.\run.ps1 9000
```

**Cách 2: Biến môi trường**
```bash
# Windows
set PORT=9000
mvn exec:java

# Linux/Mac
export PORT=9000
mvn exec:java
```

> 📖 **Xem thêm:** [HUONG_DAN.md](HUONG_DAN.md)

### STUN/TURN Servers

Sửa trong `webrtc-client.js`:
```javascript
iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Thêm TURN server nếu cần
]
```

## ⚠️ Lưu ý

1. **Bảo mật**: 
   - Project này chỉ dùng cho mục đích học tập
   - Trong môi trường production, cần thêm authentication và encryption

2. **NAT/Firewall**:
   - WebRTC có thể không hoạt động tốt qua NAT
   - Cần TURN server cho các trường hợp phức tạp

3. **Hiệu suất**:
   - Video quality phụ thuộc vào băng thông
   - Có thể cần điều chỉnh resolution trong code

## 🐛 Xử lý Lỗi

- **Không kết nối được WebSocket**: Kiểm tra firewall và port
- **Không chia sẻ được màn hình**: Kiểm tra quyền trình duyệt
- **Chuột/bàn phím không hoạt động**: Kiểm tra console log

## 📝 License

Dự án này được tạo cho mục đích học tập.

## 👨‍💻 Tác giả

LTM Remote Desktop Project

