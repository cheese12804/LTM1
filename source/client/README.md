# MODULE CLIENT – WEBRTC UI

> 🌐 *Module **client** là ứng dụng web (HTML/JS/CSS) chạy ngay trong trình duyệt để chia sẻ màn hình (Host) và điều khiển từ xa (Viewer) thông qua WebRTC + WebSocket signaling.*

---

## 🎯 MỤC TIÊU

Client web đảm nhiệm:
- **Kết nối signaling**: tạo/nhận WebSocket messages (`/ws`) để đăng ký client, ghép peer và chuyển tiếp WebRTC Offer/Answer/ICE.
- **Thiết lập WebRTC P2P**: sử dụng `RTCPeerConnection` trong `webrtc-client.js` để tạo video stream và DataChannel control.
- **Gửi/nhận điều khiển**:
  - Host (Máy A) gửi DataChannel control vào Agent local (`http://127.0.0.1:9003/api/control`).
  - Viewer điều khiển Host thông qua DataChannel hoặc fallback HTTP `/api/control`.
- **UI điều khiển**: các nút “Kết nối WebSocket”, “Bắt đầu chia sẻ màn hình”, danh sách peer, log kết nối, hiển thị video remote.

---

## ⚙️ CÔNG NGHỆ SỬ DỤNG

| Thành phần | Công nghệ |
|------------|-----------|
| Ngôn ngữ | HTML5 + Vanilla JavaScript (ES6) + CSS |
| Signaling | WebSocket (`websocket-client.js`) |
| Media/Control | WebRTC (`webrtc-client.js`, DataChannel) |
| UI | `index.html`, `style.css`, DOM API |
| Build/Serve | Jetty `StaticFileServlet` (khi chạy server Java) |

**Các file chính:**
- `index.html`: layout UI.
- `style.css`: CSS thuần, hỗ trợ dark mode + responsive.
- `main.js`: glue code UI → gọi `WebSocketClient` và `WebRTCClient`.
- `websocket-client.js`: quản lý ws://[HOST]:PORT/ws.
- `webrtc-client.js`: tất cả logic WebRTC (media stream, DataChannel, agent control).
- `WEBRTC_CLIENT_README.md`: tài liệu chuyên sâu cho file WebRTC.

---

## 🚀 HƯỚNG DẪN CHẠY

### 1. Local development (cả server + client cùng máy)
```bash
# Terminal 1: build & chạy server
cd source/server
mvn clean package
java -jar target/remote-desktop-1.0-SNAPSHOT.jar 8082

# Terminal 2: mở client trên browser
# Truy cập http://localhost:8082
```

### 2. Test trong LAN (máy khác cùng mạng)
```bash
# Server
java -jar target/remote-desktop-1.0-SNAPSHOT.jar 8082
# Lấy IP LAN của server (ví dụ 192.168.1.10)

# Client (máy khác)
Mở browser → http://192.168.1.10:8082
```

### 3. Deploy VPS + Agent local (2 máy khác mạng)
1. Deploy server + static web lên VPS (theo README gốc, cấu hình HTTPS/Nginx).
2. Máy A (Host thật) chạy agent:  
   `java -jar remote-agent-1.0-SNAPSHOT.jar 9003`
3. Máy A + Máy B mở `https://IP_VPS` → thực hiện signaling qua VPS, video/data đi P2P.

---

## 📦 CẤU TRÚC THƯ MỤC
```
source/client/
├── README.md                # File này
├── index.html               # Giao diện chính
├── style.css                # Styling & layout
├── main.js                  # Kết nối UI ↔ logic
├── websocket-client.js      # Quản lý WebSocket signaling
├── webrtc-client.js         # Logic WebRTC & DataChannel
├── WEBRTC_CLIENT_README.md  # Giải thích chi tiết WebRTC client
```

---

## 🔄 LUỒNG HOẠT ĐỘNG
1. Người dùng mở `index.html` → `main.js` khởi tạo `WebSocketClient` + `WebRTCClient`.
2. **Kết nối WebSocket** (nút “Kết nối WebSocket”):
   - Gửi `{"type":"get-clients"}`.
   - Nhận `client-list`, hiển thị danh sách peer.
   - Auto pair hoặc chọn peer thủ công → gửi `{"type":"connect-peer","peerId":"..."}`.
3. **Chia sẻ màn hình** (nút “Bắt đầu chia sẻ màn hình”):
   - `navigator.mediaDevices.getDisplayMedia()` → add track vào `RTCPeerConnection`.
   - Tạo DataChannel `controlChannel`.
4. **WebRTC Signaling**:
   - Offer/Answer/ICE → gửi qua WebSocket (`webrtc-signal`).
   - Peer nhận → thiết lập RTCPeerConnection → P2P media + DataChannel.
5. **Điều khiển**:
   - Viewer → DataChannel → Host → fetch `http://127.0.0.1:9003/api/control` (agent).
   - Fallback: Viewer gọi trực tiếp `/api/control` trên server (nếu chạy cùng máy).

---

## 💻 UI & TƯƠNG TÁC
- **Panel Trạng thái**: hiển thị Client ID, peer hiện tại, số client đang online.
- **Danh sách peer**: auto cập nhật khi có client vào/ra.
- **Nút thao tác**:
  - `Kết Nối WebSocket`: mở kết nối WS và đăng ký client.
  - `Ngắt Kết Nối`: đóng WS + teardown P2P.
  - `Bắt đầu chia sẻ màn hình`: host chọn màn hình/cửa sổ để broadcast.
  - `Dừng chia sẻ`: stop tracks, gửi thông báo cho peer.
- **Video container**: hiển thị stream remote; viewer thao tác trực tiếp trên video để điều khiển.
- **Log section**: ghi lại các sự kiện (kết nối, signaling, lỗi).

---

## 🧪 KIỂM THỬ NHANH
- **1 Host + 1 Viewer (cùng máy):**
  1. Mở 2 tab browser.
  2. Tab 1 nhấn “Kết nối WebSocket” + “Bắt đầu chia sẻ”.
  3. Tab 2 nhấn “Kết nối WebSocket” → auto pair với tab 1.
  4. Kiểm tra video hiển thị và điều khiển chuột/phím.
- **Host + Viewer khác máy (LAN):**
  - Lặp lại các bước trên nhưng dùng IP LAN.
- **VPS scenario:**  
  - Host mở site từ VPS, run agent local, đảm bảo DataChannel điều khiển hoạt động.

---

## 📝 LƯU Ý & TROUBLESHOOTING
- **HTTPS bắt buộc** để `getDisplayMedia()` chạy trên internet (ngoại trừ `localhost`).
- **STUN/TURN**: cấu hình trong `webrtc-client.js` (mặc định dùng `stun:stun.l.google.com:19302`).
- **Agent local**: chỉ Host cần chạy, listener mặc định `http://127.0.0.1:9003/api/control`.
- **Nếu không thấy video**:
  - Kiểm tra console WebRTC (ICE gathering, connection state).
  - Đảm bảo Host thực sự chia sẻ màn hình (không cancel popup).
- **Không điều khiển được**:
  - Kiểm tra DataChannel state (open?).
  - Đảm bảo agent đang chạy và nhận request (xem log agent).
- **WebSocket disconnect liên tục**:
  - Kiểm tra server log (`ServerMain`), firewall/WS proxy, hoặc xem VPS có bật HTTPS + wss hay chưa.

---

## 📚 TÀI LIỆU THAM KHẢO
- `source/client/WEBRTC_CLIENT_README.md`: giải thích full pipeline WebRTC (Offer/Answer, ICE, DataChannel, agent flow).
- README gốc của dự án (root) – mục “Bước 1.5: Khởi động Agent” và “Deploy lên VPS”.

---

**Happy hacking!** 🎉 Hãy mở devtools (Console + Network WS) để quan sát signaling và debug nhanh khi cần. 