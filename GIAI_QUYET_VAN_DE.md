# 🔧 GIẢI QUYẾT 2 VẤN ĐỀ

## ❌ Vấn đề 1: Không điều khiển được chuột (cùng 1 máy)

### Nguyên nhân:
- Tab nhận video chưa setup input handlers
- `isScreenSharing` chỉ true ở tab chia sẻ, không phải tab nhận

### ✅ Đã sửa:
- Thêm `window.isReceivingVideo = true` khi nhận video
- Setup input handlers tự động khi nhận video
- Cho phép điều khiển nếu `isScreenSharing` HOẶC `isReceivingVideo`

### 🧪 Cách test:
1. Refresh cả 2 tab
2. Tab 1: Kết nối WebSocket → Chia sẻ màn hình
3. Tab 2: Kết nối WebSocket → Đợi nhận video
4. Tab 2: Di chuyển chuột trên video → Phải điều khiển được

### 🔍 Kiểm tra:
- Console Tab 2: Phải thấy "✅ Đã setup input handlers cho tab nhận video"
- Di chuyển chuột trên video → Xem console có log không

---

## ❌ Vấn đề 2: WebRTC Failed (2 máy khác nhau)

### Nguyên nhân:
- NAT/Firewall chặn kết nối P2P
- STUN server không đủ, cần TURN server

### ✅ Đã sửa:
- Thêm TURN server miễn phí vào code
- Cải thiện ICE handling
- Thêm logging chi tiết

### 🔧 Cách sửa (nếu vẫn failed):

#### Bước 1: Bật TURN server trong code

File `src/main/webapp/webrtc-client.js` đã có TURN server, nhưng có thể không hoạt động.

**Thử TURN server khác:**

```javascript
// Thay thế trong webrtc-client.js
{ 
    urls: 'turn:numb.viagenie.ca',
    credential: 'muazkh',
    username: 'webrtc@live.com'
}
```

Hoặc dùng TURN server riêng (xem [TURN_SERVER.md](TURN_SERVER.md))

#### Bước 2: Kiểm tra Firewall

**Máy A (Server):**
```powershell
# Mở port UDP 1024-65535 (hoặc tắt firewall tạm thời để test)
New-NetFirewallRule -DisplayName "WebRTC" -Direction Inbound -Protocol UDP -LocalPort 1024-65535 -Action Allow
```

**Máy B (Client):**
- Tương tự

#### Bước 3: Kiểm tra Network

- Đảm bảo cả 2 máy trong cùng mạng LAN
- Không qua VPN hoặc proxy
- Thử ping giữa 2 máy

#### Bước 4: Xem Console Log

**Kiểm tra ICE candidates:**
```
📡 ICE candidate: ...
   Type: host  ← Tốt nhất (trực tiếp)
   Type: srflx ← OK (qua STUN)
   Type: relay ← Cần TURN (chậm hơn)
```

**Nếu không có relay candidate:**
- TURN server chưa hoạt động
- Cần thêm TURN server khác

**Nếu có relay nhưng vẫn failed:**
- TURN server không ổn định
- Thử TURN server khác

---

## 🧪 TEST NHANH

### Test 1: Cùng 1 máy (2 tab)

1. Mở 2 tab: `http://localhost:8082`
2. Kết nối WebSocket ở cả 2 tab
3. Tab 1: Chia sẻ màn hình
4. Tab 2: Phải thấy video
5. Tab 2: Di chuyển chuột trên video → Phải điều khiển được

**✅ Nếu OK:** Vấn đề 1 đã được sửa

### Test 2: 2 máy khác nhau

1. Máy A: Chạy server, mở `http://localhost:8082`
2. Máy B: Mở `http://[IP_MÁY_A]:8082`
3. Cả 2: Kết nối WebSocket
4. Máy A: Chia sẻ màn hình
5. Máy B: Phải thấy video

**Kiểm tra Console:**
- Xem "ICE Connection state" là gì?
- Xem có "relay" candidate không?

**✅ Nếu OK:** Vấn đề 2 đã được sửa
**❌ Nếu failed:** Xem phần "WebRTC Failed" ở trên

---

## 🔍 Debug Chi Tiết

### Kiểm tra Input Handlers:

**Tab nhận video, mở Console:**
```javascript
// Kiểm tra
console.log("isReceivingVideo:", window.isReceivingVideo);
console.log("isScreenSharing:", isScreenSharing);

// Test thủ công
const video = document.getElementById('remoteVideo');
video.addEventListener('mousemove', (e) => {
    console.log("Mouse move on video:", e);
});
```

### Kiểm tra WebRTC:

**Xem ICE candidates:**
- Console sẽ log tất cả ICE candidates
- Tìm "Type: relay" → Có TURN server
- Nếu chỉ có "host" và "srflx" → Cần TURN server

**Xem Connection State:**
- `connected` = ✅ Tốt
- `failed` = ❌ Cần TURN server hoặc kiểm tra firewall

---

## 💡 MẸO

### Nếu vẫn không điều khiển được chuột:

1. **Kiểm tra console có lỗi không**
2. **Thử click chuột thay vì di chuyển**
3. **Kiểm tra WebSocket có gửi message không:**
   - Network tab → WS → Xem messages

### Nếu WebRTC vẫn failed:

1. **Thử trên cùng mạng LAN trước**
2. **Tắt firewall tạm thời để test**
3. **Dùng TURN server riêng** (xem TURN_SERVER.md)
4. **Kiểm tra router có chặn P2P không**

---

## ❌ Vấn đề 3: Video Không Hiển Thị (Cùng 1 Máy)

### Triệu chứng:
- Thông báo "✅ Đã nhận video stream từ peer!" xuất hiện
- Nhưng video area vẫn đen, không hiển thị nội dung

### Nguyên nhân:
1. Video element bị ẩn (`display: none`) và không được hiển thị lại đúng cách
2. Video stream được gán nhưng không được play tự động
3. Thiếu xử lý để đảm bảo video element sẵn sàng trước khi gán stream

### ✅ Đã sửa:

**1. webrtc-client.js:**
- Đảm bảo video element được hiển thị (`display: block`, `visibility: visible`) **TRƯỚC** khi gán stream
- Gọi `play()` để đảm bảo video tự động play
- Thêm retry logic nếu `play()` thất bại
- Thêm logging chi tiết để debug
- Xử lý cả `event.streams` và `event.track` để lấy stream

**2. style.css:**
- Thêm `!important` cho `display: block` và `visibility: visible` để đảm bảo video luôn hiển thị
- Thêm `object-fit: contain` để video hiển thị đúng tỷ lệ

**3. index.html:**
- Thêm attribute `muted` cho video element (một số browser yêu cầu)

### 🧪 Cách test:
1. Refresh cả 2 tab
2. Tab 1: Kết nối WebSocket → Chia sẻ màn hình
3. Tab 2: Kết nối WebSocket → Đợi nhận video
4. **Kiểm tra:** Video phải hiển thị ngay sau khi nhận stream

### 🔍 Kiểm tra Console:
- Tab 2: Phải thấy:
  ```
  ✅ Nhận remote stream từ peer!
  ✅ Có stream, gán vào video element...
  ✅ Đã gán stream vào video element
  ✅ Video đã bắt đầu play
  Video dimensions: [width] x [height]
  ```

**Nếu vẫn không được, gửi console log từ cả 2 tab/máy!** 📝

