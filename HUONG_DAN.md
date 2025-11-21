# 📖 HƯỚNG DẪN SỬ DỤNG REMOTE DESKTOP

## 📋 Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Chạy trên 1 máy (localhost)](#chạy-trên-1-máy-localhost)
3. [Chạy trên 2 máy khác nhau](#chạy-trên-2-máy-khác-nhau)
4. [Xử lý lỗi](#xử-lý-lỗi)

---

## 🔧 Yêu cầu hệ thống

- **Java 11** hoặc cao hơn
- **Maven 3.6+**
- **Trình duyệt** hiện đại (Chrome, Firefox, Edge)
- **Mạng LAN** (nếu chạy trên 2 máy)

---

## 🖥️ CHẠY TRÊN 1 MÁY (Localhost)

### Bước 1: Build project

Mở Terminal/PowerShell trong thư mục project:

**Windows PowerShell:**
```powershell
# Cho phép chạy script (chỉ cần làm 1 lần)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Build project
mvn clean install
```

**Windows CMD:**
```cmd
mvn clean install
```

**Linux/Mac:**
```bash
mvn clean install
```

### Bước 2: Chạy server

**Windows PowerShell:**
```powershell
.\run.ps1 8082
```

**Windows CMD:**
```cmd
run.bat 8082
```

**Linux/Mac:**
```bash
chmod +x run.sh
./run.sh 8082
```

**Hoặc chạy trực tiếp với Maven:**
```bash
mvn exec:java -Dexec.args="8082"
```

### Bước 3: Kiểm tra server đã chạy

Bạn sẽ thấy thông báo:
```
========================================
Remote Desktop Server đã khởi động!
Port: 8082
Lắng nghe trên: 0.0.0.0 (tất cả interface)

Truy cập từ máy này:
  http://localhost:8082

Truy cập từ máy khác trong mạng:
  http://192.168.1.100:8082
========================================
```

✅ **Nếu thấy thông báo này, server đã chạy thành công!**

### Bước 4: Mở client (trình duyệt)

1. **Mở trình duyệt** (Chrome, Edge, Firefox)
2. **Truy cập:** `http://localhost:8082`
3. Bạn sẽ thấy giao diện Remote Desktop

### Bước 5: Sử dụng (P2P giữa 2 tab)

#### Cách 1: Mở 2 tab trong cùng trình duyệt

1. **Tab 1:** `http://localhost:8082`
   - Nhấn **"Kết Nối WebSocket"**
   - Nhấn **"Bắt đầu Chia Sẻ Màn Hình"**
   - Chọn màn hình/cửa sổ muốn chia sẻ

2. **Tab 2:** Mở tab mới `http://localhost:8082`
   - Nhấn **"Kết Nối WebSocket"**
   - Tự động kết nối P2P với Tab 1
   - Nhận video stream từ Tab 1

#### Cách 2: Mở 2 trình duyệt khác nhau

1. **Chrome:** `http://localhost:8082` (chia sẻ màn hình)
2. **Edge:** `http://localhost:8082` (nhận video)

### Bước 6: Điều khiển

- **Di chuyển chuột** trên video → Điều khiển chuột trên máy server
- **Click chuột** → Click trên máy server
- **Scroll chuột** → Scroll trên máy server
- **Nhấn phím** → Gửi tín hiệu bàn phím

---

## 🌐 CHẠY TRÊN 2 MÁY KHÁC NHAU

### 📍 Máy A (Server)

#### Bước 1: Tìm IP của máy A

**Windows:**
```cmd
ipconfig
```
Tìm dòng **IPv4 Address**, ví dụ: `192.168.1.100`

**Linux/Mac:**
```bash
ifconfig
```
Hoặc:
```bash
ip addr show
```

#### Bước 2: Mở firewall (nếu cần)

**Windows PowerShell (chạy với quyền Admin):**
```powershell
New-NetFirewallRule -DisplayName "Remote Desktop Server" -Direction Inbound -LocalPort 8082 -Protocol TCP -Action Allow
```

**Windows CMD (chạy với quyền Admin):**
```cmd
netsh advfirewall firewall add rule name="Remote Desktop Server" dir=in action=allow protocol=TCP localport=8082
```

**Linux:**
```bash
sudo ufw allow 8082/tcp
```

**Mac:**
- Vào System Preferences → Security & Privacy → Firewall
- Thêm exception cho Java hoặc port 8082

#### Bước 3: Chạy server trên máy A

```powershell
# Windows PowerShell
.\run.ps1 8082
```

```cmd
# Windows CMD
run.bat 8082
```

```bash
# Linux/Mac
./run.sh 8082
```

Server sẽ hiển thị:
```
========================================
Remote Desktop Server đã khởi động!
Port: 8082
Lắng nghe trên: 0.0.0.0 (tất cả interface)

Truy cập từ máy này:
  http://localhost:8082

Truy cập từ máy khác trong mạng:
  http://192.168.1.100:8082
========================================
```

**Ghi nhớ IP:** `192.168.1.100` (thay bằng IP của máy A)

---

### 📍 Máy B (Client)

#### Bước 1: Kiểm tra kết nối mạng

**Windows:**
```cmd
ping 192.168.1.100
```

**Linux/Mac:**
```bash
ping 192.168.1.100
```

✅ **Nếu ping thành công, 2 máy đã kết nối!**

#### Bước 2: Mở trình duyệt trên máy B

1. **Mở trình duyệt** (Chrome, Edge, Firefox)
2. **Truy cập:** `http://192.168.78.111:8082`
   - Thay `192.168.78.111` bằng IP của máy A

#### Bước 3: Kết nối và sử dụng

1. **Nhấn "Kết Nối WebSocket"**
2. **Nhấn "Bắt đầu Chia Sẻ Màn Hình"**
3. Chọn màn hình/cửa sổ muốn chia sẻ
4. Máy A sẽ nhận được video stream từ máy B

---

## 🎯 KỊCH BẢN SỬ DỤNG

### Kịch bản 1: Remote Desktop (Điều khiển máy A từ máy B)

```
Máy A: Chạy server, cho phép điều khiển
Máy B: Mở trình duyệt, điều khiển máy A
```

**Cách làm:**
1. Máy A: Chạy server
2. Máy B: Truy cập `http://[IP_MÁY_A]:8082`
3. Máy B: Kết nối WebSocket và chia sẻ màn hình
4. Máy A: Nhận video và điều khiển từ máy B

### Kịch bản 2: Screen Sharing (Chia sẻ màn hình máy B cho máy A)

```
Máy A: Chạy server, xem màn hình máy B
Máy B: Chia sẻ màn hình cho máy A
```

**Cách làm:**
1. Máy A: Chạy server, mở trình duyệt `http://localhost:8082`
2. Máy B: Truy cập `http://[IP_MÁY_A]:8082`
3. Máy B: Chia sẻ màn hình
4. Máy A: Nhận video stream từ máy B (P2P)

### Kịch bản 3: P2P giữa 2 máy

```
Máy A: Chạy server, mở client
Máy B: Mở client, kết nối đến máy A
→ Video stream đi trực tiếp P2P giữa 2 máy
```

**Cách làm:**
1. Máy A: Chạy server, mở `http://localhost:8082`
2. Máy B: Mở `http://[IP_MÁY_A]:8082`
3. Cả 2 máy: Kết nối WebSocket
4. Tự động ghép cặp P2P
5. Một máy chia sẻ màn hình → Máy kia nhận video (P2P)

---

## 🐛 XỬ LÝ LỖI

### Lỗi: "Port already in use"

**Nguyên nhân:** Cổng 8082 đang được sử dụng

**Giải pháp:**
```bash
# Đổi sang port khác
.\run.ps1 9000
```

Sau đó truy cập: `http://localhost:9000`

### Lỗi: "Cannot connect to server" (từ máy khác)

**Nguyên nhân:** Firewall chặn hoặc IP sai

**Giải pháp:**

1. **Kiểm tra firewall:**
   ```powershell
   # Windows
   New-NetFirewallRule -DisplayName "Remote Desktop Server" -Direction Inbound -LocalPort 8082 -Protocol TCP -Action Allow
   ```

2. **Kiểm tra IP:**
   ```cmd
   # Trên máy A
   ipconfig
   ```
   Đảm bảo dùng đúng IP

3. **Kiểm tra kết nối:**
   ```cmd
   # Từ máy B
   ping [IP_MÁY_A]
   telnet [IP_MÁY_A] 8082
   ```

### Lỗi: "WebSocket connection failed"

**Nguyên nhân:** WebSocket không kết nối được

**Giải pháp:**
1. Kiểm tra server đang chạy
2. Kiểm tra firewall không chặn port
3. Thử refresh trang: `F5`
4. Kiểm tra console log (F12)

### Lỗi: "getDisplayMedia is not supported"

**Nguyên nhân:** Trình duyệt không hỗ trợ WebRTC

**Giải pháp:**
- Dùng trình duyệt mới hơn (Chrome, Edge, Firefox)
- Đảm bảo truy cập qua `http://` (không phải `file://`)

### Lỗi: "Permission denied" khi chia sẻ màn hình

**Nguyên nhân:** Chưa cho phép trình duyệt truy cập màn hình

**Giải pháp:**
1. Nhấn **"Cho phép"** khi trình duyệt hỏi
2. Kiểm tra cài đặt quyền của trình duyệt
3. Thử lại

### Lỗi: "Peer không tồn tại" hoặc "Chưa kết nối với peer"

**Nguyên nhân:** Chưa có peer hoặc peer đã ngắt kết nối

**Giải pháp:**
1. Đảm bảo có ít nhất 2 client kết nối
2. Đợi vài giây để tự động ghép cặp
3. Refresh trang nếu cần

---

## 💡 MẸO

### Mở nhanh trong trình duyệt

**Windows:**
- `Win + R` → Gõ `http://localhost:8082` → Enter

**Mac:**
- `Cmd + Space` → Gõ URL → Enter

### Bookmark để truy cập nhanh

1. Truy cập `http://localhost:8082`
2. Nhấn `Ctrl + D` (Windows) hoặc `Cmd + D` (Mac)
3. Lưu bookmark

### Mở Developer Console (để debug)

- **Chrome/Edge:** `F12` hoặc `Ctrl + Shift + I`
- **Firefox:** `F12` hoặc `Ctrl + Shift + K`
- Xem tab **Console** để kiểm tra lỗi

### Kiểm tra P2P đang hoạt động

1. Mở **Developer Tools** (F12)
2. Tab **Network**
3. Xem **WebSocket** (signaling - nhỏ)
4. Xem **WebRTC** (video stream - lớn, đi trực tiếp P2P)

### Dùng IP tĩnh

Để dễ nhớ, đặt IP tĩnh cho máy server:
- Windows: Network Settings → Change adapter options
- Linux: `/etc/netplan/` hoặc `nmcli`
- Mac: System Preferences → Network

---

## 📋 TÓM TẮT NHANH

### Chạy trên 1 máy:
```bash
# 1. Build
mvn clean install

# 2. Chạy server
.\run.ps1 8082

# 3. Mở trình duyệt
http://localhost:8082

# 4. Mở 2 tab để test P2P
```

### Chạy trên 2 máy:
```bash
# Máy A (Server):
.\run.ps1 8082
# Ghi nhớ IP: 192.168.1.100

# Máy B (Client):
# Mở trình duyệt: http://192.168.1.100:8082
```

---

## ✅ CHECKLIST

### Trước khi chạy:
- [ ] Java 11+ đã cài đặt
- [ ] Maven đã cài đặt
- [ ] Trình duyệt hiện đại (Chrome/Edge/Firefox)

### Khi chạy trên 1 máy:
- [ ] Server đã khởi động thành công
- [ ] Truy cập được `http://localhost:8082`
- [ ] Kết nối WebSocket thành công
- [ ] Có thể chia sẻ màn hình

### Khi chạy trên 2 máy:
- [ ] Firewall đã mở port 8082
- [ ] Biết IP của máy server
- [ ] Ping được từ máy client đến máy server
- [ ] Truy cập được `http://[IP]:8082` từ máy client
- [ ] Kết nối WebSocket thành công
- [ ] P2P hoạt động (xem console log)

---

**Chúc bạn sử dụng thành công!** 🎉

