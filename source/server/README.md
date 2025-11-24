# MODULE SERVER – WEBRTC SIGNALING

> 🖥️ *Module **server** là ứng dụng Java (Jetty) chịu trách nhiệm phục vụ file tĩnh, xử lý WebSocket signaling, chuyển tiếp WebRTC messages và cung cấp HTTP API `/api/control` (fallback) cho toàn bộ hệ thống remote desktop.*

---

## 🎯 MỤC TIÊU

Server Java đảm nhiệm:
- **Serve static client**: phân phát `index.html`, JS, CSS cho browser thông qua `StaticFileServlet` (thư mục `src/main/webapp`).
- **WebSocket signaling**: lắng nghe tại `/ws`, quản lý danh sách client, auto pair HOST/VIEWER, relay WebRTC Offer/Answer/ICE.
- **(Tuỳ chọn – chế độ local)** HTTP API `/api/control` để Viewer gửi control command qua HTTP khi server và máy được điều khiển là cùng một máy.
- **Khi deploy thật trên VPS**:
  - Server không dùng Robot.
  - Control chuột/bàn phím được chuyển về agent local chạy trên máy Host qua `http://127.0.0.1:<PORT_AGENT>/api/control`.

---

## ⚙️ CÔNG NGHỆ SỬ DỤNG

| Thành phần | Công nghệ |
|------------|-----------|
| Ngôn ngữ | Java 11+ |
| Web server | Jetty embedded |
| WebSocket | Jetty WebSocket API (`WebSocketUpgradeFilter`, `RemoteDesktopWebSocket`) |
| Servlet | `ServerMain`, `StaticFileServlet`, `ControlServlet` (chỉ dùng local) |
| JSON | Gson (WebSocket), Jackson hoặc Gson cho HTTP control |
| Build | Maven (`pom.xml` ở thư mục root `LTM1`) |

---

## 🚀 HƯỚNG DẪN CHẠY (LOCAL / VPS)

### 1. Chuẩn bị
```bash
cd LTM1
mvn clean package   # tạo target/remote-desktop-1.0-SNAPSHOT.jar
```

### 2. Chạy server (local hoặc VPS)
```bash
# Chạy từ JAR
java -jar target/remote-desktop-1.0-SNAPSHOT.jar 8082
# Nếu không truyền tham số, port mặc định là 8082

# Hoặc chạy trực tiếp bằng Maven
mvn exec:java
mvn exec:java -Dexec.args="8082"   # chỉ định port
```

Server sẽ:
- Lắng nghe HTTP/WS tại: `http://0.0.0.0:<PORT>`
- Serve client web từ: `src/main/webapp`
- WebSocket endpoint: `ws://[HOST]:PORT/ws`
- HTTP API (tuỳ chọn – chỉ dùng khi chạy local): `http://[HOST]:PORT/api/control`

### 3. Triển khai lên VPS với HTTPS
1. Upload project `LTM1` lên VPS (gồm `pom.xml`, `src/main/java`, `src/main/webapp`).
2. Build & chạy:
   ```bash
   cd /root/LTM1
   mvn clean package
   java -jar target/remote-desktop-1.0-SNAPSHOT.jar 8082
   ```
3. Cấu hình Nginx reverse proxy:
   - Port ngoài: 80/443 → proxy về `http://127.0.0.1:8082`
   - Cấp SSL (Let’s Encrypt hoặc self-signed nếu chỉ dùng IP)
4. Client truy cập `https://IP_VPS` để dùng giao diện web (bắt buộc HTTPS để `getDisplayMedia()` hoạt động ngoài localhost).

---

## 📦 CẤU TRÚC THƯ MỤC
```
source/server/
├── README.md
├── pom.xml
└── src/main/java/
    ├── ServerMain.java              # Entry point, cấu hình Jetty
    ├── StaticFileServlet.java       # Serve static client
    ├── ControlServlet.java          # HTTP control fallback
    ├── RemoteDesktopWebSocket.java  # WebSocket signaling & control
    └── RemoteDesktopWebSocketCreator.java
```

---

## 🔄 LUỒNG HOẠT ĐỘNG
1. `ServerMain` đọc port (args/env) → khởi tạo Jetty.
2. `StaticFileServlet` trả về UI khi browser GET `/`.
3. Client gọi `ws://HOST/ws` → `RemoteDesktopWebSocket` tạo instance (mỗi client).
4. Khi có ≥2 client:
   - Auto pair hoặc `connect-peer`.
   - Relay WebRTC signaling (`webrtc-signal`) giữa 2 đầu.
5. Viewer gửi điều khiển:
   - **Ưu tiên** DataChannel → Host agent (`http://127.0.0.1:9003/api/control`).
   - **Fallback**: POST `/api/control` trên server (Robot local).

---

## 🧪 KIỂM THỬ CƠ BẢN
- **Local**: chạy server, mở 2 tab `http://localhost:8082`, kiểm tra auto pair + streaming.
- **LAN**: máy khác truy cập `http://IP_SERVER:8082`, test signaling và control.
- **VPS + agent**: deploy server trên VPS, Host chạy agent 9003, xác minh DataChannel điều khiển.
- **API test**:
  ```bash
  curl -X POST http://localhost:8082/api/control \
       -H "Content-Type: application/json" \
       -d '{"type":"mouseMove","x":100,"y":200}'
  ```

---

## 📝 LƯU Ý & TROUBLESHOOTING
- **Port**: thay đổi bằng tham số CLI hoặc env `PORT`. Đảm bảo mở firewall (8082 hoặc port bạn chọn, 80/443 nếu reverse proxy).
- **Robot trên VPS**: server Jetty không cần Robot; control thực thi ở agent local (Máy A). Nếu chạy server + control chung máy, `ControlServlet` sẽ dùng `Robot`.
- **WebSocket disconnect**: kiểm tra `WebSocketUpgradeFilter` mapping `/ws`, xem log Jetty.
- **Static files 404**: đảm bảo `context.setResourceBase("../client")` đúng tương đối (chạy server từ `source/server`).
- **HTTPS bắt buộc cho chia sẻ màn hình** khi truy cập từ internet (ngoại trừ `http://localhost`).

---

## 📚 TÀI LIỆU THAM KHẢO
- `source/server/WEBSOCKET_SERVER_README.md`: hướng dẫn sâu cho lập trình viên WebSocket.
- `source/server/CHI_TIET_CODE_WEBSOCKET.md`: phân tích từng method.
- README gốc (root) – phần “Deploy lên VPS” và “Bước 1.5: Khởi động Agent”.

---

👉 Sau khi server chạy, mở `http://localhost:8082` (hoặc domain của bạn) để sử dụng client web đã cập nhật. 