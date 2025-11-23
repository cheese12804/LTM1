package com.ltm.remotedesktop;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.websocket.server.WebSocketUpgradeFilter;

/**
 * Server chính để khởi động Remote Desktop Server
 * Sử dụng WebSocket cho tín hiệu điều khiển và WebRTC signaling
 * 
 * Cách đổi cổng:
 * 1. Tham số dòng lệnh: java ServerMain 8082
 * 2. Biến môi trường: set PORT=8082 (Windows) hoặc export PORT=8082 (Linux/Mac)
 * 3. Mặc định: 8082 (nếu không chỉ định)
 */
public class ServerMain {
    
    private static final int DEFAULT_PORT = 8082;
    
    public static void main(String[] args) {
        int port = getPort(args);
        
        try {
            // Tạo HTTP Server - lắng nghe trên tất cả interface (0.0.0.0)
            // Cho phép kết nối từ máy khác trong mạng
            Server server = new Server();
            ServerConnector connector = new ServerConnector(server);
            connector.setPort(port);
            connector.setHost("0.0.0.0"); // Lắng nghe trên tất cả interface
            server.addConnector(connector);
            
            // Tạo Servlet Context để phục vụ các file tĩnh (HTML, JS, CSS)
            ServletContextHandler context = new ServletContextHandler(
                ServletContextHandler.SESSIONS
            );
            context.setContextPath("/");
            context.setResourceBase("src/main/webapp");
            
            // Thêm WebSocket Filter
            WebSocketUpgradeFilter filter = WebSocketUpgradeFilter.configureContext(context);
            filter.addMapping("/ws", new RemoteDesktopWebSocketCreator());
            
            // Thêm Servlet để phục vụ file tĩnh
            context.addServlet(new ServletHolder(new StaticFileServlet()), "/*");
            
            // Thêm ControlServlet để xử lý control commands
            context.addServlet(ControlServlet.class, "/api/control");
            
            server.setHandler(context);
            
            // Khởi động server
            server.start();
            // Lấy IP của máy để hiển thị
            String localIP = getLocalIP();
            
            System.out.println("========================================");
            System.out.println("Remote Desktop Server đã khởi động!");
            System.out.println("Port: " + port);
            System.out.println("Lắng nghe trên: 0.0.0.0 (tất cả interface)");
            System.out.println("");
            System.out.println("Truy cập từ máy này:");
            System.out.println("  http://localhost:" + port);
            if (localIP != null) {
                System.out.println("");
                System.out.println("Truy cập từ máy khác trong mạng:");
                System.out.println("  http://" + localIP + ":" + port);
            }
            System.out.println("");
            System.out.println("WebSocket: ws://[IP]:" + port + "/ws");
            System.out.println("========================================");
            
            // Chờ server chạy
            server.join();
            
        } catch (Exception e) {
            System.err.println("Lỗi khởi động server: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * Lấy port từ tham số dòng lệnh hoặc biến môi trường
     * @param args Tham số dòng lệnh
     * @return Port number
     */
    private static int getPort(String[] args) {
        // Kiểm tra tham số dòng lệnh
        if (args.length > 0) {
            try {
                int port = Integer.parseInt(args[0]);
                if (port > 0 && port < 65536) {
                    return port;
                } else {
                    System.err.println("Port không hợp lệ: " + port + ". Sử dụng port mặc định: " + DEFAULT_PORT);
                }
            } catch (NumberFormatException e) {
                System.err.println("Port không hợp lệ: " + args[0] + ". Sử dụng port mặc định: " + DEFAULT_PORT);
            }
        }
        
        // Kiểm tra biến môi trường
        String envPort = System.getenv("PORT");
        if (envPort != null) {
            try {
                int port = Integer.parseInt(envPort);
                if (port > 0 && port < 65536) {
                    return port;
                }
            } catch (NumberFormatException e) {
                System.err.println("Biến môi trường PORT không hợp lệ: " + envPort);
            }
        }
        
        // Sử dụng port mặc định
        return DEFAULT_PORT;
    }
    
    /**
     * Lấy địa chỉ IP local của máy
     * @return IP address hoặc null nếu không tìm thấy
     */
    private static String getLocalIP() {
        try {
            java.net.NetworkInterface networkInterface = java.util.Collections
                .list(java.net.NetworkInterface.getNetworkInterfaces())
                .stream()
                .filter(ni -> {
                    try {
                        return ni.isUp() && !ni.isLoopback();
                    } catch (Exception e) {
                        return false;
                    }
                })
                .findFirst()
                .orElse(null);
            
            if (networkInterface != null) {
                java.util.List<java.net.InetAddress> addresses = java.util.Collections.list(
                    networkInterface.getInetAddresses()
                );
                
                for (java.net.InetAddress addr : addresses) {
                    if (addr instanceof java.net.Inet4Address) {
                        return addr.getHostAddress();
                    }
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        return null;
    }
}

