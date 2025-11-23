# 📦 Hướng dẫn Deploy lên VPS

## 🎯 Mục đích

VPS chỉ đóng vai trò **signaling server** và **host web interface**. Tất cả video streaming và điều khiển đều đi qua WebRTC P2P giữa 2 browser (host và viewer), không qua VPS.

---

## ✅ 1. Files CẦN upload lên VPS

### 📁 1.1. Web Interface Files

Upload các file này vào thư mục web server (ví dụ: `/var/www/html/` hoặc thư mục static của Jetty):

```
src/main/webapp/
├── index.html          ✅ Cần
├── main.js             ✅ Cần
├── webrtc-client.js    ✅ Cần
├── websocket-client.js ✅ Cần
└── style.css           ✅ Cần (nếu có)
```

**Lưu ý:** 
- Các file này sẽ được serve bởi Jetty server hoặc Nginx
- Nếu dùng Jetty, các file này sẽ được serve qua `StaticFileServlet`
- Nếu dùng Nginx, copy vào `/var/www/html/` và cấu hình Nginx

---

### 📁 1.2. Java Server Files (Signaling Only)

Chỉ giữ lại các file Java sau trong project:

```
src/main/java/com/ltm/remotedesktop/
├── ServerMain.java                    ✅ Cần - Main server
├── RemoteDesktopWebSocket.java       ✅ Cần - WebSocket signaling
├── RemoteDesktopWebSocketCreator.java ✅ Cần - WebSocket creator
└── StaticFileServlet.java            ✅ Cần - Serve static files
```

**Chức năng:**
- `ServerMain.java`: Khởi động Jetty server, lắng nghe WebSocket connections
- `RemoteDesktopWebSocket.java`: Xử lý WebRTC signaling (offer/answer/ICE candidates)
- `RemoteDesktopWebSocketCreator.java`: Factory để tạo WebSocket instances
- `StaticFileServlet.java`: Serve các file HTML/JS/CSS

---

### 📁 1.3. Build Files

```
pom.xml                                 ✅ Cần - Maven configuration
```

**Dependencies cần thiết trong `pom.xml`:**
- Jetty server
- Jetty WebSocket
- Jackson (nếu cần parse JSON - nhưng VPS không cần ControlServlet)

---

## ❌ 2. Files KHÔNG upload lên VPS

### 🚫 2.1. Control & Robot Files

```
src/main/java/com/ltm/remotedesktop/
└── ControlServlet.java                ❌ KHÔNG cần
```

**Lý do:** 
- `ControlServlet.java` dùng Java Robot để điều khiển chuột/phím
- Robot phải chạy trên **PC thật** (máy host), không phải VPS
- VPS không có màn hình để điều khiển

**Thay thế:**
- Control commands đi qua WebRTC DataChannel từ viewer → host browser
- Host browser gọi agent local (chạy trên PC) tại `http://127.0.0.1:9003/api/control`

---

### 🚫 2.2. Screen Capture Files (nếu có)

```
src/main/java/com/ltm/remotedesktop/
└── ScreenCapture.java                 ❌ KHÔNG cần (nếu có)
```

**Lý do:**
- VPS không có màn hình để capture
- Screen sharing dùng `navigator.mediaDevices.getDisplayMedia()` trên browser host

---

### 🚫 2.3. WebSocket Video Files (nếu có)

```
src/main/java/com/ltm/remotedesktop/
└── HostWebSocketClient.java           ❌ KHÔNG cần (nếu có)
```

**Lý do:**
- Video streaming đã chuyển sang WebRTC P2P
- Không cần WebSocket cho video nữa

---

## 📋 3. Checklist Deploy

### Bước 1: Chuẩn bị code

- [ ] Xóa hoặc không copy `ControlServlet.java` lên VPS
- [ ] Xóa hoặc không copy các file screen capture (nếu có)
- [ ] Xóa hoặc không copy các file WebSocket video (nếu có)
- [ ] Giữ lại: `ServerMain.java`, `RemoteDesktopWebSocket.java`, `RemoteDesktopWebSocketCreator.java`, `StaticFileServlet.java`
- [ ] Giữ lại tất cả files trong `src/main/webapp/`

---

### Bước 2: Build project

```bash
# Trên máy local
mvn clean package
```

File JAR sẽ được tạo tại: `target/remote-desktop-1.0-SNAPSHOT.jar` (hoặc tên tương tự)

---

### Bước 3: Upload lên VPS

**Option A: Upload JAR + web files**

```bash
# Upload JAR
scp target/remote-desktop-1.0-SNAPSHOT.jar user@vps:/opt/remote-desktop/

# Upload web files (nếu dùng Nginx)
scp -r src/main/webapp/* user@vps:/var/www/html/
```

**Option B: Upload source code và build trên VPS**

```bash
# Upload toàn bộ project (trừ ControlServlet.java)
scp -r LTM1 user@vps:/opt/
# Trên VPS: xóa ControlServlet.java, rồi build
```

---

### Bước 4: Chạy server trên VPS

```bash
# SSH vào VPS
ssh user@vps

# Chạy server
cd /opt/remote-desktop
java -jar remote-desktop-1.0-SNAPSHOT.jar 8082

# Hoặc chạy background
nohup java -jar remote-desktop-1.0-SNAPSHOT.jar 8082 > server.log 2>&1 &
```

---

### Bước 5: Cấu hình Firewall (nếu cần)

```bash
# Mở port 8082 (hoặc port bạn dùng)
sudo ufw allow 8082/tcp
```

---

### Bước 6: Cấu hình Nginx (nếu dùng reverse proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 🔍 4. Kiểm tra sau khi deploy

### Test WebSocket Signaling

1. Mở browser: `http://your-vps-ip:8082`
2. Mở Console (F12)
3. Click "Kết nối WebSocket"
4. Phải thấy: `WebSocket connected`

### Test WebRTC Signaling

1. Mở 2 tab hoặc 2 máy khác nhau
2. Tab 1: Click "Bắt đầu chia sẻ màn hình"
3. Tab 2: Click "Kết nối để xem"
4. Phải thấy: Offer/Answer/ICE candidates được trao đổi qua WebSocket

---

## 📊 5. Kiến trúc sau khi deploy

```
┌─────────────┐                    ┌─────────────┐
│   Viewer    │                    │    Host     │
│  (Browser)  │                    │  (Browser)  │
└──────┬──────┘                    └──────┬──────┘
       │                                   │
       │  WebRTC P2P (Video + Control)    │
       │◄─────────────────────────────────►│
       │                                   │
       └──────────┬────────────────────────┘
                  │
                  │ WebSocket Signaling
                  │ (Offer/Answer/ICE)
                  │
         ┌────────▼────────┐
         │   VPS Server    │
         │  (Signaling)    │
         └─────────────────┘
                  │
                  │ HTTP POST
                  │ /api/control
                  │
         ┌────────▼────────┐
         │  Agent Local    │
         │  (PC Host)      │
         │  Port 9003      │
         └─────────────────┘
```

**Lưu ý:**
- VPS chỉ làm signaling (trao đổi offer/answer/ICE)
- Video và control đi trực tiếp P2P giữa 2 browser
- Agent (ControlServlet) chỉ chạy trên PC host, không trên VPS

---

## ⚠️ 6. Lưu ý quan trọng

1. **VPS không cần Java Robot**: VPS không có màn hình, không thể điều khiển chuột/phím
2. **Agent phải chạy trên PC host**: Agent (ControlServlet) phải chạy trên máy thật, lắng nghe `http://127.0.0.1:9003/api/control`
3. **WebRTC P2P**: Video và control đi trực tiếp giữa 2 browser, không qua VPS
4. **STUN/TURN**: Nếu kết nối khác mạng, cần cấu hình STUN/TURN servers trong `webrtc-client.js`

---

## 🆘 7. Troubleshooting

### Lỗi: "Cannot connect to WebSocket"

- Kiểm tra firewall: `sudo ufw status`
- Kiểm tra port: `netstat -tulpn | grep 8082`
- Kiểm tra log: `tail -f server.log`

### Lỗi: "WebRTC connection failed"

- Kiểm tra STUN servers trong `webrtc-client.js`
- Kiểm tra firewall có chặn UDP không
- Xem console log để biết ICE connection state

### Lỗi: "Control không hoạt động"

- Kiểm tra agent có chạy trên PC host không: `http://127.0.0.1:9003/api/control`
- Kiểm tra DataChannel có mở không: xem console log `DataChannel 'control' OPEN`

---

## 📝 8. Tóm tắt

**VPS cần:**
- ✅ Web interface (HTML/JS/CSS)
- ✅ WebSocket signaling server (Java)
- ✅ Static file server

**VPS KHÔNG cần:**
- ❌ ControlServlet (Robot)
- ❌ Screen capture
- ❌ WebSocket video streaming

**PC Host cần:**
- ✅ Agent (ControlServlet) chạy local trên port 9003
- ✅ Browser để share screen và nhận control qua DataChannel

