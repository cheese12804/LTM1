package com.ltm.remotedesktop;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.awt.*;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

/**
 * Agent local chạy trên máy HOST.
 * Lắng nghe http://127.0.0.1:PORT/api/control (mặc định port 9003)
 * Nhận JSON control và dùng Robot để điều khiển OS.
 * Có thể chỉ định port: java -jar remote-agent-1.0-SNAPSHOT.jar 9004
 */
public class ControlAgent {

    public static void main(String[] args) throws Exception {
        int port = 9003; // Port mặc định
        if (args.length > 0) {
            try {
                port = Integer.parseInt(args[0]);
            } catch (NumberFormatException e) {
                System.err.println("Invalid port number, using default: 9003");
            }
        }
        InetSocketAddress addr = new InetSocketAddress("127.0.0.1", port);
        HttpServer server = HttpServer.create(addr, 0);

        System.out.println("Remote Control Agent listening on http://127.0.0.1:" + port + "/api/control");

        server.createContext("/api/control", new ControlHandler());
        server.setExecutor(null);
        server.start();
    }

    // ================= Handler =================

    static class ControlHandler implements HttpHandler {

        private final ObjectMapper mapper = new ObjectMapper();
        private final Robot robot;
        private final int screenWidth;
        private final int screenHeight;

        ControlHandler() throws AWTException {
            this.robot = new Robot();
            Dimension dim = Toolkit.getDefaultToolkit().getScreenSize();
            this.screenWidth = dim.width;
            this.screenHeight = dim.height;
            System.out.println("Screen size: " + screenWidth + "x" + screenHeight);
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            
            // Xử lý preflight CORS
            if ("OPTIONS".equalsIgnoreCase(method)) {
                addCorsHeaders(exchange.getResponseHeaders());
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            
            if (!"POST".equalsIgnoreCase(method)) {
                sendPlain(exchange, 405, "Method Not Allowed");
                return;
            }

            try (InputStream is = exchange.getRequestBody()) {
                JsonNode root = mapper.readTree(is);
                String type = root.path("type").asText();

                switch (type) {
                    case "mouseMove":
                        handleMouseMove(root);
                        break;
                    case "mouseClick":
                        handleMouseClick(root);
                        break;
                    case "mouseScroll":
                        handleMouseScroll(root);
                        break;
                    case "keyPress":
                        handleKeyPress(root);
                        break;
                    default:
                        System.out.println("Unknown control type: " + type);
                }
            } catch (Exception e) {
                e.printStackTrace();
                sendPlain(exchange, 500, "Error: " + e.getMessage());
                return;
            }

            sendPlain(exchange, 200, "OK");
        }

        private void handleMouseMove(JsonNode node) {
            double x = node.path("x").asDouble();
            double y = node.path("y").asDouble();

            // Nếu x,y <= 1 coi như toạ độ chuẩn hoá, nhân với độ phân giải
            int sx, sy;
            if (x <= 1.0 && y <= 1.0) {
                sx = (int) Math.round(x * screenWidth);
                sy = (int) Math.round(y * screenHeight);
            } else {
                // Nếu đã là pixel thì dùng luôn
                sx = (int) Math.round(x);
                sy = (int) Math.round(y);
            }

            robot.mouseMove(sx, sy);
        }

        private void handleMouseClick(JsonNode node) {
            String button = node.path("button").asText("left");
            boolean pressed = node.path("pressed").asBoolean();

            int mask;
            switch (button) {
                case "right":
                    mask = InputEvent.BUTTON3_DOWN_MASK;
                    break;
                case "middle":
                    mask = InputEvent.BUTTON2_DOWN_MASK;
                    break;
                default:
                    mask = InputEvent.BUTTON1_DOWN_MASK;
            }

            if (pressed) {
                robot.mousePress(mask);
            } else {
                robot.mouseRelease(mask);
            }
        }

        private void handleMouseScroll(JsonNode node) {
            int delta = node.path("delta").asInt();
            robot.mouseWheel(delta);
        }

        private void handleKeyPress(JsonNode node) {
            String key = node.path("key").asText();
            boolean pressed = node.path("pressed").asBoolean();

            int keyCode = mapKeyToKeyCode(key);
            if (keyCode == -1) {
                System.out.println("Không map được key: " + key);
                return;
            }

            if (pressed) {
                robot.keyPress(keyCode);
            } else {
                robot.keyRelease(keyCode);
            }
        }

        private int mapKeyToKeyCode(String key) {
            if (key == null || key.isEmpty()) return -1;

            // Ký tự 1 chữ/số
            if (key.length() == 1) {
                char c = key.charAt(0);
                if (Character.isLetter(c)) {
                    c = Character.toUpperCase(c);
                    return KeyEvent.VK_A + (c - 'A');
                }
                if (Character.isDigit(c)) {
                    return KeyEvent.VK_0 + (c - '0');
                }
            }

            switch (key) {
                case "Enter": return KeyEvent.VK_ENTER;
                case "Escape": return KeyEvent.VK_ESCAPE;
                case "Backspace": return KeyEvent.VK_BACK_SPACE;
                case "Tab": return KeyEvent.VK_TAB;
                case "Space": return KeyEvent.VK_SPACE;
                case "ArrowUp": return KeyEvent.VK_UP;
                case "ArrowDown": return KeyEvent.VK_DOWN;
                case "ArrowLeft": return KeyEvent.VK_LEFT;
                case "ArrowRight": return KeyEvent.VK_RIGHT;
                case "Shift": return KeyEvent.VK_SHIFT;
                case "Control": return KeyEvent.VK_CONTROL;
                case "Alt": return KeyEvent.VK_ALT;
                default: return -1;
            }
        }

        private void addCorsHeaders(Headers headers) {
            headers.add("Access-Control-Allow-Origin", "*");
            headers.add("Access-Control-Allow-Methods", "POST, OPTIONS");
            headers.add("Access-Control-Allow-Headers", "Content-Type");
        }

        private void sendPlain(HttpExchange ex, int code, String text) throws IOException {
            byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
            Headers h = ex.getResponseHeaders();
            addCorsHeaders(h); // Thêm CORS headers cho mọi response
            h.set("Content-Type", "text/plain; charset=UTF-8");
            ex.sendResponseHeaders(code, bytes.length);
            try (OutputStream os = ex.getResponseBody()) {
                os.write(bytes);
            }
        }
    }
}

