# ⚡ TEST NHANH - Kiểm tra Video Stream

## 📋 Checklist Test

### Bước 1: Khởi động Server
```bash
.\run.ps1 8082
```

### Bước 2: Mở 2 Tab Trình Duyệt

**Tab 1 (Server - Người chia sẻ):**
- Mở: `http://localhost:8082`
- Mở Console (F12)

**Tab 2 (Client - Người nhận):**
- Mở: `http://localhost:8082`
- Mở Console (F12)

### Bước 3: Kết Nối

**Ở cả 2 tab:**
1. Nhấn **"Kết Nối WebSocket"**
2. Đợi thông báo: **"P2P: Đã kết nối với peer"**

### Bước 4: Chia Sẻ Màn Hình

**Tab 1 (Người chia sẻ):**
1. Nhấn **"Bắt đầu Chia Sẻ Màn Hình"**
2. Chọn màn hình/cửa sổ muốn chia sẻ
3. Cho phép trình duyệt truy cập màn hình

**Xem Console Tab 1:**
```
✅ Tạo WebRTC offer...
✅ Đã tạo và set local description (offer)
📤 Gửi offer đến peer qua WebSocket...
```

**Xem Console Tab 2:**
```
📥 Nhận offer từ peer, tạo answer...
✅ Đã set remote description (offer)
✅ Đã tạo và set local description (answer)
📤 Đã gửi answer đến peer
```

**Sau đó Tab 1 sẽ thấy:**
```
📥 Nhận answer từ peer
✅ Đã set remote description (answer)
```

**Tab 2 sẽ thấy:**
```
✅ Nhận remote stream từ peer!
✅ Video metadata đã load
✅ Video đã bắt đầu play
✅ Đã nhận video stream từ peer!
```

### Bước 5: Kiểm tra Video

**Tab 2 (Người nhận):**
- ✅ Video phải hiển thị màn hình từ Tab 1
- ✅ Không còn placeholder
- ✅ Có thể di chuyển chuột và click trên video

---

## 🔍 Nếu Không Thấy Video

### Kiểm tra Console Log:

1. **Tab 1 có gửi offer không?**
   - Tìm: `📤 Gửi offer đến peer...`
   - Nếu không có → Lỗi khi chia sẻ màn hình

2. **Tab 2 có nhận offer không?**
   - Tìm: `📥 Nhận offer từ peer...`
   - Nếu không có → WebRTC signal không được routing

3. **Tab 2 có gửi answer không?**
   - Tìm: `📤 Đã gửi answer đến peer`
   - Nếu không có → Lỗi khi tạo answer

4. **Tab 2 có nhận video stream không?**
   - Tìm: `✅ Nhận remote stream từ peer!`
   - Nếu không có → Video stream chưa được gửi

5. **Connection state là gì?**
   - Tìm: `WebRTC Connection state:`
   - Phải là `connected` (không phải `failed`)

---

## 🐛 Các Lỗi Thường Gặp

### Lỗi: "Chưa kết nối với peer"
**Giải pháp:** Đợi thông báo "P2P: Đã kết nối với peer" trước khi chia sẻ

### Lỗi: "Failed to parse SessionDescription"
**Giải pháp:** Đã sửa trong code mới, refresh trang

### Lỗi: "ICE connection failed"
**Giải pháp:** 
- Có thể do NAT/Firewall
- Thử trên cùng một máy trước
- Nếu 2 máy khác nhau, cần TURN server

### Video không hiển thị nhưng có log "Nhận remote stream"
**Giải pháp:**
- Kiểm tra video element có `srcObject` không (Elements tab)
- Thử refresh trang
- Kiểm tra browser permissions

---

## ✅ Kết Quả Mong Đợi

**Khi thành công:**
- ✅ Tab 1: Chia sẻ màn hình thành công
- ✅ Tab 2: Hiển thị video màn hình từ Tab 1
- ✅ Tab 2: Có thể điều khiển chuột/bàn phím
- ✅ Console không có lỗi (màu đỏ)

---

**Nếu vẫn không được, gửi console log từ cả 2 tab!** 📝

