# 🔄 TURN Server cho WebRTC (2 máy khác nhau)

## ❓ Tại sao cần TURN Server?

Khi chạy trên **2 máy khác nhau**, WebRTC có thể gặp vấn đề:
- **NAT (Network Address Translation)**: Máy ở sau router không thể kết nối trực tiếp
- **Firewall**: Chặn kết nối P2P
- **Symmetric NAT**: Khó thiết lập kết nối trực tiếp

**→ Cần TURN server để relay traffic khi P2P không khả thi**

---

## 🔧 Cách thêm TURN Server

### Cách 1: Dùng TURN Server miễn phí (Test)

Sửa file `src/main/webapp/webrtc-client.js`:

```javascript
this.configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Thêm TURN server miễn phí
        { 
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        { 
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10
};
```

### Cách 2: Tự host TURN Server (Khuyến nghị cho production)

#### Dùng Coturn (Linux):

```bash
# Cài đặt
sudo apt-get install coturn

# Cấu hình /etc/turnserver.conf
listening-port=3478
realm=yourdomain.com
user=username:password

# Khởi động
sudo systemctl start coturn
```

Sau đó thêm vào code:
```javascript
{ 
    urls: 'turn:your-server-ip:3478',
    username: 'username',
    credential: 'password'
}
```

### Cách 3: Dùng dịch vụ TURN (Trả phí)

- **Twilio**: https://www.twilio.com/stun-turn
- **Xirsys**: https://xirsys.com/
- **Metered**: https://www.metered.ca/

---

## 🧪 Test TURN Server

### Kiểm tra TURN server hoạt động:

1. Mở: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Thêm TURN server của bạn
3. Xem có "relay" candidate không

### Kiểm tra trong code:

Xem console log:
```
📡 ICE candidate: ...
   Type: relay  ← Đây là TURN
```

---

## ⚠️ Lưu ý

1. **TURN server miễn phí:**
   - Có thể không ổn định
   - Có giới hạn băng thông
   - Chỉ dùng cho test

2. **TURN server riêng:**
   - Cần server có IP public
   - Cần cấu hình firewall
   - Tốn băng thông (relay traffic)

3. **STUN vs TURN:**
   - **STUN**: Chỉ giúp tìm IP public (miễn phí)
   - **TURN**: Relay traffic khi P2P không được (tốn băng thông)

---

## 🔍 Debug WebRTC Failed

### Kiểm tra trong Console:

1. **ICE Connection State:**
   - `connected` = ✅ Tốt
   - `failed` = ❌ Cần TURN server

2. **ICE Candidates:**
   - `host` = Kết nối trực tiếp (tốt nhất)
   - `srflx` = Qua STUN (OK)
   - `relay` = Qua TURN (chậm hơn nhưng hoạt động)

3. **Nếu không có relay candidate:**
   - TURN server chưa được thêm hoặc không hoạt động
   - Cần thêm TURN server vào code

---

## 💡 Giải pháp tạm thời (Không cần TURN)

Nếu không có TURN server, có thể thử:

1. **Kiểm tra firewall:**
   - Mở port UDP 1024-65535 trên cả 2 máy
   - Hoặc tắt firewall tạm thời để test

2. **Dùng cùng mạng:**
   - Đảm bảo cả 2 máy trong cùng mạng LAN
   - Không qua VPN hoặc proxy

3. **Kiểm tra router:**
   - Một số router chặn P2P
   - Thử router khác hoặc cấu hình UPnP

---

**Xem thêm:** [DEBUG.md](DEBUG.md)

