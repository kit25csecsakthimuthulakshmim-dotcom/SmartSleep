import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.awt.Desktop;
import java.io.*;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;

/**
 * SmartSleep Web Server - Intelligent Sleep Optimization & Circadian Platform
 * Pure Java HTTP Server with Embedded REST API and Static Asset Delivery.
 */
public class smartsleep {
    private static final int DEFAULT_PORT = 8080;
    private static final long START_TIME = System.currentTimeMillis();
    private static final Path WEB_ROOT = Paths.get(".").toAbsolutePath().normalize();

    // In-memory application state
    private static final Map<String, Object> environmentSettings = new ConcurrentHashMap<>();
    private static final List<Map<String, Object>> sleepJournal = new CopyOnWriteArrayList<>();

    static {
        // Initial smart bedroom IoT environment defaults
        environmentSettings.put("targetTempC", 19.0);
        environmentSettings.put("targetTempF", 66.2);
        environmentSettings.put("circadianLight", "sunset-amber");
        environmentSettings.put("lightBrightness", 25);
        environmentSettings.put("ambientSound", "delta-waves");
        environmentSettings.put("soundVolume", 40);
        environmentSettings.put("smartAlarmEnabled", true);
        environmentSettings.put("smartAlarmWindowMin", 30);
        environmentSettings.put("alarmTime", "07:00");

        // Seed some historical journal entries
        Map<String, Object> entry1 = new LinkedHashMap<>();
        entry1.put("id", "log-101");
        entry1.put("date", "Yesterday");
        entry1.put("durationHours", 7.8);
        entry1.put("score", 89);
        entry1.put("quality", "Excellent");
        entry1.put("notes", "Deep delta audio helped fall asleep within 10 minutes.");
        entry1.put("deepPct", 24);
        entry1.put("remPct", 23);
        entry1.put("lightPct", 48);
        entry1.put("awakePct", 5);
        sleepJournal.add(entry1);

        Map<String, Object> entry2 = new LinkedHashMap<>();
        entry2.put("id", "log-102");
        entry2.put("date", "2 days ago");
        entry2.put("durationHours", 7.2);
        entry2.put("score", 82);
        entry2.put("quality", "Good");
        entry2.put("notes", "Slight caffeine late afternoon, delayed sleep onset slightly.");
        entry2.put("deepPct", 19);
        entry2.put("remPct", 21);
        entry2.put("lightPct", 53);
        entry2.put("awakePct", 7);
        sleepJournal.add(entry2);
    }

    public static void main(String[] args) {
        int port = DEFAULT_PORT;
        if (args.length > 0) {
            try {
                port = Integer.parseInt(args[0]);
            } catch (NumberFormatException ignored) {}
        }

        HttpServer server = null;
        for (int p = port; p <= port + 10; p++) {
            try {
                server = HttpServer.create(new InetSocketAddress(p), 0);
                port = p;
                break;
            } catch (IOException e) {
                System.out.println("Port " + p + " is occupied, trying next...");
            }
        }

        if (server == null) {
            System.err.println("❌ Could not bind to any port near " + port);
            System.exit(1);
        }

        // Configure ThreadPool
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());

        // Register Handlers
        server.createContext("/api/status", new StatusHandler());
        server.createContext("/api/sleep-data", new SleepDataHandler());
        server.createContext("/api/trends", new TrendsHandler());
        server.createContext("/api/calculator", new CalculatorHandler());
        server.createContext("/api/environment", new EnvironmentHandler());
        server.createContext("/api/log-sleep", new LogSleepHandler());
        server.createContext("/api/insights", new InsightsHandler());
        server.createContext("/", new StaticFileHandler());

        server.start();

        printBanner(port);

        // Open browser automatically if supported
        openBrowser("http://localhost:" + port);

        // Shutdown hook
        HttpServer finalServer = server;
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\n[SmartSleep] Shutting down server gracefully...");
            finalServer.stop(1);
            System.out.println("[SmartSleep] Server stopped.");
        }));
    }

    private static void printBanner(int port) {
        System.out.println("==================================================================");
        System.out.println("   🌙  S M A R T S L E E P   W E B   P L A T F O R M  (Java 21)   ");
        System.out.println("==================================================================");
        System.out.println(" > Server Status    : ONLINE");
        System.out.println(" > Java Runtime     : " + System.getProperty("java.version") + " (" + System.getProperty("java.vendor") + ")");
        System.out.println(" > Local Web Address: http://localhost:" + port);
        System.out.println(" > REST API Root    : http://localhost:" + port + "/api/");
        System.out.println(" > Serving Directory: " + WEB_ROOT);
        System.out.println("------------------------------------------------------------------");
        System.out.println(" Press Ctrl+C in terminal to stop server.");
        System.out.println("==================================================================");
    }

    private static void openBrowser(String url) {
        new Thread(() -> {
            try {
                Thread.sleep(600);
                if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                    Desktop.getDesktop().browse(new URI(url));
                }
            } catch (Exception ignored) {
                // Desktop browse might not be supported in headless or some shells
            }
        }).start();
    }

    // =========================================================================
    // Static File Serving
    // =========================================================================
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/")) {
                path = "/index.html";
            }

            // Clean path to prevent directory traversal
            path = path.replace("..", "").replace("//", "/");
            Path targetFile = WEB_ROOT.resolve(path.substring(1)).normalize();

            if (!Files.exists(targetFile) || Files.isDirectory(targetFile)) {
                // Return 404 or index fallback
                if (path.endsWith(".html") || !path.contains(".")) {
                    targetFile = WEB_ROOT.resolve("index.html");
                }
            }

            if (Files.exists(targetFile) && !Files.isDirectory(targetFile)) {
                byte[] bytes = Files.readAllBytes(targetFile);
                String contentType = getContentType(targetFile.getFileName().toString());
                sendResponse(exchange, 200, contentType, bytes);
            } else {
                String notFound = "<h1>404 Not Found</h1><p>SmartSleep asset not found: " + path + "</p>";
                sendResponse(exchange, 404, "text/html; charset=utf-8", notFound.getBytes(StandardCharsets.UTF_8));
            }
        }
    }

    private static String getContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
        if (lower.endsWith(".css")) return "text/css; charset=utf-8";
        if (lower.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (lower.endsWith(".json")) return "application/json; charset=utf-8";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".ico")) return "image/x-icon";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        return "text/plain; charset=utf-8";
    }

    // =========================================================================
    // REST API Handlers
    // =========================================================================

    /** /api/status - Returns system diagnostics */
    static class StatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            long uptimeSec = (System.currentTimeMillis() - START_TIME) / 1000;
            String json = String.format(
                "{\"status\":\"active\",\"platform\":\"SmartSleep Java Backend\",\"version\":\"2.4.0\",\"uptimeSeconds\":%d,\"javaVersion\":\"%s\",\"sensorsSynced\":true,\"activeProfile\":\"Circadian Health & Recovery\"}",
                uptimeSec,
                System.getProperty("java.version")
            );
            sendResponse(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
        }
    }

    /** /api/sleep-data - Returns current session biometrics & hypnogram stages */
    static class SleepDataHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String json = """
            {
              "score": 88,
              "scoreGrade": "Optimal",
              "duration": "7h 48m",
              "durationMinutes": 468,
              "bedtime": "11:15 PM",
              "wakeTime": "07:03 AM",
              "efficiency": 94,
              "sleepLatencyMin": 11,
              "restfulness": "High",
              "biometrics": {
                "restingHeartRate": 54,
                "heartRateUnit": "bpm",
                "hrv": 68,
                "hrvUnit": "ms",
                "respiratoryRate": 13.8,
                "respiratoryUnit": "rpm",
                "spo2": 98.4,
                "spo2Unit": "%",
                "skinTempDeviation": -0.3,
                "skinTempUnit": "°C",
                "ambientNoise": 28,
                "ambientNoiseUnit": "dB"
              },
              "stages": {
                "deep": {"percent": 22, "minutes": 103, "color": "#818cf8"},
                "rem": {"percent": 25, "minutes": 117, "color": "#38bdf8"},
                "light": {"percent": 48, "minutes": 225, "color": "#34d399"},
                "awake": {"percent": 5, "minutes": 23, "color": "#f87171"}
              },
              "hypnogram": [
                {"time": "23:15", "stage": "awake"},
                {"time": "23:26", "stage": "light"},
                {"time": "23:50", "stage": "deep"},
                {"time": "00:40", "stage": "deep"},
                {"time": "01:05", "stage": "light"},
                {"time": "01:30", "stage": "rem"},
                {"time": "02:00", "stage": "light"},
                {"time": "02:35", "stage": "deep"},
                {"time": "03:20", "stage": "light"},
                {"time": "03:45", "stage": "rem"},
                {"time": "04:30", "stage": "light"},
                {"time": "05:10", "stage": "rem"},
                {"time": "06:00", "stage": "light"},
                {"time": "06:40", "stage": "rem"},
                {"time": "07:03", "stage": "awake"}
              ]
            }
            """;
            sendResponse(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
        }
    }

    /** /api/trends - Returns 7-day sleep scores and duration trends */
    static class TrendsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String json = """
            {
              "weeklyAverageScore": 85.4,
              "weeklyAverageDurationHours": 7.5,
              "sleepDebtHours": -0.4,
              "circadianConsistency": 92,
              "history": [
                {"day": "Mon", "score": 84, "hours": 7.3, "efficiency": 91},
                {"day": "Tue", "score": 88, "hours": 7.8, "efficiency": 94},
                {"day": "Wed", "score": 79, "hours": 6.8, "efficiency": 87},
                {"day": "Thu", "score": 86, "hours": 7.5, "efficiency": 93},
                {"day": "Fri", "score": 83, "hours": 7.1, "efficiency": 90},
                {"day": "Sat", "score": 90, "hours": 8.2, "efficiency": 96},
                {"day": "Sun", "score": 88, "hours": 7.8, "efficiency": 94}
              ]
            }
            """;
            sendResponse(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
        }
    }

    /** /api/calculator - 90-minute ultradian sleep cycle calculator */
    static class CalculatorHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String targetType = "wake"; // "wake" (user gives wake time -> get bedtimes) or "sleep" (user gives bedtime -> get wake times)
            String inputTimeStr = "07:00";

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                Map<String, String> params = parseJsonOrForm(body);
                if (params.containsKey("type")) targetType = params.get("type");
                if (params.containsKey("time")) inputTimeStr = params.get("time");
            } else {
                Map<String, String> q = parseQuery(exchange.getRequestURI().getQuery());
                if (q.containsKey("type")) targetType = q.get("type");
                if (q.containsKey("time")) inputTimeStr = q.get("time");
            }

            // Compute 90-minute sleep cycles with 14 minutes latency
            LocalTime baseTime;
            try {
                baseTime = LocalTime.parse(inputTimeStr);
            } catch (Exception e) {
                baseTime = LocalTime.of(7, 0);
            }

            StringBuilder sb = new StringBuilder();
            sb.append("{");
            sb.append("\"inputTime\":\"").append(baseTime.format(DateTimeFormatter.ofPattern("hh:mm a"))).append("\",");
            sb.append("\"calculationType\":\"").append(targetType).append("\",");
            sb.append("\"cycleLengthMinutes\":90,");
            sb.append("\"latencyMinutes\":14,");
            sb.append("\"cycles\":[");

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("hh:mm a");
            int[] cycleCounts = {6, 5, 4, 3}; // 9h, 7.5h, 6h, 4.5h

            for (int i = 0; i < cycleCounts.length; i++) {
                int count = cycleCounts[i];
                int totalMinutes = (count * 90) + 14;
                LocalTime calculated;
                if ("wake".equalsIgnoreCase(targetType)) {
                    // Bedtimes to wake up at baseTime
                    calculated = baseTime.minusMinutes(totalMinutes);
                } else {
                    // Wake times if sleeping at baseTime
                    calculated = baseTime.plusMinutes(totalMinutes);
                }

                String quality;
                String tag;
                if (count == 6) {
                    quality = "Optimal Recovery (9.0 hrs)";
                    tag = "Ultra Restorative";
                } else if (count == 5) {
                    quality = "Recommended (7.5 hrs)";
                    tag = "Target Healthy Cycle";
                } else if (count == 4) {
                    quality = "Adequate (6.0 hrs)";
                    tag = "Minimum Threshold";
                } else {
                    quality = "Power Reset (4.5 hrs)";
                    tag = "Short / Emergency";
                }

                sb.append(String.format(
                    "{\"cycles\":%d,\"time\":\"%s\",\"totalSleepHours\":%.1f,\"label\":\"%s\",\"tag\":\"%s\",\"isRecommended\":%b}",
                    count,
                    calculated.format(fmt),
                    (count * 90) / 60.0,
                    quality,
                    tag,
                    count == 5
                ));

                if (i < cycleCounts.length - 1) {
                    sb.append(",");
                }
            }

            sb.append("]}");
            sendResponse(exchange, 200, "application/json; charset=utf-8", sb.toString().getBytes(StandardCharsets.UTF_8));
        }
    }

    /** /api/environment - IoT smart bedroom simulation */
    static class EnvironmentHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                Map<String, String> params = parseJsonOrForm(body);

                if (params.containsKey("targetTempC")) {
                    try {
                        double c = Double.parseDouble(params.get("targetTempC"));
                        environmentSettings.put("targetTempC", c);
                        environmentSettings.put("targetTempF", Math.round((c * 9.0 / 5.0 + 32.0) * 10.0) / 10.0);
                    } catch (Exception ignored) {}
                }
                if (params.containsKey("circadianLight")) {
                    environmentSettings.put("circadianLight", params.get("circadianLight"));
                }
                if (params.containsKey("ambientSound")) {
                    environmentSettings.put("ambientSound", params.get("ambientSound"));
                }
                if (params.containsKey("soundVolume")) {
                    try {
                        environmentSettings.put("soundVolume", Integer.parseInt(params.get("soundVolume")));
                    } catch (Exception ignored) {}
                }
                if (params.containsKey("smartAlarmEnabled")) {
                    environmentSettings.put("smartAlarmEnabled", Boolean.parseBoolean(params.get("smartAlarmEnabled")));
                }
                if (params.containsKey("alarmTime")) {
                    environmentSettings.put("alarmTime", params.get("alarmTime"));
                }
            }

            StringBuilder sb = new StringBuilder("{");
            int idx = 0;
            for (Map.Entry<String, Object> entry : environmentSettings.entrySet()) {
                if (idx > 0) sb.append(",");
                sb.append("\"").append(entry.getKey()).append("\":");
                if (entry.getValue() instanceof Number || entry.getValue() instanceof Boolean) {
                    sb.append(entry.getValue());
                } else {
                    sb.append("\"").append(entry.getValue()).append("\"");
                }
                idx++;
            }
            sb.append("}");
            sendResponse(exchange, 200, "application/json; charset=utf-8", sb.toString().getBytes(StandardCharsets.UTF_8));
        }
    }

    /** /api/log-sleep - Record a custom sleep journal entry */
    static class LogSleepHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                String body = readRequestBody(exchange);
                Map<String, String> p = parseJsonOrForm(body);

                Map<String, Object> newEntry = new LinkedHashMap<>();
                newEntry.put("id", "log-" + System.currentTimeMillis());
                newEntry.put("date", p.getOrDefault("date", LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMM dd, yyyy"))));
                newEntry.put("durationHours", Double.parseDouble(p.getOrDefault("durationHours", "7.5")));
                newEntry.put("score", Integer.parseInt(p.getOrDefault("score", "85")));
                newEntry.put("quality", p.getOrDefault("quality", "Good"));
                newEntry.put("notes", p.getOrDefault("notes", "Logged from web client."));
                newEntry.put("deepPct", Integer.parseInt(p.getOrDefault("deepPct", "21")));
                newEntry.put("remPct", Integer.parseInt(p.getOrDefault("remPct", "23")));
                newEntry.put("lightPct", Integer.parseInt(p.getOrDefault("lightPct", "50")));
                newEntry.put("awakePct", Integer.parseInt(p.getOrDefault("awakePct", "6")));

                sleepJournal.add(0, newEntry);
            }

            // Return journal list
            StringBuilder sb = new StringBuilder("{\"success\":true,\"totalLogs\":").append(sleepJournal.size()).append(",\"logs\":[");
            for (int i = 0; i < sleepJournal.size(); i++) {
                Map<String, Object> item = sleepJournal.get(i);
                if (i > 0) sb.append(",");
                sb.append("{");
                int j = 0;
                for (Map.Entry<String, Object> entry : item.entrySet()) {
                    if (j > 0) sb.append(",");
                    sb.append("\"").append(entry.getKey()).append("\":");
                    if (entry.getValue() instanceof Number || entry.getValue() instanceof Boolean) {
                        sb.append(entry.getValue());
                    } else {
                        sb.append("\"").append(entry.getValue().toString().replace("\"", "\\\"")).append("\"");
                    }
                    j++;
                }
                sb.append("}");
            }
            sb.append("]}");
            sendResponse(exchange, 200, "application/json; charset=utf-8", sb.toString().getBytes(StandardCharsets.UTF_8));
        }
    }

    /** /api/insights - Dynamic AI sleep coaching and circadian recommendations */
    static class InsightsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String json = """
            {
              "circadianWindow": {
                "caffeineCutoff": "01:30 PM",
                "peakAlertness": "10:00 AM - 12:30 PM",
                "eveningWindDown": "09:30 PM",
                "melatoninOnset": "10:15 PM",
                "optimalSleepGate": "11:00 PM - 11:30 PM",
                "morningSunlight": "07:15 AM - 07:45 AM"
              },
              "tips": [
                {
                  "category": "Circadian Timing",
                  "badge": "High Impact",
                  "title": "Natural Light Synchronization",
                  "description": "View 10-15 minutes of outdoor morning sunlight within 30 minutes of waking to anchor your master clock (SCN) and set up evening melatonin release."
                },
                {
                  "category": "Thermal Regulation",
                  "badge": "Thermoregulatory",
                  "title": "Optimal Bedroom Temperature",
                  "description": "Your core body temperature needs to drop 1-2°F (0.5-1°C) to initiate deep slow-wave sleep. Keep room setting at 65-68°F (18-20°C)."
                },
                {
                  "category": "Sound Therapy",
                  "badge": "Neuro-Acoustic",
                  "title": "Binaural Delta Waves & Pink Noise",
                  "description": "Listening to 4Hz Delta frequency audio synchronizes cortical slow oscillations, increasing slow-wave Deep Sleep duration by up to 28%."
                },
                {
                  "category": "Metabolic Timing",
                  "badge": "Recovery",
                  "title": "Late Evening Digestive Rest",
                  "description": "Finish heavy meals 3 hours prior to bed to prevent nighttime resting heart rate elevation and maintain high Heart Rate Variability (HRV)."
                }
              ]
            }
            """;
            sendResponse(exchange, 200, "application/json; charset=utf-8", json.getBytes(StandardCharsets.UTF_8));
        }
    }

    // =========================================================================
    // Utilities
    // =========================================================================
    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static void sendResponse(HttpExchange exchange, int statusCode, String contentType, byte[] responseBytes) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(statusCode, responseBytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(responseBytes);
        }
    }

    private static String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            byte[] buf = new byte[1024];
            int r;
            while ((r = is.read(buf)) != -1) {
                bos.write(buf, 0, r);
            }
            return bos.toString(StandardCharsets.UTF_8);
        }
    }

    private static Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null || query.isBlank()) return map;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0) {
                String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                String val = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                map.put(key, val);
            }
        }
        return map;
    }

    private static Map<String, String> parseJsonOrForm(String body) {
        Map<String, String> result = new HashMap<>();
        if (body == null || body.isBlank()) return result;
        body = body.trim();

        if (body.startsWith("{") && body.endsWith("}")) {
            // Simple key-value JSON parsing for flat objects
            String inner = body.substring(1, body.length() - 1);
            String[] tokens = inner.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
            for (String token : tokens) {
                String[] kv = token.split(":(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                if (kv.length == 2) {
                    String k = kv[0].trim().replaceAll("^\"|\"$", "");
                    String v = kv[1].trim().replaceAll("^\"|\"$", "");
                    result.put(k, v);
                }
            }
        } else {
            result.putAll(parseQuery(body));
        }
        return result;
    }
}
