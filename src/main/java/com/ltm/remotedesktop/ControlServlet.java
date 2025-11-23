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
        if (key == null || key.isEmpty()) {
            return -1;
        }
        
        // Normalize key: lowercase để case-insensitive
        String normalizedKey = key.toLowerCase();
        
        // Xử lý ký tự đơn (A-Z, 0-9, và một số ký tự đặc biệt)
        if (key.length() == 1) {
            char c = Character.toUpperCase(key.charAt(0));
            
            // Chữ cái A-Z
            if (c >= 'A' && c <= 'Z') {
                return KeyEvent.VK_A + (c - 'A');
            }
            
            // Số 0-9
            if (c >= '0' && c <= '9') {
                return KeyEvent.VK_0 + (c - '0');
            }
            
            // Ký tự đặc biệt thường dùng
            switch (c) {
                case ' ': return KeyEvent.VK_SPACE;
                case '\n': case '\r': return KeyEvent.VK_ENTER;
                case '\t': return KeyEvent.VK_TAB;
                case '!': return KeyEvent.VK_1; // Shift + 1
                case '@': return KeyEvent.VK_2; // Shift + 2
                case '#': return KeyEvent.VK_3; // Shift + 3
                case '$': return KeyEvent.VK_4; // Shift + 4
                case '%': return KeyEvent.VK_5; // Shift + 5
                case '^': return KeyEvent.VK_6; // Shift + 6
                case '&': return KeyEvent.VK_7; // Shift + 7
                case '*': return KeyEvent.VK_8; // Shift + 8
                case '(': return KeyEvent.VK_9; // Shift + 9
                case ')': return KeyEvent.VK_0; // Shift + 0
                case '-': return KeyEvent.VK_MINUS;
                case '_': return KeyEvent.VK_UNDERSCORE;
                case '=': return KeyEvent.VK_EQUALS;
                case '+': return KeyEvent.VK_PLUS;
                case '[': return KeyEvent.VK_OPEN_BRACKET;
                case ']': return KeyEvent.VK_CLOSE_BRACKET;
                case '{': return KeyEvent.VK_OPEN_BRACKET; // Shift + [
                case '}': return KeyEvent.VK_CLOSE_BRACKET; // Shift + ]
                case '\\': return KeyEvent.VK_BACK_SLASH;
                case '|': return KeyEvent.VK_BACK_SLASH; // Shift + \
                case ';': return KeyEvent.VK_SEMICOLON;
                case ':': return KeyEvent.VK_COLON;
                case '\'': return KeyEvent.VK_QUOTE;
                case '"': return KeyEvent.VK_QUOTEDBL;
                case ',': return KeyEvent.VK_COMMA;
                case '<': return KeyEvent.VK_COMMA; // Shift + ,
                case '.': return KeyEvent.VK_PERIOD;
                case '>': return KeyEvent.VK_PERIOD; // Shift + .
                case '/': return KeyEvent.VK_SLASH;
                case '?': return KeyEvent.VK_SLASH; // Shift + /
                case '`': return KeyEvent.VK_BACK_QUOTE;
                case '~': return KeyEvent.VK_BACK_QUOTE; // Shift + `
            }
        }
        
        // Xử lý các phím đặc biệt (case-insensitive)
        switch (normalizedKey) {
            // Navigation keys
            case "enter": return KeyEvent.VK_ENTER;
            case "escape": case "esc": return KeyEvent.VK_ESCAPE;
            case "backspace": return KeyEvent.VK_BACK_SPACE;
            case "delete": case "del": return KeyEvent.VK_DELETE;
            case "tab": return KeyEvent.VK_TAB;
            case "space": return KeyEvent.VK_SPACE;
            
            // Arrow keys
            case "arrowup": case "up": return KeyEvent.VK_UP;
            case "arrowdown": case "down": return KeyEvent.VK_DOWN;
            case "arrowleft": case "left": return KeyEvent.VK_LEFT;
            case "arrowright": case "right": return KeyEvent.VK_RIGHT;
            
            // Function keys
            case "f1": return KeyEvent.VK_F1;
            case "f2": return KeyEvent.VK_F2;
            case "f3": return KeyEvent.VK_F3;
            case "f4": return KeyEvent.VK_F4;
            case "f5": return KeyEvent.VK_F5;
            case "f6": return KeyEvent.VK_F6;
            case "f7": return KeyEvent.VK_F7;
            case "f8": return KeyEvent.VK_F8;
            case "f9": return KeyEvent.VK_F9;
            case "f10": return KeyEvent.VK_F10;
            case "f11": return KeyEvent.VK_F11;
            case "f12": return KeyEvent.VK_F12;
            
            // Modifier keys
            case "shift": return KeyEvent.VK_SHIFT;
            case "control": case "ctrl": return KeyEvent.VK_CONTROL;
            case "alt": return KeyEvent.VK_ALT;
            case "meta": case "cmd": case "windows": return KeyEvent.VK_META;
            
            // Other special keys
            case "capslock": return KeyEvent.VK_CAPS_LOCK;
            case "numlock": return KeyEvent.VK_NUM_LOCK;
            case "scrolllock": return KeyEvent.VK_SCROLL_LOCK;
            case "insert": case "ins": return KeyEvent.VK_INSERT;
            case "home": return KeyEvent.VK_HOME;
            case "end": return KeyEvent.VK_END;
            case "pageup": case "page up": return KeyEvent.VK_PAGE_UP;
            case "pagedown": case "page down": return KeyEvent.VK_PAGE_DOWN;
            
            // Numpad keys (khi dùng event.code)
            case "numpad0": return KeyEvent.VK_NUMPAD0;
            case "numpad1": return KeyEvent.VK_NUMPAD1;
            case "numpad2": return KeyEvent.VK_NUMPAD2;
            case "numpad3": return KeyEvent.VK_NUMPAD3;
            case "numpad4": return KeyEvent.VK_NUMPAD4;
            case "numpad5": return KeyEvent.VK_NUMPAD5;
            case "numpad6": return KeyEvent.VK_NUMPAD6;
            case "numpad7": return KeyEvent.VK_NUMPAD7;
            case "numpad8": return KeyEvent.VK_NUMPAD8;
            case "numpad9": return KeyEvent.VK_NUMPAD9;
            case "numpadadd": case "numpad+": return KeyEvent.VK_ADD;
            case "numpadsubtract": case "numpad-": return KeyEvent.VK_SUBTRACT;
            case "numpadmultiply": case "numpad*": return KeyEvent.VK_MULTIPLY;
            case "numpaddivide": case "numpad/": return KeyEvent.VK_DIVIDE;
            case "numpadenter": return KeyEvent.VK_ENTER;
            case "numpaddecimal": case "numpad.": return KeyEvent.VK_DECIMAL;
            
            // Xử lý event.code format (từ client khi event.key là "unidentified")
            // Format: "KeyA", "Digit1", "Backspace", "Enter", v.v.
            default:
                // Thử xử lý format "KeyX" (ví dụ: "KeyA" -> 'A')
                if (normalizedKey.startsWith("key") && normalizedKey.length() == 4) {
                    char c = Character.toUpperCase(normalizedKey.charAt(3));
                    if (c >= 'A' && c <= 'Z') {
                        return KeyEvent.VK_A + (c - 'A');
                    }
                }
                
                // Thử xử lý format "DigitX" (ví dụ: "Digit1" -> '1')
                if (normalizedKey.startsWith("digit") && normalizedKey.length() == 6) {
                    char c = normalizedKey.charAt(5);
                    if (c >= '0' && c <= '9') {
                        return KeyEvent.VK_0 + (c - '0');
                    }
                }
                
                // Thử xử lý format "NumpadX"
                if (normalizedKey.startsWith("numpad") && normalizedKey.length() == 7) {
                    char c = normalizedKey.charAt(6);
                    if (c >= '0' && c <= '9') {
                        switch (c) {
                            case '0': return KeyEvent.VK_NUMPAD0;
                            case '1': return KeyEvent.VK_NUMPAD1;
                            case '2': return KeyEvent.VK_NUMPAD2;
                            case '3': return KeyEvent.VK_NUMPAD3;
                            case '4': return KeyEvent.VK_NUMPAD4;
                            case '5': return KeyEvent.VK_NUMPAD5;
                            case '6': return KeyEvent.VK_NUMPAD6;
                            case '7': return KeyEvent.VK_NUMPAD7;
                            case '8': return KeyEvent.VK_NUMPAD8;
                            case '9': return KeyEvent.VK_NUMPAD9;
                        }
                    }
                }
                
                // Log để debug
                System.out.println("Không map được key: " + key + " (normalized: " + normalizedKey + ")");
                return -1;
        }
    }
}

