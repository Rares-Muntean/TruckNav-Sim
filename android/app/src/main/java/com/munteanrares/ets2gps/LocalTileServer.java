
package com.munteanrares.ets2gps;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import fi.iki.elonen.SimpleWebServer;
import fi.iki.elonen.NanoHTTPD.Response.IStatus;
import fi.iki.elonen.NanoHTTPD.Response.Status;


public class LocalTileServer extends SimpleWebServer {
    private static final String HOST = null;
    private static final int PORT = 8765;

    public LocalTileServer(File rootDir) {
        super(HOST, PORT, rootDir, false);
    }

    @Override public Response serve(IHTTPSession session) {
        if (session.getMethod() == Method.OPTIONS) {
            Response response = newFixedLengthResponse(Status.OK, MIME_PLAINTEXT, null);
            addCorsHeaders(response);
            return response;
        }

        Response response = super.serve(session);
        addCorsHeaders(response);
        return response;
    }

     private void addCorsHeaders(Response response) {
        response.addHeader("Access-Control-Allow-Origin", "*");
        response.addHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        response.addHeader("Access-Control-Allow-Headers", "Range, Accept-Ranges, Content-Range, Content-Type");
        response.addHeader("Access-Control-Expose-Headers", "Range, Accept-Ranges, Content-Range, Content-Length");
        response.addHeader("Access-Control-Allow-Private-Network", "true");
    }

     public static LocalTileServer startServer(File rootDir) {
        try {
            LocalTileServer server = new LocalTileServer(rootDir);
            server.start();
            android.util.Log.d("TruckNav", "Local Tile Server running at http://" + HOST + ":" + PORT);
            return server;
        } catch (IOException e) {
            android.util.Log.e("TruckNav", "Failed to start Local Tile Server", e);
            return null;
        }
    }
}