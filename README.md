# REMOTE DESKTOP WEBRTC – FINAL PROJECT (LTM1)

Ứng dụng cho phép chia sẻ màn hình và điều khiển chuột/phím theo thời gian thực dựa trên WebRTC (media + DataChannel) và WebSocket signaling. Server Java (Jetty) phục vụ static web, quản lý signaling. Agent Java chạy riêng trên máy Host để thực thi lệnh chuột/phím thông qua Java Robot API. Hệ thống có thể chạy local, LAN hoặc deploy lên VPS kèm HTTPS.

---

## 👥 THÀNH VIÊN & VAI TRÒ

| STT | Họ và Tên | MSSV | Email | Trách nhiệm |
|-----|-----------|------|-------|-------------|
| 1 | Đỗ Cẩm Chi | B22DCCN105 | [email@example.com] | WebSocket server (Java), signaling, deploy, agent |
| 2 | Hoàng Sơn Hải | B22DCCN261 | [email@example.com] | Static/HTTP server, WebSocket client (JS), UI glue |
| 3 | Nguyễn Như Duy | B22DCCN153 | [email@example.com] | WebRTC P2P, DataChannel → agent

**Tên nhóm:** Nhóm 06 – Lập trình mạng  
**Chủ đề:** Remote Desktop qua WebRTC/WebSocket P2P 

### Phân chia chi tiết
- **Đỗ Cẩm Chi (Người 1)** – phụ trách `ServerMain`, `RemoteDesktopWebSocket`, `RemoteDesktopWebSocketCreator`; thiết kế quản lý client, auto pair, relay `webrtc-signal`, tài liệu server/QA; phối hợp phần deploy và hướng dẫn agent.
- **Hoàng Sơn Hải (Người 2)** – phụ trách `StaticFileServlet`, `ControlServlet`, cấu hình Jetty; xây dựng client-side signaling (`websocket-client.js`, `main.js`); cập nhật tài liệu module client và hướng dẫn deploy VPS.
- **Nguyễn Như Duy (Người 3)** – phụ trách `webrtc-client.js`, `WEBRTC_CLIENT_README.md`, DataChannel → agent; viết hướng dẫn agent (`remote-agent.jar`) và kiểm thử end-to-end (LAN/VPS).

---

## 🧠 KIẾN TRÚC & LUỒNG HỆ THỐNG

```
┌──────────────┐        WebSocket        ┌──────────────┐
│ Browser A    │ <-------------------->  │ Jetty Server │
│ (Host)       │                        │ (VPS/local)   │
│ - index.html │                        │ - StaticFile  │
│ - webrtc JS  │                        │ - /ws         │
└─────▲────────┘                        └─────▲────────┘
      │ WebRTC Media + DataChannel            │
      │ (P2P sau khi signaling xong)          │
┌─────┴────────┐                         ┌────┴─────────┐
│ Browser B    │                         │ Agent        │
│ (Viewer)     │ -- DataChannel control ->│ remote-agent│
└──────────────┘    HTTP localhost (9003)└──────────────┘
```

- Jetty serve static web (HTML/CSS/JS) từ `source/client` và mở WebSocket `/ws`.
- WebSocket messages dùng JSON: `connected`, `client-list`, `connect-peer`, `webrtc-signal`, ...
- Sau khi signaling hoàn tất, media + DataChannel đi P2P (ICE/STUN). Server chỉ relay tín hiệu.
- Viewer điều khiển chuột/phím qua DataChannel → Host nhận → HTTP POST `http://127.0.0.1:9003/api/control` đến agent → Java Robot thực thi.
- Khi chạy local (server cùng máy Host), có thể bật REST `/api/control` làm fallback (ControlServlet).

Diagram chính: `static/diagram.png`.

---

## 🗂️ CẤU TRÚC REPO

```
LTM1/
├── README.md                 # Tài liệu tổng
├── INSTRUCTION.md            # Yêu cầu đề bài
├── static/                   # Diagram, assets
│   └── diagram.png
└── source/
    ├── client/               # Ứng dụng web (Host/Viewer)
    │   ├── index.html
    │   ├── style.css
    │   ├── main.js
    │   ├── websocket-client.js
    │   ├── webrtc-client.js
    │   └── WEBRTC_CLIENT_README.md
    └── server/               # Server Jetty (Maven)
        ├── pom.xml
        ├── README.md
        └── src/main/java/
            ├── ServerMain.java
            ├── StaticFileServlet.java
            ├── ControlServlet.java
            ├── RemoteDesktopWebSocket.java
            └── RemoteDesktopWebSocketCreator.java
```

---

## 🧰 CÔNG NGHỆ CHÍNH

| Thành phần | Công nghệ | Ghi chú |
|------------|-----------|---------|
| Server | Java 11+, Jetty embedded | Serve static web, WebSocket `/ws`, REST `/api/control` |
| Signaling | WebSocket (Jetty ↔ Browser) | Gson để parse/gửi JSON |
| Media/Control | WebRTC (RTCPeerConnection + DataChannel) | `webrtc-client.js` quản lý offer/answer, ICE, tracks |
| UI | HTML5/CSS3 + Vanilla JS | `main.js` kết nối UI ↔ logic |
| Agent | Java Robot API | Nhận HTTP control và điều khiển máy Host |
| Hạ tầng | STUN `stun.l.google.com:19302`, Nginx + Certbot (VPS) | Bắt buộc HTTPS để share screen ngoài localhost |
| Build | Maven (`mvn clean package`, `mvn exec:java`) | Không cần Node build vì client là static |

---

## 🚀 HƯỚNG DẪN CHẠY

### 1. Chuẩn bị
```bash
git clone <repo>
cd LTM1
mvn clean package   # build server jar (source/server/target/remote-desktop-1.0-SNAPSHOT.jar)
```

### 2. Chạy server (local hoặc VPS)
```bash
cd source/server
java -jar target/remote-desktop-1.0-SNAPSHOT.jar 8082
# hoặc
mvn exec:java
mvn exec:java -Dexec.args="9000"   # đổi port
```
Server sẽ lắng nghe `http://0.0.0.0:<PORT>`, serve client từ `src/main/webapp` (trỏ tới `../client`), cung cấp `ws://[HOST]:PORT/ws` và `/api/control` (tùy chọn).

### 3. Chạy agent trên máy Host (bắt buộc nếu server đặt trên VPS)
```bash
cd /path/to/remote-agent
java -jar remote-agent-1.0-SNAPSHOT.jar 9003
# Agent nghe tại http://127.0.0.1:9003/api/control
```

### 4. Truy cập client
- Local dev: `http://localhost:8082`
- LAN: `http://IP_SERVER:8082`
- VPS: `https://DOMAIN` (sau khi cấu hình HTTPS)

### 5. Quy trình sử dụng
1. Host và Viewer mở website → nhấn “Kết Nối WebSocket”.
2. Hệ thống auto pair 2 client đầu tiên (hoặc chọn peer thủ công).
3. Host nhấn “Bắt đầu chia sẻ màn hình” → cấp quyền share → gửi Offer.
4. Viewer nhận video, thao tác trên video → DataChannel gửi control đến Host agent.
5. Có thể dừng share, ngắt kết nối, đổi peer bất cứ lúc nào.

---

## 🌐 DEPLOY LÊN VPS (HTTPS)

1. Upload toàn bộ `LTM1` lên VPS.
2. Build & chạy server
3. Cài Nginx + Certbot:
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```
4. Proxy mẫu:
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
       }
   }
   ```
5. Máy Host chạy agent 9003, mở `https://160.250.246.202` để chia sẻ màn hình. Viewer mở cùng URL để điều khiển.


## 🔎 TEST & TROUBLESHOOTING

- **WebSocket:** mở DevTools → Network → WS để xem `connected`, `client-list`, `webrtc-signal`…
- **WebRTC:** dùng chrome://webrtc-internals (Chrome) để kiểm tra ICE, DataChannel state.
- **Video không hiển thị:** kiểm tra Host đã cấp quyền share; xem ICE candidate, STUN server; chắc chắn Viewer đã nhận Answer.
- **Không điều khiển được:** DataChannel state phải là `open`; agent phải chạy và nhận POST; xem log agent.
- **Static 404:** chạy server từ `source/server` để đường dẫn `../client` đúng.
- **WebSocket disconnect:** kiểm tra firewall VPS và config Nginx (Upgrade/Connection headers).

---

## 📚 TÀI LIỆU LIÊN QUAN

- `source/server/README.md`: hướng dẫn chi tiết server, phân biệt local vs VPS.
- `source/client/README.md`: mô tả UI, WebRTC flow, kịch bản kiểm thử.
- `source/client/WEBRTC_CLIENT_README.md`: giải thích sâu `webrtc-client.js`.
- `source/server/WEBSOCKET_SERVER_README.md`: tài liệu WebSocket server cho Người 1.
- `source/server/CHI_TIET_CODE_WEBSOCKET.md`: giải thích từng hàm trong `RemoteDesktopWebSocket`.
- `source/server/QA_CHECKLIST.md`: câu hỏi thường gặp khi bảo vệ.

---

## 📈 HƯỚNG PHÁT TRIỂN

- Tích hợp TURN server để hỗ trợ mạng chặn UDP.
- Authentication (JWT / OAuth) trước khi điều khiển máy.
- Ghi log session, hỗ trợ nhiều phiên điều khiển song song.
- Thêm clipboard/file transfer qua DataChannel.
- Agent native cho macOS/Linux, hỗ trợ hotkeys, clipboard.

---

**© 2025 – Bộ môn Lập trình mạng**  
Mọi thắc mắc vui lòng xem thêm các README module hoặc liên hệ thành viên phụ trách. 

