package com.ltm.remotedesktop;

import org.eclipse.jetty.http.MimeTypes;
import org.eclipse.jetty.server.handler.ResourceHandler;
import org.eclipse.jetty.servlet.DefaultServlet;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Servlet để phục vụ các file tĩnh (HTML, JS, CSS)
 */
public class StaticFileServlet extends DefaultServlet {
    
    private final ResourceHandler resourceHandler;
    
    public StaticFileServlet() {
        resourceHandler = new ResourceHandler();
        resourceHandler.setResourceBase("src/main/webapp");
        resourceHandler.setDirectoriesListed(false);
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        String path = request.getPathInfo();
        if (path == null || path.equals("/")) {
            path = "/index.html";
        }
        
        // Set MIME type
        if (path.endsWith(".html")) {
            response.setContentType("text/html; charset=utf-8");
        } else if (path.endsWith(".js")) {
            response.setContentType("application/javascript; charset=utf-8");
        } else if (path.endsWith(".css")) {
            response.setContentType("text/css; charset=utf-8");
        }
        
        super.doGet(request, response);
    }
}

