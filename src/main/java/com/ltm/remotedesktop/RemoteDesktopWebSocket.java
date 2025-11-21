package com.ltm.remotedesktop;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.WebSocketListener;

import java.awt.*;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket handler để xử lý tín hiệu điều khiển từ client
 * Nhận tín hiệu chuột, bàn phím và điều khiển máy tính đích
 */
public class RemoteDesktopWebSocket implements WebSocketListener {
    
    private Session session;
    private Robot robot;
    private String clientId;
    private String peerId; // ID của peer đang kết nối P2P
    private static final ConcurrentHashMap<String, RemoteDesktopWebSocket> clients = new ConcurrentHashMap<>();
    private static int clientCounter = 0;
    
    public RemoteDesktopWebSocket() {
        // Tạo ID duy nhất cho client
        this.clientId = "client_" + (++clientCounter) + "_" + System.currentTimeMillis();
        try {
            // Khởi tạo Robot để điều khiển chuột và bàn phím
            robot = new Robot();
            robot.setAutoDelay(10);
        } catch (AWTException e) {
            System.err.println("Không thể khởi tạo Robot: " + e.getMessage());
        }
    }
    
    public String getClientId() {
        return clientId;
    }
    
    public String getPeerId() {
        return peerId;
    }
    
    public void setPeerId(String peerId) {
        this.peerId = peerId;
    }
    
    @Override
    public void onWebSocketConnect(Session session) {
        this.session = session;
        clients.put(clientId, this);
        
        System.out.println("Client kết nối: " + clientId);
        System.out.println("Tổng số client: " + clients.size());
        
        // Gửi thông báo kết nối thành công kèm client ID
        JsonObject response = new JsonObject();
        response.addProperty("type", "connected");
        response.addProperty("message", "Kết nối thành công!");
        response.addProperty("clientId", clientId);
        response.addProperty("totalClients", clients.size());
        sendMessage(response.toString());
        
        // Gửi danh sách client khác (để chọn peer)
        sendClientList();
    }
    
    @Override
    public void onWebSocketClose(int statusCode, String reason) {
        // Thông báo cho peer nếu có
        if (peerId != null) {
            RemoteDesktopWebSocket peer = clients.get(peerId);
            if (peer != null) {
                JsonObject notification = new JsonObject();
                notification.addProperty("type", "peer-disconnected");
                notification.addProperty("message", "Peer đã ngắt kết nối");
                peer.sendMessage(notification.toString());
                peer.setPeerId(null);
            }
        }
        
        clients.remove(clientId);
        System.out.println("Client ngắt kết nối: " + clientId);
        System.out.println("Tổng số client còn lại: " + clients.size());
    }
    
    @Override
    public void onWebSocketError(Throwable cause) {
        System.err.println("WebSocket Error: " + cause.getMessage());
        cause.printStackTrace();
    }
    
    @Override
    public void onWebSocketText(String message) {
        try {
            // Parse JSON message từ client
            JsonObject json = JsonParser.parseString(message).getAsJsonObject();
            String type = json.get("type").getAsString();
            
            // Xử lý các loại tín hiệu khác nhau
            switch (type) {
                case "mouseMove":
                    handleMouseMove(json);
                    break;
                case "mouseClick":
                    handleMouseClick(json);
                    break;
                case "mouseScroll":
                    handleMouseScroll(json);
                    break;
                case "keyPress":
                    handleKeyPress(json);
                    break;
                case "webrtc-signal":
                    // Chuyển tiếp WebRTC signaling message đến peer
                    handleWebRTCSignal(json);
                    break;
                case "connect-peer":
                    // Kết nối với peer khác
                    handleConnectPeer(json);
                    break;
                case "disconnect-peer":
                    // Ngắt kết nối với peer
                    handleDisconnectPeer();
                    break;
                case "get-clients":
                    // Lấy danh sách client
                    sendClientList();
                    break;
                default:
                    System.out.println("Loại message không xác định: " + type);
            }
            
        } catch (Exception e) {
            System.err.println("Lỗi xử lý message: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    @Override
    public void onWebSocketBinary(byte[] payload, int offset, int len) {
        // Không sử dụng binary data trong project này
    }
    
    /**
     * Xử lý di chuyển chuột
     */
    private void handleMouseMove(JsonObject json) {
        int x = json.get("x").getAsInt();
        int y = json.get("y").getAsInt();
        
        if (robot != null) {
            robot.mouseMove(x, y);
        }
    }
    
    /**
     * Xử lý click chuột
     */
    private void handleMouseClick(JsonObject json) {
        String button = json.get("button").getAsString();
        boolean pressed = json.get("pressed").getAsBoolean();
        
        if (robot != null) {
            int buttonMask = 0;
            if ("left".equals(button)) {
                buttonMask = InputEvent.BUTTON1_DOWN_MASK;
            } else if ("right".equals(button)) {
                buttonMask = InputEvent.BUTTON3_DOWN_MASK;
            } else if ("middle".equals(button)) {
                buttonMask = InputEvent.BUTTON2_DOWN_MASK;
            }
            
            if (pressed) {
                robot.mousePress(buttonMask);
            } else {
                robot.mouseRelease(buttonMask);
            }
        }
    }
    
    /**
     * Xử lý scroll chuột
     */
    private void handleMouseScroll(JsonObject json) {
        int delta = json.get("delta").getAsInt();
        
        if (robot != null) {
            robot.mouseWheel(delta);
        }
    }
    
    /**
     * Xử lý nhấn phím
     */
    private void handleKeyPress(JsonObject json) {
        String key = json.get("key").getAsString();
        boolean pressed = json.get("pressed").getAsBoolean();
        
        if (robot != null) {
            try {
                int keyCode = getKeyCode(key);
                if (keyCode != -1) {
                    if (pressed) {
                        robot.keyPress(keyCode);
                    } else {
                        robot.keyRelease(keyCode);
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi xử lý phím: " + key);
            }
        }
    }
    
    /**
     * Chuyển đổi tên phím sang KeyEvent code
     */
    private int getKeyCode(String key) {
        // Chuyển đổi một số phím thường dùng
        switch (key.toLowerCase()) {
            case "enter": return KeyEvent.VK_ENTER;
            case "backspace": return KeyEvent.VK_BACK_SPACE;
            case "tab": return KeyEvent.VK_TAB;
            case "shift": return KeyEvent.VK_SHIFT;
            case "control": return KeyEvent.VK_CONTROL;
            case "alt": return KeyEvent.VK_ALT;
            case "escape": return KeyEvent.VK_ESCAPE;
            case "space": return KeyEvent.VK_SPACE;
            case "arrowup": return KeyEvent.VK_UP;
            case "arrowdown": return KeyEvent.VK_DOWN;
            case "arrowleft": return KeyEvent.VK_LEFT;
            case "arrowright": return KeyEvent.VK_RIGHT;
            default:
                // Nếu là ký tự đơn, chuyển đổi sang key code
                if (key.length() == 1) {
                    char ch = key.toUpperCase().charAt(0);
                    return ch;
                }
                return -1;
        }
    }
    
    /**
     * Xử lý WebRTC signaling message - Routing P2P đúng cách
     * Chuyển tiếp signal đến peer, không echo lại cho chính client
     */
    private void handleWebRTCSignal(JsonObject json) {
        String signalData = json.get("data").getAsString();
        
        // Nếu có peer, gửi signal đến peer
        if (peerId != null) {
            RemoteDesktopWebSocket peer = clients.get(peerId);
            if (peer != null && peer.session != null && peer.session.isOpen()) {
                JsonObject signal = new JsonObject();
                signal.addProperty("type", "webrtc-signal");
                signal.addProperty("data", signalData);
                signal.addProperty("from", clientId);
                peer.sendMessage(signal.toString());
                System.out.println("Đã chuyển tiếp WebRTC signal từ " + clientId + " đến " + peerId);
            } else {
                // Peer đã ngắt kết nối
                JsonObject error = new JsonObject();
                error.addProperty("type", "error");
                error.addProperty("message", "Peer không còn kết nối");
                sendMessage(error.toString());
                peerId = null;
            }
        } else {
            // Chưa có peer, thông báo lỗi
            JsonObject error = new JsonObject();
            error.addProperty("type", "error");
            error.addProperty("message", "Chưa kết nối với peer. Vui lòng chọn peer trước.");
            sendMessage(error.toString());
        }
    }
    
    /**
     * Xử lý kết nối với peer
     */
    private void handleConnectPeer(JsonObject json) {
        String targetPeerId = json.get("peerId").getAsString();
        
        // Kiểm tra peer có tồn tại không
        RemoteDesktopWebSocket targetPeer = clients.get(targetPeerId);
        if (targetPeer == null) {
            JsonObject error = new JsonObject();
            error.addProperty("type", "error");
            error.addProperty("message", "Peer không tồn tại: " + targetPeerId);
            sendMessage(error.toString());
            return;
        }
        
        // Kiểm tra peer có đang kết nối với client khác không
        if (targetPeer.getPeerId() != null && !targetPeer.getPeerId().equals(clientId)) {
            JsonObject error = new JsonObject();
            error.addProperty("type", "error");
            error.addProperty("message", "Peer đang bận với client khác");
            sendMessage(error.toString());
            return;
        }
        
        // Thiết lập kết nối P2P
        this.peerId = targetPeerId;
        targetPeer.setPeerId(clientId);
        
        // Thông báo cho cả 2 client
        JsonObject success1 = new JsonObject();
        success1.addProperty("type", "peer-connected");
        success1.addProperty("peerId", targetPeerId);
        success1.addProperty("message", "Đã kết nối với peer: " + targetPeerId);
        sendMessage(success1.toString());
        
        JsonObject success2 = new JsonObject();
        success2.addProperty("type", "peer-connected");
        success2.addProperty("peerId", clientId);
        success2.addProperty("message", "Đã kết nối với peer: " + clientId);
        targetPeer.sendMessage(success2.toString());
        
        System.out.println("Đã ghép cặp: " + clientId + " <-> " + targetPeerId);
    }
    
    /**
     * Xử lý ngắt kết nối với peer
     */
    private void handleDisconnectPeer() {
        if (peerId != null) {
            RemoteDesktopWebSocket peer = clients.get(peerId);
            if (peer != null) {
                peer.setPeerId(null);
                
                JsonObject notification = new JsonObject();
                notification.addProperty("type", "peer-disconnected");
                notification.addProperty("message", "Peer đã ngắt kết nối");
                peer.sendMessage(notification.toString());
            }
            peerId = null;
            
            JsonObject response = new JsonObject();
            response.addProperty("type", "peer-disconnected");
            response.addProperty("message", "Đã ngắt kết nối với peer");
            sendMessage(response.toString());
        }
    }
    
    /**
     * Gửi danh sách client (trừ chính nó)
     */
    private void sendClientList() {
        JsonObject response = new JsonObject();
        response.addProperty("type", "client-list");
        
        JsonObject clientsList = new JsonObject();
        for (String id : clients.keySet()) {
            if (!id.equals(clientId)) {
                RemoteDesktopWebSocket client = clients.get(id);
                JsonObject clientInfo = new JsonObject();
                clientInfo.addProperty("id", id);
                clientInfo.addProperty("hasPeer", client.getPeerId() != null);
                clientsList.add(id, clientInfo);
            }
        }
        response.add("clients", clientsList);
        
        sendMessage(response.toString());
    }
    
    /**
     * Gửi message đến client
     */
    private void sendMessage(String message) {
        if (session != null && session.isOpen()) {
            try {
                session.getRemote().sendString(message);
            } catch (IOException e) {
                System.err.println("Lỗi gửi message: " + e.getMessage());
            }
        }
    }
}

