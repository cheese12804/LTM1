/**
 * WebSocket Client để gửi tín hiệu điều khiển (chuột, bàn phím)
 */
class WebSocketClient {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.clientId = null;
        this.peerId = null;
        this.availableClients = {};
        // Tự động lấy port từ URL hiện tại
        const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
        this.serverUrl = `ws://${window.location.hostname}:${port}/ws`;
    }
    
    /**
     * Kết nối đến WebSocket server
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);
                
                this.ws.onopen = () => {
                    this.isConnected = true;
                    console.log("WebSocket đã kết nối");
                    updateStatus("WebSocket: Đã kết nối");
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    console.log("Nhận message từ server:", message);
                    
                    if (message.type === "connected") {
                        this.clientId = message.clientId;
                        updateStatus("WebSocket: " + message.message + " (ID: " + this.clientId + ")");
                        console.log("Client ID: " + this.clientId);
                    } else if (message.type === "webrtc-signal") {
                        // Xử lý WebRTC signaling từ peer (P2P)
                        handleWebRTCSignal(message.data);
                    } else if (message.type === "client-list") {
                        // Nhận danh sách client
                        this.availableClients = message.clients || {};
                        console.log("Danh sách client:", this.availableClients);
                        updateClientList(this.availableClients);
                        // Tự động kết nối với peer đầu tiên nếu có
                        autoConnectToPeer();
                    } else if (message.type === "peer-connected") {
                        // Đã kết nối với peer
                        this.peerId = message.peerId;
                        updateStatus("P2P: Đã kết nối với peer " + message.peerId);
                        console.log("✅ Đã kết nối P2P với: " + message.peerId);
                        
                        // Cleanup và tạo peer connection mới sẵn sàng để nhận video
                        console.log("🔄 Tạo peer connection mới sẵn sàng để nhận video...");
                        rtcClient.createPeerConnection();
                    } else if (message.type === "peer-disconnected") {
                        // Peer đã ngắt kết nối
                        console.log("⚠️ Peer đã ngắt kết nối");
                        this.peerId = null;
                        updateStatus("P2P: Peer đã ngắt kết nối");
                        
                        // Cleanup peer connection và video
                        rtcClient.stopScreenShare();
                    } else if (message.type === "error") {
                        updateStatus("Lỗi: " + message.message);
                        console.error("Lỗi:", message.message);
                    }
                };
                
                this.ws.onerror = (error) => {
                    console.error("WebSocket error:", error);
                    updateStatus("WebSocket: Lỗi kết nối");
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    this.isConnected = false;
                    console.log("WebSocket đã ngắt kết nối");
                    updateStatus("WebSocket: Đã ngắt kết nối");
                };
                
            } catch (error) {
                console.error("Lỗi tạo WebSocket:", error);
                reject(error);
            }
        });
    }
    
    /**
     * Ngắt kết nối WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }
    
    /**
     * Gửi tín hiệu di chuyển chuột
     */
    sendMouseMove(x, y) {
        if (this.isConnected && this.ws) {
            const message = {
                type: "mouseMove",
                x: x,
                y: y
            };
            this.ws.send(JSON.stringify(message));
        }
    }
    
    /**
     * Gửi tín hiệu click chuột
     */
    sendMouseClick(button, pressed) {
        if (this.isConnected && this.ws) {
            const message = {
                type: "mouseClick",
                button: button, // "left", "right", "middle"
                pressed: pressed // true = nhấn, false = thả
            };
            this.ws.send(JSON.stringify(message));
        }
    }
    
    /**
     * Gửi tín hiệu scroll chuột
     */
    sendMouseScroll(delta) {
        if (this.isConnected && this.ws) {
            const message = {
                type: "mouseScroll",
                delta: delta
            };
            this.ws.send(JSON.stringify(message));
        }
    }
    
    /**
     * Gửi tín hiệu nhấn phím
     */
    sendKeyPress(key, pressed) {
        if (this.isConnected && this.ws) {
            const message = {
                type: "keyPress",
                key: key,
                pressed: pressed
            };
            this.ws.send(JSON.stringify(message));
        }
    }
    
    /**
     * Gửi WebRTC signaling message
     */
    sendWebRTCSignal(signalData) {
        if (this.isConnected && this.ws) {
            const message = {
                type: "webrtc-signal",
                data: signalData
            };
            this.ws.send(JSON.stringify(message));
        }
    }
    
    /**
     * Kết nối với peer
     */
    connectToPeer(peerId) {
        if (this.isConnected && this.ws) {
            const message = {
                type: "connect-peer",
                peerId: peerId
            };
            this.ws.send(JSON.stringify(message));
        }
    }
    
    /**
     * Ngắt kết nối với peer
     */
    disconnectPeer() {
        if (this.isConnected && this.ws) {
            const message = {
                type: "disconnect-peer"
            };
            this.ws.send(JSON.stringify(message));
            this.peerId = null;
        }
    }
    
    /**
     * Lấy danh sách client
     */
    getClientList() {
        if (this.isConnected && this.ws) {
            const message = {
                type: "get-clients"
            };
            this.ws.send(JSON.stringify(message));
        }
    }
}

// Tạo instance global
const wsClient = new WebSocketClient();

