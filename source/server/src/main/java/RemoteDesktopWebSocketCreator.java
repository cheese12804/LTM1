import org.eclipse.jetty.websocket.servlet.ServletUpgradeRequest;
import org.eclipse.jetty.websocket.servlet.ServletUpgradeResponse;
import org.eclipse.jetty.websocket.servlet.WebSocketCreator;

/**
 * Tạo WebSocket connection cho mỗi client kết nối
 */
public class RemoteDesktopWebSocketCreator implements WebSocketCreator {
    
    @Override
    public Object createWebSocket(ServletUpgradeRequest req, ServletUpgradeResponse resp) {
        return new RemoteDesktopWebSocket();
    }
}

