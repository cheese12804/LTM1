package com.ltm.remotedesktop;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.awt.*;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;
import java.io.IOException;

public class ControlServlet extends HttpServlet {

    private final ObjectMapper mapper = new ObjectMapper();
    private Robot robot;

    @Override
    public void init() throws ServletException {
        super.init();
        try {
            robot = new Robot();
        } catch (AWTException e) {
            throw new ServletException("Không khởi tạo được Robot", e);
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        JsonNode root = mapper.readTree(req.getInputStream());
        String type = root.path("type").asText();

        try {
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
            resp.setStatus(HttpServletResponse.SC_OK);
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    private void handleMouseMove(JsonNode node) {
        int x = node.path("x").asInt();
        int y = node.path("y").asInt();
        // Ở đây x,y đang là toạ độ trong video, tạm thời map thẳng sang pixel màn hình
        robot.mouseMove(x, y);
    }

    private void handleMouseClick(JsonNode node) {
        String button = node.path("button").asText("left");
        boolean pressed = node.path("pressed").asBoolean();

        int btnMask;
        switch (button) {
            case "right":
                btnMask = InputEvent.BUTTON3_DOWN_MASK;
                break;
            case "middle":
                btnMask = InputEvent.BUTTON2_DOWN_MASK;
                break;
            default:
                btnMask = InputEvent.BUTTON1_DOWN_MASK;
        }

        if (pressed) {
            robot.mousePress(btnMask);
        } else {
            robot.mouseRelease(btnMask);
        }
    }

    private void handleMouseScroll(JsonNode node) {
        int delta = node.path("delta").asInt();
        // delta > 0: cuộn lên, delta < 0: cuộn xuống
        robot.mouseWheel(delta);
    }

    private void handleKeyPress(JsonNode node) {
        String key = node.path("key").asText();

        // Demo: chỉ handle phím chữ + số đơn giản
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
        // ví dụ simple
        if (key.length() == 1) {
            char c = Character.toUpperCase(key.charAt(0));
            if (c >= 'A' && c <= 'Z') {
                return KeyEvent.VK_A + (c - 'A');
            }
            if (c >= '0' && c <= '9') {
                return KeyEvent.VK_0 + (c - '0');
            }
        }

        switch (key) {
            case "Enter": return KeyEvent.VK_ENTER;
            case "Escape": return KeyEvent.VK_ESCAPE;
            case "Backspace": return KeyEvent.VK_BACK_SPACE;
            case "Tab": return KeyEvent.VK_TAB;
            case "Space":
            case " ": return KeyEvent.VK_SPACE;
            case "ArrowUp": return KeyEvent.VK_UP;
            case "ArrowDown": return KeyEvent.VK_DOWN;
            case "ArrowLeft": return KeyEvent.VK_LEFT;
            case "ArrowRight": return KeyEvent.VK_RIGHT;
            default: return -1;
        }
    }
}

