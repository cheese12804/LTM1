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
    private final String clientId;
    private String peerId;
    private static final ConcurrentHashMap<String, RemoteDesktopWebSocket> clients = new ConcurrentHashMap<>();
    private static int clientCounter = 0;

    public RemoteDesktopWebSocket() {
        this.clientId = "client_" + (++clientCounter) + "_" + System.currentTimeMillis();
        try {
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
        
        JsonObject response = new JsonObject();
        response.addProperty("type", "connected");
        response.addProperty("message", "Kết nối thành công!");
        response.addProperty("clientId", clientId);
        response.addProperty("totalClients", clients.size());
        sendMessage(response.toString());

        autoPairWithAvailablePeer();
        sendClientListToAll();
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
        sendClientListToAll();
    }
    
    @Override
    public void onWebSocketError(Throwable cause) {
        System.err.println("WebSocket Error: " + cause.getMessage());
        cause.printStackTrace();
    }
    
    @Override
    public void onWebSocketText(String message) {
        try {
            JsonObject json = JsonParser.parseString(message).getAsJsonObject();
            String type = json.get("type").getAsString();
            
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
    
    private void handleMouseMove(JsonObject json) {
        int x = json.get("x").getAsInt();
        int y = json.get("y").getAsInt();
        
        if (robot != null) {
            robot.mouseMove(x, y);
        }
    }
    
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
    
    private void handleMouseScroll(JsonObject json) {
        int delta = json.get("delta").getAsInt();
        
        if (robot != null) {
            robot.mouseWheel(delta);
        }
    }
    
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
                if (key.length() == 1) {
                    char ch = key.toUpperCase().charAt(0);
                    return ch;
                }
                return -1;
        }
    }
    
    private void handleWebRTCSignal(JsonObject json) {
        String signalData = json.get("data").getAsString();
        if (peerId != null) {
            RemoteDesktopWebSocket peer = clients.get(peerId);
            if (peer != null && peer.session != null && peer.session.isOpen()) {
                JsonObject signal = new JsonObject();
                signal.addProperty("type", "webrtc-signal");
                signal.addProperty("data", signalData);
                signal.addProperty("from", clientId);
                peer.sendMessage(signal.toString());
            } else {
                JsonObject error = new JsonObject();
                error.addProperty("type", "error");
                error.addProperty("message", "Peer không còn kết nối");
                sendMessage(error.toString());
                peerId = null;
            }
        } else {
            JsonObject error = new JsonObject();
            error.addProperty("type", "error");
            error.addProperty("message", "Chưa kết nối với peer. Vui lòng chọn peer trước.");
            sendMessage(error.toString());
        }
    }
    
    private void handleConnectPeer(JsonObject json) {
        String targetPeerId = json.get("peerId").getAsString();
        
        RemoteDesktopWebSocket targetPeer = clients.get(targetPeerId);
        if (targetPeer == null) {
            JsonObject error = new JsonObject();
            error.addProperty("type", "error");
            error.addProperty("message", "Peer không tồn tại: " + targetPeerId);
            sendMessage(error.toString());
            return;
        }
        
        if (targetPeer.getPeerId() != null && !targetPeer.getPeerId().equals(clientId)) {
            JsonObject error = new JsonObject();
            error.addProperty("type", "error");
            error.addProperty("message", "Peer đang bận với client khác");
            sendMessage(error.toString());
            return;
        }
        
        this.peerId = targetPeerId;
        targetPeer.setPeerId(clientId);

        JsonObject success1 = new JsonObject();
        success1.addProperty("type", "peer-connected");
        success1.addProperty("peerId", targetPeerId);
        success1.addProperty("message", "Đã kết nối với peer: " + targetPeerId);
        this.sendMessage(success1.toString());
        
        JsonObject success2 = new JsonObject();
        success2.addProperty("type", "peer-connected");
        success2.addProperty("peerId", clientId);
        success2.addProperty("message", "Đã kết nối với peer: " + clientId);
        targetPeer.sendMessage(success2.toString());
        sendClientListToAll();
    }
    
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
    
    private void autoPairWithAvailablePeer() {
        for (RemoteDesktopWebSocket otherClient : clients.values()) {
            if (!otherClient.clientId.equals(this.clientId) && otherClient.peerId == null && this.peerId == null) {
                this.peerId = otherClient.clientId;
                otherClient.peerId = this.clientId;
                JsonObject msg1 = new JsonObject();
                msg1.addProperty("type", "peer-connected");
                msg1.addProperty("peerId", otherClient.clientId);
                msg1.addProperty("message", "Đã kết nối với peer: " + otherClient.clientId);
                this.sendMessage(msg1.toString());
                
                JsonObject msg2 = new JsonObject();
                msg2.addProperty("type", "peer-connected");
                msg2.addProperty("peerId", this.clientId);
                msg2.addProperty("message", "Đã kết nối với peer: " + this.clientId);
                otherClient.sendMessage(msg2.toString());
                sendClientListToAll();
                return;
            }
        }
    }
    
    private void sendClientList() {
        JsonObject response = new JsonObject();
        response.addProperty("type", "client-list");
        response.add("clients", buildClientList(clientId));
        sendMessage(response.toString());
    }
    
    private void sendClientListToAll() {
        for (RemoteDesktopWebSocket client : clients.values()) {
            JsonObject response = new JsonObject();
            response.addProperty("type", "client-list");
            response.add("clients", buildClientList(client.clientId));
            client.sendMessage(response.toString());
        }
    }

    private JsonObject buildClientList(String excludeId) {
        JsonObject clientsList = new JsonObject();
        for (String id : clients.keySet()) {
            if (!id.equals(excludeId)) {
                RemoteDesktopWebSocket otherClient = clients.get(id);
                JsonObject clientInfo = new JsonObject();
                clientInfo.addProperty("id", id);
                boolean hasPeer = otherClient.getPeerId() != null;
                clientInfo.addProperty("hasPeer", hasPeer);
                if (hasPeer) {
                    clientInfo.addProperty("peerId", otherClient.getPeerId());
                }
                clientsList.add(id, clientInfo);
            }
        }
        return clientsList;
    }

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

