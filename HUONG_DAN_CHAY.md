# 🚀 HƯỚNG DẪN CHẠY DỰ ÁN

## 📋 Yêu Cầu Hệ Thống

### Phần Mềm Cần Thiết

1. **Java JDK 11 hoặc cao hơn**
   - Kiểm tra: `java -version`
   - Tải: https://adoptium.net/ hoặc https://www.oracle.com/java/

2. **Maven 3.6+**
   - Kiểm tra: `mvn -version`
   - Tải: https://maven.apache.org/download.cgi

3. **Trình duyệt hiện đại** (Chrome, Edge, Firefox)
   - Hỗ trợ WebRTC
   - Hỗ trợ Screen Sharing API

### Hệ Điều Hành

- ✅ Windows 10/11
- ✅ Linux (Ubuntu, Debian, CentOS...)
- ✅ macOS

---

## 🔧 Cài Đặt

### Bước 1: Kiểm Tra Môi Trường

Mở Terminal/Command Prompt và chạy:

```bash
# Kiểm tra Java
java -version
# Kết quả mong đợi: openjdk version "11.x.x" hoặc cao hơn

# Kiểm tra Maven
mvn -version
# Kết quả mong đợi: Apache Maven 3.6.x hoặc cao hơn
```

Nếu thiếu, cài đặt theo link ở trên.

### Bước 2: Clone/Download Dự Án

```bash
# Nếu có Git
git clone <repository-url>
cd LTM1

# Hoặc giải nén file ZIP vào thư mục LTM1
```

### Bước 3: Build Dự Án (Lần Đầu)

```bash
# Build project
mvn clean install
```

Lần đầu sẽ tải dependencies, có thể mất vài phút.

---

## ▶️ CÁCH CHẠY

### Cách 1: Dùng Script Tự Động (Khuyến Nghị)

#### Windows

```bash
# Chạy với port mặc định (8082)
run.bat

# Hoặc chỉ định port
run.bat 8080
```

#### Linux/macOS

```bash
# Cấp quyền thực thi (lần đầu)
chmod +x run.sh

# Chạy với port mặc định (8082)
./run.sh

# Hoặc chỉ định port
./run.sh 8080
```

#### Windows PowerShell

```powershell
# Chạy với port mặc định
.\run.ps1

# Hoặc chỉ định port
.\run.ps1 8080
```

### Cách 2: Chạy Thủ Công

#### Bước 1: Build Project

```bash
mvn clean install
```

#### Bước 2: Chạy Server

```bash
# Port mặc định 8082
mvn exec:java

# Hoặc chỉ định port
mvn exec:java -Dexec.args="8080"
```

### Cách 3: Chạy JAR File (Sau Khi Build)

```bash
# Build JAR
mvn clean package

# Chạy JAR
java -jar target/remote-desktop-1.0-SNAPSHOT.jar 8082
```

---

## 🌐 Truy Cập Ứng Dụng

### Sau Khi Server Khởi Động

Bạn sẽ thấy thông báo:

```
========================================
Remote Desktop Server đã khởi động!
Port: 8082
Lắng nghe trên: 0.0.0.0 (tất cả interface)

Truy cập từ máy này:
  http://localhost:8082

Truy cập từ máy khác trong mạng:
  http://<IP-MÁY>:8082
```

### Mở Trình Duyệt

1. **Từ máy chạy server:**
   ```
   http://localhost:8082
   ```

2. **Từ máy khác trong cùng mạng:**
   ```
   http://<IP-CỦA-MÁY-SERVER>:8082
   ```
   
   Ví dụ: `http://192.168.1.100:8082`

### Lấy IP Của Máy Server

#### Windows
```bash
ipconfig
# Tìm "IPv4 Address" (ví dụ: 192.168.1.100)
```

#### Linux/macOS
```bash
# Linux
ip addr show
# hoặc
ifconfig

# macOS
ifconfig | grep "inet "
```

---

## 🧪 TEST KẾT NỐI

### Test Cơ Bản (Cùng 1 Máy)

1. Mở 2 tab trình duyệt:
   - Tab 1: `http://localhost:8082`
   - Tab 2: `http://localhost:8082`

2. **Tab 1:**
   - Nhấn "Kết Nối WebSocket"
   - Đợi "P2P: Đã kết nối với peer"
   - Nhấn "Bắt đầu Chia Sẻ Màn Hình"
   - Chọn màn hình/cửa sổ để share

3. **Tab 2:**
   - Nhấn "Kết Nối WebSocket"
   - Đợi "P2P: Đã kết nối với peer"
   - Xem video từ Tab 1

### Test 2 Máy Khác Nhau (Cùng Mạng LAN)

1. **Máy A (Server):**
   - Chạy server: `run.bat` hoặc `./run.sh`
   - Lấy IP: `192.168.1.100` (ví dụ)

2. **Máy A:**
   - Mở: `http://localhost:8082`
   - Kết nối WebSocket → Share màn hình

3. **Máy B:**
   - Mở: `http://192.168.1.100:8082`
   - Kết nối WebSocket → Xem video

### Test 2 Máy Khác Mạng (Internet)

Khi 2 máy ở **khác mạng** (khác router, khác ISP), cần cấu hình thêm để WebRTC hoạt động.

#### Bước 1: Kiểm Tra Cấu Hình STUN

File `webrtc-client.js` đã có STUN servers mặc định:

```javascript
iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // ...
]
```

**Kiểm tra:**
- Mở `src/main/webapp/webrtc-client.js`
- Xem dòng 12-20, đảm bảo có STUN servers
- Nếu `iceServers: []` (rỗng), thêm STUN servers vào

**Xem chi tiết:** `STUN_TURN_GUIDE.md`

#### Bước 2: Lấy IP Public Của Máy Server

**Cách 1: Dùng Website**
- Mở trình duyệt trên máy server
- Truy cập: https://whatismyipaddress.com/
- Ghi lại **IPv4 Address** (ví dụ: `118.71.135.68`)

**Cách 2: Dùng Command Line**
```bash
# Windows
curl https://api.ipify.org

# Linux/macOS
curl https://api.ipify.org
# hoặc
curl ifconfig.me
```

**Lưu ý:** IP public có thể thay đổi nếu router dùng DHCP động.

#### Bước 3: Cấu Hình Firewall

**Windows:**

1. Mở **Windows Defender Firewall**
2. Chọn **Allow an app or feature through Windows Defender Firewall**
3. Tìm **Java** hoặc **javaw.exe**
4. ✅ Tick **Private** và **Public**
5. Nếu không có, nhấn **Allow another app** → Browse → Chọn `java.exe` trong thư mục JDK

**Hoặc dùng Command (Admin):**
```powershell
# Cho phép port 8082
New-NetFirewallRule -DisplayName "Remote Desktop Server" -Direction Inbound -LocalPort 8082 -Protocol TCP -Action Allow
```

**Linux (Ubuntu/Debian):**
```bash
# UFW
sudo ufw allow 8082/tcp
sudo ufw reload

# Hoặc iptables
sudo iptables -A INPUT -p tcp --dport 8082 -j ACCEPT
```

**macOS:**
- System Preferences → Security & Privacy → Firewall
- Nhấn **Firewall Options**
- Cho phép Java hoặc thêm rule cho port 8082

#### Bước 4: Cấu Hình Router (Port Forwarding) - Nếu Cần

**Khi nào cần:**
- Router chặn kết nối từ Internet vào
- Server nằm sau NAT/router

**Cách làm:**

1. **Truy cập router admin:**
   - Thường là: `192.168.1.1` hoặc `192.168.0.1`
   - Đăng nhập với username/password router

2. **Tìm Port Forwarding/Virtual Server:**
   - Tên có thể khác: Port Forwarding, NAT, Virtual Server, Port Mapping

3. **Thêm rule:**
   - **Service Name:** Remote Desktop Server
   - **External Port:** 8082
   - **Internal IP:** IP LAN của máy server (ví dụ: `192.168.1.100`)
   - **Internal Port:** 8082
   - **Protocol:** TCP
   - **Save/Apply**

4. **Lưu ý:**
   - IP LAN của máy server phải cố định (hoặc dùng DHCP reservation)
   - Một số router cần restart để áp dụng

**Kiểm tra Port Forwarding:**
- Website: https://www.yougetsignal.com/tools/open-ports/
- Nhập IP public và port 8082
- Nếu **Open** → Port forwarding thành công

#### Bước 5: Chạy Server

**Máy A (Server):**
```bash
# Chạy server
run.bat 8082
# hoặc
./run.sh 8082
```

**Kiểm tra server đã lắng nghe:**
- Xem log: `Server started on port 8082`
- Test local: `http://localhost:8082` phải mở được

#### Bước 6: Test Kết Nối

**Máy A (Server - Share màn hình):**
1. Mở trình duyệt: `http://localhost:8082`
2. Nhấn **"Kết Nối WebSocket"**
3. Đợi: `P2P: Đã kết nối với peer`
4. Nhấn **"Bắt đầu Chia Sẻ Màn Hình"**
5. Chọn màn hình/cửa sổ để share

**Máy B (Client - Xem video):**
1. Mở trình duyệt: `http://<IP-PUBLIC-CỦA-MÁY-A>:8082`
   - Ví dụ: `http://171.255.113.91:8082`
2. Nhấn **"Kết Nối WebSocket"**
3. Đợi: `P2P: Đã kết nối với peer`
4. Xem video từ Máy A

#### Bước 7: Kiểm Tra ICE Connection

**Mở Console (F12) trên cả 2 máy:**

**Log mong đợi:**
```
🔌 ICE connection state = checking
🔌 ICE connection state = connected  ← Phải thấy dòng này!
✅ WebRTC: Đã kết nối P2P
```

**Nếu thấy:**
- `ICE connection state = failed` → Xem phần Troubleshooting bên dưới
- `ICE candidate: ... typ srflx` → STUN hoạt động tốt
- `ICE candidate: ... typ relay` → Đang dùng TURN (nếu có)

#### Troubleshooting Khi Không Kết Nối Được

**1. WebSocket không kết nối:**
- ✅ Kiểm tra server đã chạy chưa
- ✅ Kiểm tra URL đúng: `http://` (không phải `https://`)
- ✅ Kiểm tra firewall đã mở port 8082 chưa
- ✅ Kiểm tra port forwarding (nếu có router)

**2. ICE connection failed:**
- ✅ Kiểm tra STUN servers trong `webrtc-client.js`
- ✅ Kiểm tra firewall UDP (WebRTC dùng UDP)
- ✅ Thử tắt firewall tạm thời để test
- ✅ Xem log Console để biết lỗi cụ thể

**3. Router chặn P2P:**
- Một số router có **AP Isolation** hoặc **Client Isolation**
- Tắt tính năng này trong router admin
- Hoặc dùng TURN server (xem `STUN_TURN_GUIDE.md`)

**4. Symmetric NAT:**
- Router không hỗ trợ NAT traversal
- **Giải pháp:** Cần TURN server (không còn P2P thuần)
- Xem `STUN_TURN_GUIDE.md` để cấu hình TURN

**5. IP Public thay đổi:**
- Router dùng DHCP động → IP public thay đổi
- **Giải pháp:** Dùng Dynamic DNS (DDNS) hoặc mua IP tĩnh

#### Test Nhanh Với Người Khác

**Chia sẻ thông tin:**
1. IP public của bạn (hoặc domain nếu có)
2. Port: `8082` (hoặc port bạn dùng)
3. URL: `http://<IP>:8082`

**Người khác:**
- Mở URL trên trình duyệt
- Kết nối WebSocket
- Xem video của bạn

**Lưu ý bảo mật:**
- ⚠️ Mở port ra Internet có rủi ro bảo mật
- Chỉ dùng cho test/demo
- Production nên dùng HTTPS và authentication

### Test Với 4G Hotspot (Khuyến Nghị)

**Tại sao 4G tốt hơn WiFi cho P2P?**

1. **NAT đơn giản hơn:**
   - WiFi qua router → NAT phức tạp, có thể có AP Isolation
   - 4G hotspot → NAT của nhà mạng, thường đơn giản hơn

2. **Ít firewall hơn:**
   - Router WiFi thường có firewall chặt
   - 4G ít cấu hình firewall hơn

3. **Dễ test hơn:**
   - Không cần cấu hình router
   - Không cần port forwarding
   - Chỉ cần mở firewall Windows

**⚠️ Lưu ý:** 4G vẫn có NAT, không phải lúc nào cũng tốt hơn. Nhưng thường dễ kết nối P2P hơn WiFi.

#### Cách Test Với 4G Hotspot

**Kịch bản 1: Máy A dùng 4G, Máy B dùng WiFi (hoặc ngược lại)**

**Máy A (Dùng 4G Hotspot - Share màn hình):**

1. **Bật 4G hotspot trên điện thoại:**
   - Settings → Personal Hotspot / Mobile Hotspot
   - Bật và ghi lại tên WiFi + password

2. **Kết nối máy A vào 4G hotspot:**
   - Disconnect WiFi
   - Connect vào 4G hotspot từ điện thoại

3. **Lấy IP public:**
   ```bash
   # Mở trình duyệt
   https://whatismyipaddress.com/
   # Ghi lại IP (ví dụ: 118.71.135.68)
   ```

4. **Mở firewall (nếu chưa):**
   ```powershell
   # Windows (Admin)
   New-NetFirewallRule -DisplayName "Remote Desktop Server" -Direction Inbound -LocalPort 8082 -Protocol TCP -Action Allow
   ```

5. **Chạy server:**
   ```bash
   run.bat 8082
   ```

6. **Mở trình duyệt:**
   - `http://localhost:8082`
   - Kết nối WebSocket → Share màn hình

**Máy B (Dùng WiFi - Xem video):**

1. **Mở trình duyệt:**
   - `http://<IP-PUBLIC-CỦA-MÁY-A>:8082`
   - Ví dụ: `http://118.71.135.68:8082`

2. **Kết nối WebSocket → Xem video**

**Kịch bản 2: Cả 2 máy dùng 4G (Khác nhà mạng)**

- Máy A: 4G Viettel
- Máy B: 4G VinaPhone

**Cách làm:**
- Làm tương tự như trên
- Đảm bảo cả 2 máy đều có STUN servers trong `webrtc-client.js`
- Test kết nối như bình thường

#### So Sánh WiFi vs 4G Hotspot

| Tiêu Chí | WiFi (Qua Router) | 4G Hotspot |
|----------|-------------------|------------|
| **NAT** | Phức tạp, có thể có AP Isolation | Đơn giản hơn |
| **Firewall** | Router firewall chặt | Ít firewall hơn |
| **Port Forwarding** | ⚠️ Cần cấu hình | ✅ Không cần |
| **Tốc độ** | Thường nhanh hơn | Phụ thuộc sóng 4G |
| **Ổn định** | Ổn định hơn | Có thể bị gián đoạn |
| **Chi phí** | Miễn phí (nếu có WiFi) | Tốn data 4G |
| **P2P thành công** | ⚠️ Tùy router | ✅ Thường tốt hơn |

#### Khi Nào Dùng 4G?

**✅ Nên dùng 4G khi:**
- Router WiFi có AP Isolation (không tắt được)
- Router không hỗ trợ port forwarding
- Router có firewall quá chặt
- Cần test nhanh, không muốn cấu hình router
- Test với người ở xa (khác mạng)

**❌ Không nên dùng 4G khi:**
- Cần tốc độ cao, ổn định
- Cần tiết kiệm data
- Đã cấu hình router tốt
- Test trên cùng mạng LAN

#### Troubleshooting Với 4G

**1. Không kết nối được WebSocket:**
- ✅ Kiểm tra firewall Windows đã mở port 8082
- ✅ Kiểm tra IP public đúng chưa
- ✅ Thử tắt firewall tạm thời để test

**2. ICE connection failed:**
- ✅ Đảm bảo có STUN servers trong `webrtc-client.js`
- ✅ Một số nhà mạng chặn UDP → Cần TURN server
- ✅ Thử đổi nhà mạng (Viettel, VinaPhone, Mobifone)

**3. Tốc độ chậm:**
- 4G phụ thuộc vào sóng
- Thử di chuyển đến nơi sóng tốt hơn
- Hoặc dùng WiFi nếu có

**4. Mất kết nối:**
- 4G có thể bị gián đoạn khi di chuyển
- Đảm bảo điện thoại không tắt màn hình (giữ hotspot)
- Hoặc dùng WiFi nếu cần ổn định

#### Tips

1. **Test nhanh:** Dùng 4G hotspot để test P2P khác mạng, không cần cấu hình router
2. **Production:** Nếu cần ổn định, vẫn nên dùng WiFi + cấu hình router đúng
3. **Kết hợp:** Máy server dùng WiFi (ổn định), máy client dùng 4G (linh hoạt)

---

## 🔍 KIỂM TRA LOG

### Console Log (Server)

Khi chạy server, xem log để debug:

```
[INFO] Server started on port 8082
[INFO] Client connected: client_1_xxxxx
[INFO] Client paired: client_1_xxxxx <-> client_2_xxxxx
```

### Browser Console (Client)

Mở Developer Tools (F12) → Console:

```
✅ WebSocket: Đã kết nối
✅ P2P: Đã kết nối với peer
🔌 ICE connection state = checking
🔌 ICE connection state = connected
✅ Video đang play
```

---

## ⚠️ XỬ LÝ LỖI

### Lỗi: "Port đã được sử dụng"

```bash
# Windows: Tìm process dùng port
netstat -ano | findstr :8082
taskkill /PID <PID> /F

# Linux/macOS: Tìm process dùng port
lsof -i :8082
kill -9 <PID>

# Hoặc đổi port
run.bat 8080
```

### Lỗi: "Maven không tìm thấy"

- Cài đặt Maven và thêm vào PATH
- Hoặc dùng Maven Wrapper (nếu có)

### Lỗi: "Java version không đúng"

```bash
# Kiểm tra version
java -version

# Cần Java 11+
# Cài đặt từ: https://adoptium.net/
```

### Lỗi: "WebSocket không kết nối được"

1. Kiểm tra server đã chạy chưa
2. Kiểm tra URL đúng: `http://localhost:8082` (không phải `https://`)
3. Kiểm tra firewall chặn port 8082
4. Xem Console log (F12) để biết lỗi cụ thể

### Lỗi: "ICE connection failed"

- **Cùng mạng:** Kiểm tra firewall UDP
- **Khác mạng:** Xem `STUN_TURN_GUIDE.md` để cấu hình STUN/TURN

### Lỗi: "Video không hiển thị"

1. Mở Console (F12) xem log
2. Kiểm tra `ICE connection state = connected`
3. Kiểm tra video element có `srcObject` không
4. Thử refresh trang (Ctrl+F5)

---

## 📝 QUY TRÌNH CHẠY ĐẦY ĐỦ

### Lần Đầu Chạy

```bash
# 1. Kiểm tra môi trường
java -version
mvn -version

# 2. Build project
mvn clean install

# 3. Chạy server
run.bat          # Windows
./run.sh         # Linux/macOS
.\run.ps1        # PowerShell

# 4. Mở trình duyệt
# http://localhost:8082
```

### Lần Sau (Đã Build Rồi)

```bash
# Chỉ cần chạy server
run.bat

# Hoặc nếu code thay đổi, build lại
mvn clean install
run.bat
```

---

## 🎯 TIPS

1. **Port mặc định:** 8082 (có thể đổi trong script)
2. **Hot reload:** Không có, cần restart server khi sửa code
3. **Multiple clients:** Hỗ trợ nhiều client, tự động ghép cặp
4. **LAN vs Internet:** 
   - LAN: Dùng `iceServers: []` (nhanh hơn)
   - Internet: Dùng STUN (đã cấu hình sẵn)

---

## 📚 TÀI LIỆU THAM KHẢO

- `STUN_TURN_GUIDE.md` - Hướng dẫn cấu hình STUN/TURN
- `INSTRUCTION.md` - Hướng dẫn bài tập lớn

---

## ❓ FAQ

**Q: Có cần cài đặt gì thêm không?**  
A: Chỉ cần Java 11+ và Maven 3.6+. Tất cả dependencies sẽ tự động tải khi build.

**Q: Có thể chạy trên port khác không?**  
A: Có, truyền port làm tham số: `run.bat 8080`

**Q: Server có chạy được trên Internet không?**  
A: Có, nhưng cần mở firewall và có thể cần cấu hình STUN/TURN.

**Q: Có thể chạy nhiều server cùng lúc không?**  
A: Có, dùng port khác nhau: `run.bat 8082` và `run.bat 8083`

**Q: Làm sao dừng server?**  
A: Nhấn `Ctrl+C` trong terminal, hoặc đóng cửa sổ terminal.

---

**Chúc bạn chạy thành công! 🎉**

