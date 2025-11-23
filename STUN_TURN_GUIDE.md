# Hướng Dẫn Cấu Hình STUN/TURN cho P2P Khác Mạng

## 📚 Lý Thuyết P2P Khác Mạng

### Vấn Đề Khi 2 Máy Ở Khác Mạng

Khi 2 máy ở **khác mạng** (khác router, khác ISP), WebRTC gặp các vấn đề:

1. **NAT (Network Address Translation)**: Router che giấu IP thật của máy
   - Máy A: IP nội bộ `192.168.1.10`, IP public `42.114.14.156`
   - Máy B: IP nội bộ `10.0.0.5`, IP public `103.45.67.89`
   - Máy A không biết IP public của B, và ngược lại

2. **Firewall**: Chặn UDP port ngẫu nhiên mà WebRTC cần

3. **Symmetric NAT**: Router không cho phép kết nối từ bên ngoài vào

### Giải Pháp: STUN và TURN

#### 🔍 STUN (Session Traversal Utilities for NAT)
- **Mục đích**: Giúp máy **phát hiện IP public** của mình
- **Cách hoạt động**: Máy gửi request đến STUN server → STUN server trả về IP public
- **Kết quả**: WebRTC biết được IP public của cả 2 máy → có thể thử kết nối trực tiếp
- **Miễn phí**: Có nhiều STUN server công cộng (Google, Mozilla)

#### 🔄 TURN (Traversal Using Relays around NAT)
- **Mục đích**: **Relay traffic** khi không thể kết nối trực tiếp
- **Cách hoạt động**: 
  - Máy A → TURN server → Máy B
  - Tất cả traffic đi qua TURN server (không còn P2P thuần)
- **Khi cần**: Khi STUN không đủ (Symmetric NAT, firewall quá chặt)
- **Chi phí**: Cần server riêng (tốn bandwidth, tốn tiền)

### Quy Trình ICE (Interactive Connectivity Establishment)

WebRTC tự động thử các cách kết nối theo thứ tự ưu tiên:

1. **Host candidate** (LAN): `192.168.1.10:50000` → `192.168.1.11:50001`
   - ✅ Nhanh nhất, ít delay
   - ❌ Chỉ hoạt động khi cùng mạng

2. **Server reflexive candidate** (STUN): `42.114.14.156:40538` → `103.45.67.89:31031`
   - ✅ P2P thật sự qua Internet
   - ❌ Cần router hỗ trợ NAT traversal

3. **Relay candidate** (TURN): `turn.example.com:3478` → `turn.example.com:3478`
   - ✅ Luôn hoạt động (fallback)
   - ❌ Không còn P2P (đi qua server), tốn bandwidth

---

## 🔧 Cấu Hình Trong Code

### Vị Trí Cấu Hình

File: `src/main/webapp/webrtc-client.js`

Dòng 12-15: `this.configuration` trong constructor của `WebRTCClient`

### Cấu Hình Hiện Tại (LAN Thuần)

```javascript
this.configuration = {
    iceServers: [],  // Không có STUN/TURN → chỉ LAN
    iceCandidatePoolSize: 0
};
```

### Cấu Hình Đề Xuất (P2P Khác Mạng)

#### Option 1: Chỉ STUN (P2P Thuần, Miễn Phí)

```javascript
this.configuration = {
    iceServers: [
        // Google STUN (miễn phí, công cộng)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        
        // Mozilla STUN (backup)
        { urls: 'stun:stun.mozilla.org:3478' }
    ],
    iceCandidatePoolSize: 0
};
```

**Khi nào dùng:**
- ✅ 2 máy khác mạng nhưng router hỗ trợ NAT traversal
- ✅ Firewall không quá chặt
- ✅ Muốn P2P thuần (không qua server)

**Hạn chế:**
- ❌ Không hoạt động với Symmetric NAT
- ❌ Không hoạt động khi firewall chặn UDP

#### Option 2: STUN + TURN (Đầy Đủ, Có Fallback)

```javascript
this.configuration = {
    iceServers: [
        // STUN servers (ưu tiên P2P trực tiếp)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        
        // TURN server (fallback khi không P2P được)
        {
            urls: 'turn:your-turn-server.com:3478',
            username: 'your-username',
            credential: 'your-password'
        }
    ],
    iceCandidatePoolSize: 0
};
```

**Khi nào dùng:**
- ✅ Muốn đảm bảo kết nối luôn thành công
- ✅ Có TURN server riêng (hoặc dùng dịch vụ)
- ⚠️ Tốn bandwidth và chi phí TURN server

**Lưu ý:**
- TURN server cần tự host hoặc mua dịch vụ
- Không có TURN server công cộng miễn phí (tốn bandwidth)

---

## 🛠️ Cách Thêm STUN/TURN Vào Code

### Bước 1: Sửa File `webrtc-client.js`

Tìm dòng 12-15 và thay bằng:

```javascript
this.configuration = {
    iceServers: [
        // STUN servers (miễn phí)
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.mozilla.org:3478' }
    ],
    iceCandidatePoolSize: 0
};
```

### Bước 2: Nếu Cần TURN Server

#### Cách 1: Dùng Dịch Vụ TURN (Trả Phí)
- **Twilio**: https://www.twilio.com/stun-turn
- **Xirsys**: https://xirsys.com/
- **Coturn**: Tự host (miễn phí nhưng cần server)

#### Cách 2: Tự Host TURN Server (Coturn)

1. Cài đặt Coturn trên server:
```bash
# Ubuntu/Debian
sudo apt-get install coturn

# Hoặc compile từ source
```

2. Cấu hình `/etc/turnserver.conf`:
```
listening-port=3478
realm=your-domain.com
user=username:password
```

3. Thêm vào code:
```javascript
{
    urls: 'turn:your-server-ip:3478',
    username: 'username',
    credential: 'password'
}
```

### Bước 3: Test Kết Nối

1. Mở Console (F12) và xem log:
   - `ICE candidate: ... typ srflx` → STUN hoạt động
   - `ICE candidate: ... typ relay` → TURN đang dùng
   - `ICE connection state = connected` → Thành công

2. Test với 2 máy khác mạng:
   - Máy A: Mạng nhà (WiFi)
   - Máy B: Mạng khác (4G hotspot, WiFi khác)

---

## 📊 So Sánh Các Cấu Hình

| Cấu Hình | P2P Thuần | Hoạt Động Khác Mạng | Chi Phí | Bandwidth |
|----------|-----------|---------------------|---------|-----------|
| `iceServers: []` | ✅ 100% | ❌ Chỉ LAN | Miễn phí | Thấp |
| STUN only | ✅ 100% | ⚠️ Tùy router | Miễn phí | Thấp |
| STUN + TURN | ⚠️ Có thể relay | ✅ Luôn hoạt động | Tốn tiền | Cao |

---

## 🎯 Khuyến Nghị

### Cho Dự Án Này

1. **Development/Testing (LAN)**: Dùng `iceServers: []`
   - Nhanh, đơn giản
   - Test trên cùng mạng

2. **Production (Khác Mạng)**: Dùng **STUN only** trước
   ```javascript
   iceServers: [
       { urls: 'stun:stun.l.google.com:19302' },
       { urls: 'stun:stun1.l.google.com:19302' }
   ]
   ```
   - Miễn phí
   - P2P thuần
   - Hoạt động với 80% trường hợp

3. **Production (Cần Đảm Bảo)**: Thêm TURN nếu cần
   - Khi STUN không đủ
   - Khi cần đảm bảo 100% kết nối thành công

---

## 🔍 Debug ICE Connection

### Xem ICE Candidates Trong Console

```javascript
// Thêm vào webrtc-client.js sau dòng 331
this.peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        console.log('📡 ICE candidate:', event.candidate.candidate);
        console.log('Type:', event.candidate.type); // host, srflx, relay
        console.log('Protocol:', event.candidate.protocol); // udp, tcp
    }
};
```

### Kiểm Tra ICE Connection State

Đã có sẵn trong code (dòng 294-317):
- `new` → Chưa bắt đầu
- `checking` → Đang thử kết nối
- `connected` → ✅ Thành công (P2P hoặc relay)
- `failed` → ❌ Thất bại (cần TURN)
- `disconnected` → Mất kết nối

---

## 📝 Tóm Tắt

1. **STUN**: Giúp phát hiện IP public → thử P2P trực tiếp
2. **TURN**: Relay traffic khi không P2P được (fallback)
3. **Thêm STUN**: Sửa `iceServers` trong `webrtc-client.js` constructor
4. **Thêm TURN**: Cần server riêng hoặc dịch vụ trả phí
5. **Test**: Xem log `ICE connection state` và `ICE candidate type`

**File cần sửa:** `src/main/webapp/webrtc-client.js` (dòng 12-15)

