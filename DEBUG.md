# 🐛 HƯỚNG DẪN DEBUG

## 📊 Kiểm tra WebRTC Signaling Flow

### Bước 1: Mở Developer Console

Ở cả 2 tab/trình duyệt, mở Developer Console:
- **Chrome/Edge:** `F12` hoặc `Ctrl + Shift + I`
- **Firefox:** `F12` hoặc `Ctrl + Shift + K`
- Chọn tab **Console**

### Bước 2: Kiểm tra Log

#### Tab 1 (Người chia sẻ màn hình):

Khi nhấn "Bắt đầu Chia Sẻ Màn Hình", bạn sẽ thấy:
```
✅ Tạo WebRTC offer...
✅ Đã tạo và set local description (offer)
📤 Gửi offer đến peer qua WebSocket...
```

#### Tab 2 (Người nhận):

Bạn sẽ thấy:
```
📥 Nhận offer từ peer, tạo answer...
✅ Đã set remote description (offer)
✅ Đã tạo và set local description (answer)
📤 Đã gửi answer đến peer
```

#### Sau đó Tab 1 sẽ thấy:
```
📥 Nhận answer từ peer
✅ Đã set remote description (answer)
```

#### Tab 2 sẽ thấy:
```
✅ Nhận remote stream từ peer!
✅ Đã nhận video stream từ peer!
```

---

## 🔍 Các Vấn Đề Thường Gặp

### Vấn đề 1: Không thấy "Nhận offer"

**Nguyên nhân:** WebRTC signal không được routing đúng

**Kiểm tra:**
1. Xem console Tab 2 có log "Nhận WebRTC signal: offer" không?
2. Xem server log có "Đã chuyển tiếp WebRTC signal" không?
3. Kiểm tra cả 2 tab đã kết nối peer chưa (xem status "P2P: Đã kết nối với peer")

**Giải pháp:**
- Refresh cả 2 tab
- Đảm bảo cả 2 tab đã kết nối WebSocket
- Đợi thông báo "P2P: Đã kết nối với peer" trước khi chia sẻ

### Vấn đề 2: Thấy "Nhận offer" nhưng không thấy "Đã gửi answer"

**Nguyên nhân:** Lỗi khi tạo answer

**Kiểm tra:**
- Xem console có lỗi gì không (màu đỏ)
- Kiểm tra "Lỗi xử lý offer: ..."

**Giải pháp:**
- Xem chi tiết lỗi trong console
- Có thể do SDP format không đúng

### Vấn đề 3: Thấy "Đã gửi answer" nhưng không thấy "Nhận remote stream"

**Nguyên nhân:** ICE connection failed hoặc video stream chưa được gửi

**Kiểm tra:**
1. Xem "WebRTC Connection state:" là gì?
   - `connected` = ✅ Tốt
   - `failed` = ❌ Lỗi
   - `disconnected` = ❌ Đã ngắt
2. Xem "ICE Connection state:" là gì?
   - `connected` hoặc `completed` = ✅ Tốt
   - `failed` = ❌ Lỗi (có thể do NAT/Firewall)

**Giải pháp:**
- Nếu ICE failed: Cần TURN server hoặc kiểm tra firewall
- Nếu connection state = failed: Kiểm tra network

### Vấn đề 4: Thấy "Nhận remote stream" nhưng video vẫn đen

**Nguyên nhân:** Video element chưa được hiển thị

**Kiểm tra:**
- Xem console có "Video stream đã được gán vào remoteVideo element" không?
- Kiểm tra trong Elements tab (F12 → Elements) xem `<video>` có `srcObject` không?

**Giải pháp:**
- Refresh trang
- Kiểm tra browser permissions

---

## 📋 Checklist Debug

### Trước khi chia sẻ:
- [ ] Tab 1: Đã kết nối WebSocket
- [ ] Tab 2: Đã kết nối WebSocket
- [ ] Tab 1: Thấy "P2P: Đã kết nối với peer"
- [ ] Tab 2: Thấy "P2P: Đã kết nối với peer"
- [ ] Console không có lỗi (màu đỏ)

### Khi chia sẻ:
- [ ] Tab 1: Thấy "📤 Gửi offer..."
- [ ] Tab 2: Thấy "📥 Nhận offer..."
- [ ] Tab 2: Thấy "📤 Đã gửi answer..."
- [ ] Tab 1: Thấy "📥 Nhận answer..."
- [ ] Tab 2: Thấy "✅ Nhận remote stream..."

### Sau khi chia sẻ:
- [ ] Tab 2: Video hiển thị (không còn placeholder)
- [ ] Tab 2: Connection state = "connected"
- [ ] Tab 2: ICE state = "connected" hoặc "completed"

---

## 🔧 Kiểm tra Network

### Trong Developer Tools:

1. Mở tab **Network**
2. Lọc theo **WS** (WebSocket)
3. Xem messages:
   - Có message `webrtc-signal` không?
   - Message có đúng format không?

### Kiểm tra WebRTC:

1. Mở tab **Network**
2. Lọc theo **WebRTC**
3. Xem có connection không?

---

## 💡 MẸO

### Xem tất cả log cùng lúc:

1. Mở 2 cửa sổ trình duyệt (không phải tab)
2. Đặt cạnh nhau
3. Mở Console ở cả 2
4. Dễ dàng so sánh log

### Copy log để gửi:

1. Click chuột phải vào console
2. Chọn "Save as..." hoặc copy
3. Gửi log để được hỗ trợ

### Clear console:

- Nhấn `Ctrl + L` hoặc click icon clear

---

## 🆘 Nếu vẫn không hoạt động

1. **Kiểm tra browser:**
   - Dùng Chrome hoặc Edge (hỗ trợ WebRTC tốt nhất)
   - Đảm bảo phiên bản mới

2. **Kiểm tra network:**
   - Cả 2 tab cùng một máy: OK
   - 2 máy khác nhau: Cần mở firewall

3. **Thử lại:**
   - Refresh cả 2 tab
   - Ngắt kết nối và kết nối lại
   - Dừng chia sẻ và chia sẻ lại

4. **Kiểm tra server log:**
   - Xem có lỗi gì không
   - Xem có "Đã chuyển tiếp WebRTC signal" không

---

**Nếu vẫn không được, gửi console log để được hỗ trợ!** 📝

