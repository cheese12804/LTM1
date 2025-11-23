# Kiến Trúc và Cách Hoạt Động của Dự Án Remote Desktop

## 📋 Tổng Quan

Dự án này là một hệ thống **Remote Desktop** sử dụng **WebRTC** để chia sẻ màn hình và điều khiển từ xa qua trình duyệt web. Hệ thống cho phép:

- **Chia sẻ màn hình** giữa 2 máy tính qua WebRTC P2P
- **Điều khiển chuột và bàn phím** từ xa qua WebRTC DataChannel
- **Kết nối P2P** không cần server trung gian (chỉ cần server cho signaling)
- **Hỗ trợ STUN** để kết nối qua Internet

---

## 🏗️ Kiến Trúc Tổng Thể

```
┌─────────────────┐                    ┌─────────────────┐
│   Browser A     │                    │   Browser B     │
│   (Host)        │                    │   (Viewer)      │
│                 │                    │                 │
│  ┌───────────┐  │                    │  ┌───────────┐  │
│  │ WebRTC    │  │◄─── P2P Direct ───►│  │ WebRTC    │  │
│  │ Video     │  │                    │  │ Video     │  │
│  │ Stream    │  │                    │  │ Display   │  │
│  └───────────┘  │                    │  └───────────┘  │
│        │        │                    │        │        │
│  ┌───────────┐  │                    │  ┌───────────┐  │
│  │DataChannel│  │◄─── P2P Direct ───►│  │DataChannel│  │
│  │ Control   │  │                    │  │ Control   │  │
│  └─────┬─────┘  │                    │  └─────┬─────┘  │
│        │        │                    │        │        │
│        │        │                    │        │        │
│        ▼        │                    │        │        │
│  ┌───────────┐ │                    │        │        │
│  │  HTTP     │ │                    │        │        │
│  │  POST     │ │                    │        │        │
│  │/api/control│                    │        │        │
│  └─────┬─────┘ │                    │        │        │
│        │       │                    │        │        │
└────────┼───────┘                    └────────┼────────┘
         │                                      │
         │         ┌──────────────────┐        │
         │         │  Java Server     │        │
         └────────►│  (Signaling)     │◄───────┘
                   │                  │
                   │  ┌────────────┐  │
                   │  │ WebSocket  │  │
                   │  │ /ws        │  │
                   │  └────────────┘  │
                   │                  │
                   │  ┌────────────┐  │
                   │  │ Control    │  │
                   │  │ Servlet    │  │
                   │  │ /api/control│ │
                   │  └─────┬──────┘  │
                   │        │         │
                   │        ▼         │
                   │  ┌────────────┐  │
                   │  │   Robot    │  │
                   │  │  (AWT)     │  │
                   │  └────────────┘  │
                   └──────────────────┘
```

---

## 🔄 Flow Hoạt Động Chi Tiết

### 1. Kết Nối và Signaling (WebSocket)

**Bước 1: Kết nối WebSocket**
```
Browser A ──WebSocket──► Java Server (/ws)
Browser B ──WebSocket──► Java Server (/ws)
```

- Cả 2 browser kết nối đến Java server qua WebSocket
- Server gán `clientId` cho mỗi client
- Server tự động ghép cặp 2 client thành peer

**Bước 2: WebRTC Signaling**
```
Browser A (Host):
  1. Share màn hình → getDisplayMedia()
  2. Tạo PeerConnection
  3. Tạo DataChannel "control"
  4. Tạo Offer → Gửi qua WebSocket

Java Server:
  → Nhận Offer từ A
  → Forward Offer đến B

Browser B (Viewer):
  1. Nhận Offer
  2. Tạo Answer
  3. Gửi Answer qua WebSocket

Java Server:
  → Nhận Answer từ B
  → Forward Answer đến A
```

**Bước 3: ICE Candidates**
```
Browser A ──ICE Candidate──► WebSocket ──► Browser B
Browser B ──ICE Candidate──► WebSocket ──► Browser A
```

- Mỗi browser gửi ICE candidates qua WebSocket
- Server forward candidates đến peer
- WebRTC tự động chọn đường kết nối tốt nhất (P2P direct hoặc qua TURN)

### 2. Video Streaming (WebRTC P2P)

```
Browser A (Host):
  ┌─────────────────┐
  │ Screen Capture  │
  │ (getDisplayMedia)│
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │ MediaStreamTrack │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │ PeerConnection  │
  │ (addTrack)      │
  └────────┬─────────┘
           │
           │ WebRTC P2P
           │ (STUN/TURN)
           │
           ▼
  ┌─────────────────┐
  │ PeerConnection  │
  │ (ontrack)       │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │  Video Element  │
  │  (Display)      │
  └─────────────────┘
Browser B (Viewer)
```

**Đặc điểm:**
- Video stream đi **trực tiếp P2P** giữa 2 browser
- Không qua server (chỉ signaling qua server)
- Tự động xử lý NAT/firewall nhờ STUN servers
- Nếu P2P không được, có thể dùng TURN server (chưa cấu hình)

### 3. Control Commands (DataChannel P2P)

```
Browser B (Viewer):
  User di chuột/nhấn phím
           │
           ▼
  ┌─────────────────┐
  │ Event Handlers  │
  │ (main.js)       │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │ sendControlMsg  │
  │ (DataChannel)   │
  └────────┬─────────┘
           │
           │ P2P Direct
           │ (DataChannel)
           │
           ▼
  ┌─────────────────┐
  │ onmessage       │
  │ (DataChannel)   │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │ fetch POST      │
  │ /api/control    │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │ ControlServlet  │
  │ (Java)          │
  └────────┬─────────┘
           │
           ▼
  ┌─────────────────┐
  │ Robot (AWT)     │
  │ mouseMove/      │
  │ keyPress        │
  └─────────────────┘
Browser A (Host)
```

**Đặc điểm:**
- Control commands đi qua **DataChannel P2P** (không qua server)
- Host nhận control → Gọi HTTP API local → Java Robot thực thi
- **Hoàn toàn P2P** cho control, chỉ cần server cho signaling

---

## 📦 Các Thành Phần Chính

### 1. **Frontend (Browser)**

#### `index.html`
- UI cơ bản: buttons, video element, status text

#### `websocket-client.js`
- **WebSocketClient class**: Quản lý kết nối WebSocket
- **Chức năng:**
  - Kết nối đến `/ws`
  - Gửi/nhận WebRTC signaling messages
  - Quản lý client list
  - Auto-pairing peers

#### `webrtc-client.js`
- **WebRTCClient class**: Quản lý WebRTC connection
- **Chức năng:**
  - `startScreenShare()`: Bắt đầu chia sẻ màn hình (Host)
  - `createPeerConnection()`: Tạo PeerConnection
  - `createDataChannel()`: Tạo DataChannel "control" (Host)
  - `ondatachannel`: Nhận DataChannel (Viewer)
  - `handleSignal()`: Xử lý Offer/Answer/ICE candidates
  - `sendControlMessage()`: Gửi control qua DataChannel
  - `onmessage`: Nhận control → Gọi `/api/control`

#### `main.js`
- **Main script**: Điều phối toàn bộ
- **Chức năng:**
  - Quản lý UI state
  - Xử lý mouse/keyboard events
  - Gửi control qua DataChannel hoặc WebSocket (tùy flag)
  - Setup/remove event handlers

### 2. **Backend (Java Server)**

#### `ServerMain.java`
- **Main server**: Khởi động Jetty server
- **Chức năng:**
  - Tạo HTTP server trên port 8082
  - Đăng ký WebSocket handler (`/ws`)
  - Đăng ký ControlServlet (`/api/control`)
  - Serve static files (HTML, JS, CSS)

#### `RemoteDesktopWebSocket.java`
- **WebSocket handler**: Xử lý signaling
- **Chức năng:**
  - Nhận kết nối WebSocket
  - Gán `clientId` cho mỗi client
  - Forward WebRTC signaling messages (Offer/Answer/ICE)
  - Auto-pairing 2 clients
  - Quản lý client list

#### `ControlServlet.java`
- **HTTP Servlet**: Xử lý control commands
- **Chức năng:**
  - Nhận POST `/api/control` với JSON
  - Parse JSON control message
  - Gọi Java Robot để thực thi:
    - `mouseMove(x, y)`
    - `mouseClick(button, pressed)`
    - `mouseScroll(delta)`
    - `keyPress(key, pressed)`

#### `StaticFileServlet.java`
- Serve static files từ `src/main/webapp/`

---

## 🔀 Luồng Dữ Liệu Chi Tiết

### Luồng 1: Video Streaming

```
1. Browser A: getDisplayMedia() → MediaStream
2. Browser A: createPeerConnection() → RTCPeerConnection
3. Browser A: addTrack(stream) → Thêm video track
4. Browser A: createOffer() → SDP Offer
5. Browser A → WebSocket → Server → Browser B: Offer
6. Browser B: setRemoteDescription(offer)
7. Browser B: createAnswer() → SDP Answer
8. Browser B → WebSocket → Server → Browser A: Answer
9. Browser A: setRemoteDescription(answer)
10. Browser A/B: Exchange ICE candidates qua WebSocket
11. WebRTC: Tự động thiết lập P2P connection
12. Browser B: ontrack event → Nhận video stream
13. Browser B: Hiển thị video trong <video> element
```

### Luồng 2: Control Commands

```
1. Browser B: User di chuột → handleMouseMove()
2. Browser B: rtcClient.sendControlMessage({type: "mouseMove", x, y})
3. Browser B: controlChannel.send(JSON.stringify(...))
4. DataChannel P2P: Gửi message trực tiếp đến Browser A
5. Browser A: controlChannel.onmessage → Nhận JSON
6. Browser A: Parse JSON → fetch('/api/control', {method: 'POST', body: JSON})
7. Java Server: ControlServlet.doPost() → Nhận JSON
8. Java Server: Parse JSON → handleMouseMove(node)
9. Java Server: robot.mouseMove(x, y) → Di chuyển chuột thật
```

---

## 🌐 Network Architecture

### Signaling (WebSocket)
- **Protocol**: WebSocket (ws:// hoặc wss://)
- **Endpoint**: `/ws`
- **Chức năng**: Trao đổi WebRTC metadata (Offer/Answer/ICE)
- **Đi qua server**: ✅ Có (cần server để forward messages)

### Video Stream (WebRTC)
- **Protocol**: WebRTC (UDP)
- **Chức năng**: Truyền video stream
- **Đi qua server**: ❌ Không (P2P direct)
- **STUN**: ✅ Có (để discover public IP)
- **TURN**: ❌ Chưa cấu hình (có thể thêm nếu cần)

### Control (DataChannel)
- **Protocol**: WebRTC DataChannel (SCTP over UDP)
- **Chức năng**: Truyền control commands
- **Đi qua server**: ❌ Không (P2P direct)
- **Format**: JSON messages

### Control API (HTTP)
- **Protocol**: HTTP POST
- **Endpoint**: `/api/control`
- **Chức năng**: Nhận control từ Browser A → Thực thi bằng Robot
- **Chỉ local**: ✅ Chỉ gọi từ Browser A (localhost)

---

## 🔧 Cấu Hình

### STUN Servers
File: `webrtc-client.js`
```javascript
iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.mozilla.org:3478' }
]
```

### DataChannel Flag
File: `main.js`
```javascript
let useDataChannel = true;  // true = dùng DataChannel, false = dùng WebSocket
```

### Port
- **Mặc định**: 8082
- **Có thể đổi**: Tham số dòng lệnh hoặc biến môi trường `PORT`

---

## 📊 Ưu Điểm của Kiến Trúc Này

1. **P2P Video**: Video stream đi trực tiếp, không tốn băng thông server
2. **P2P Control**: Control commands cũng đi P2P, độ trễ thấp
3. **Scalable**: Server chỉ xử lý signaling, không relay data
4. **Privacy**: Video và control không đi qua server
5. **Flexible**: Có thể bật/tắt DataChannel bằng flag

---

## 🚀 Cách Chạy

1. **Build project:**
   ```bash
   mvn clean install
   ```

2. **Chạy server:**
   ```bash
   mvn exec:java
   # hoặc
   java -jar target/remote-desktop-1.0-SNAPSHOT.jar
   ```

3. **Truy cập:**
   - Browser A (Host): `http://localhost:8082` → Share màn hình
   - Browser B (Viewer): `http://<IP-A>:8082` → Xem và điều khiển

---

## 🔍 Debug Tips

1. **Kiểm tra WebSocket:**
   - F12 → Console → Xem log "WebSocket đã kết nối"
   - Network tab → Xem WebSocket connection

2. **Kiểm tra WebRTC:**
   - F12 → Console → Xem log "ICE candidate", "ICE state"
   - `chrome://webrtc-internals/` → Xem WebRTC stats

3. **Kiểm tra DataChannel:**
   - F12 → Console → Xem log "DataChannel 'control' OPEN"
   - Xem log "📥 [HOST] Nhận message control"

4. **Kiểm tra Control API:**
   - F12 → Network → Xem POST `/api/control`
   - Server console → Xem log control commands

---

## 📝 Tóm Tắt

**Dự án này là một hệ thống Remote Desktop P2P:**
- ✅ Video: WebRTC P2P (không qua server)
- ✅ Control: DataChannel P2P (không qua server)
- ✅ Signaling: WebSocket qua server (chỉ metadata)
- ✅ Execution: Java Robot trên máy host

**Flow đơn giản:**
1. 2 browser kết nối WebSocket → Server ghép cặp
2. WebRTC signaling qua WebSocket → Thiết lập P2P
3. Video stream P2P → Browser B xem màn hình Browser A
4. Control P2P → Browser B điều khiển → Browser A gọi API → Robot thực thi

**Kết quả:** Browser B có thể xem và điều khiển màn hình Browser A hoàn toàn qua trình duyệt web!

