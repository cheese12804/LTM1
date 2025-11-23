/**
 * Main script để điều phối WebRTC và WebSocket
 */

let isScreenSharing = false;

// Dùng DataChannel cho điều khiển (true để test local)
let useDataChannel = true;

/**
 * Cập nhật trạng thái hiển thị
 */
function updateStatus(message) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
        statusText.textContent = message;
    }
    console.log("Status:", message);
}

/**
 * Bắt đầu chia sẻ màn hình
 */
async function startScreenShare() {
    if (!wsClient.isConnected) {
        alert("Vui lòng kết nối WebSocket trước!");
        return;
    }
    
    // Kiểm tra có peer chưa
    if (!wsClient.peerId) {
        alert("Chưa kết nối với peer! Vui lòng đợi tự động kết nối hoặc refresh trang.");
        updateStatus("Đang chờ kết nối peer...");
        return;
    }
    
    try {
        console.log("[MAIN] Bắt đầu startScreenShare...");
        console.log("[MAIN] WebSocket connected:", wsClient.isConnected);
        console.log("[MAIN] Peer ID:", wsClient.peerId);
        
        await rtcClient.startScreenShare();
        isScreenSharing = true;
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        
        // Thiết lập event listeners cho chuột và bàn phím
        setupInputHandlers();
        
        console.log("[MAIN] ✅ startScreenShare hoàn tất");
    } catch (error) {
        console.error("❌ [MAIN] Lỗi startScreenShare:", error);
        console.error("❌ [MAIN] Error stack:", error.stack);
        alert("Lỗi: " + error.message);
    }
}

/**
 * Dừng chia sẻ màn hình
 */
function stopScreenShare() {
    rtcClient.stopScreenShare();
    isScreenSharing = false;
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    
    // Gỡ bỏ event listeners
    removeInputHandlers();
}

/**
 * Kết nối WebSocket
 */
async function connectWebSocket() {
    try {
        await wsClient.connect();
        document.getElementById('connectBtn').disabled = true;
        document.getElementById('disconnectBtn').disabled = false;
        // Lấy danh sách client sau khi kết nối
        setTimeout(() => {
            wsClient.getClientList();
        }, 500);
    } catch (error) {
        console.error("Lỗi kết nối WebSocket:", error);
        alert("Không thể kết nối WebSocket: " + error.message);
    }
}

/**
 * Ngắt kết nối WebSocket
 */
function disconnectWebSocket() {
    wsClient.disconnect();
    document.getElementById('connectBtn').disabled = false;
    document.getElementById('disconnectBtn').disabled = true;
    
    if (isScreenSharing) {
        stopScreenShare();
    }
}

/**
 * Thiết lập xử lý input (chuột, bàn phím)
 */
function setupInputHandlers() {
    const video = document.getElementById('remoteVideo');
    if (!video) return;
    
    // Xử lý di chuyển chuột
    video.addEventListener('mousemove', handleMouseMove);
    
    // Xử lý click chuột
    video.addEventListener('mousedown', handleMouseDown);
    video.addEventListener('mouseup', handleMouseUp);
    video.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Xử lý scroll chuột
    video.addEventListener('wheel', handleMouseWheel);
    
    // Xử lý bàn phím
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
}

/**
 * Gỡ bỏ xử lý input
 */
function removeInputHandlers() {
    const video = document.getElementById('remoteVideo');
    if (!video) return;
    
    video.removeEventListener('mousemove', handleMouseMove);
    video.removeEventListener('mousedown', handleMouseDown);
    video.removeEventListener('mouseup', handleMouseUp);
    video.removeEventListener('wheel', handleMouseWheel);
    
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
}

/**
 * Xử lý di chuyển chuột
 */
function handleMouseMove(event) {
    const video = document.getElementById('remoteVideo');
    if (!video) return;
    
    // Cho phép điều khiển nếu đang chia sẻ HOẶC đang nhận video
    if (!isScreenSharing && !window.isReceivingVideo) return;
    
    // Kiểm tra video có kích thước hợp lệ không
    if (!video.videoWidth || !video.videoHeight) {
        console.warn("Video chưa có kích thước, đợi...");
        return;
    }
    
    const rect = video.getBoundingClientRect();
    const scaleX = video.videoWidth / rect.width;
    const scaleY = video.videoHeight / rect.height;
    
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);
    
    // Chỉ gửi nếu tọa độ hợp lệ
    if (x >= 0 && y >= 0 && x <= video.videoWidth && y <= video.videoHeight) {
        if (useDataChannel) {
            rtcClient.sendControlMessage({
                type: "mouseMove",
                x: x,
                y: y
            });
        } else {
            wsClient.sendMouseMove(x, y);
        }
    }
}

/**
 * Xử lý nhấn chuột
 */
function handleMouseDown(event) {
    // Cho phép điều khiển nếu đang chia sẻ HOẶC đang nhận video
    if (!isScreenSharing && !window.isReceivingVideo) return;
    
    const button = event.button === 0 ? 'left' : 
                   event.button === 2 ? 'right' : 'middle';
    
    if (useDataChannel) {
        rtcClient.sendControlMessage({
            type: "mouseClick",
            button: button,
            pressed: true
        });
    } else {
        wsClient.sendMouseClick(button, true);
    }
}

/**
 * Xử lý thả chuột
 */
function handleMouseUp(event) {
    // Cho phép điều khiển nếu đang chia sẻ HOẶC đang nhận video
    if (!isScreenSharing && !window.isReceivingVideo) return;
    
    const button = event.button === 0 ? 'left' : 
                   event.button === 2 ? 'right' : 'middle';
    
    if (useDataChannel) {
        rtcClient.sendControlMessage({
            type: "mouseClick",
            button: button,
            pressed: false
        });
    } else {
        wsClient.sendMouseClick(button, false);
    }
}

/**
 * Xử lý scroll chuột
 */
function handleMouseWheel(event) {
    // Cho phép điều khiển nếu đang chia sẻ HOẶC đang nhận video
    if (!isScreenSharing && !window.isReceivingVideo) return;
    
    event.preventDefault();
    const delta = event.deltaY > 0 ? 1 : -1;
    
    if (useDataChannel) {
        rtcClient.sendControlMessage({
            type: "mouseScroll",
            delta: delta
        });
    } else {
        wsClient.sendMouseScroll(delta);
    }
}

/**
 * Xử lý nhấn phím
 */
function handleKeyDown(event) {
    // Cho phép điều khiển nếu đang chia sẻ HOẶC đang nhận video
    if (!isScreenSharing && !window.isReceivingVideo) return;
    
    // Ngăn chặn các phím tắt trình duyệt
    if (event.key === 'F12' || 
        (event.ctrlKey && event.key === 's') ||
        (event.ctrlKey && event.key === 'u')) {
        event.preventDefault();
    }
    
    const key = event.key.length === 1 ? event.key : event.key.toLowerCase();
    
    if (useDataChannel) {
        rtcClient.sendControlMessage({
            type: "keyPress",
            key: key,
            pressed: true
        });
    } else {
        wsClient.sendKeyPress(key, true);
    }
}

/**
 * Xử lý thả phím
 */
function handleKeyUp(event) {
    // Cho phép điều khiển nếu đang chia sẻ HOẶC đang nhận video
    if (!isScreenSharing && !window.isReceivingVideo) return;
    
    const key = event.key.length === 1 ? event.key : event.key.toLowerCase();
    
    if (useDataChannel) {
        rtcClient.sendControlMessage({
            type: "keyPress",
            key: key,
            pressed: false
        });
    } else {
        wsClient.sendKeyPress(key, false);
    }
}

/**
 * Cập nhật danh sách client (hiển thị trong console, có thể thêm UI sau)
 */
function updateClientList(clients) {
    console.log("Danh sách client có sẵn:", clients);
    const clientIds = Object.keys(clients);
    if (clientIds.length > 0) {
        updateStatus(`Tìm thấy ${clientIds.length} client khác. Đang tự động kết nối...`);
    }
}

/**
 * Tự động kết nối với peer đầu tiên có sẵn
 */
function autoConnectToPeer() {
    const clients = wsClient.availableClients;
    const clientIds = Object.keys(clients);
    
    // Tìm peer đầu tiên chưa có peer
    for (const clientId of clientIds) {
        if (!clients[clientId].hasPeer) {
            console.log("Tự động kết nối với peer: " + clientId);
            wsClient.connectToPeer(clientId);
            
            // Tạo peer connection sẵn sàng
            setTimeout(() => {
                if (!rtcClient.peerConnection) {
                    console.log("Tạo peer connection sẵn sàng...");
                    rtcClient.createPeerConnection();
                }
            }, 500);
            
            return;
        }
    }
    
    if (clientIds.length === 0) {
        updateStatus("Chưa có client khác. Chờ client khác kết nối...");
    } else {
        updateStatus("Tất cả client đã có peer. Chờ client mới...");
    }
}

// Khởi tạo khi trang load
window.addEventListener('load', () => {
    updateStatus("Sẵn sàng. Nhấn 'Kết Nối WebSocket' để bắt đầu.");
});

