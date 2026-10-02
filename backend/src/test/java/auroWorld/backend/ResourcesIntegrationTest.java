package auroWorld.backend;

import com.google.gson.*;
import io.javalin.Javalin;
import java.net.URI;
import java.net.http.*;
import java.sql.*;
import java.util.*;
import junit.framework.TestCase;

public class ResourcesIntegrationTest extends TestCase {
    private final Gson json = new Gson();
    private final HttpClient http = HttpClient.newHttpClient();
    private String root;

    public void testUnitsAndResources() throws Exception {
        String uri = System.getenv("QUIZ_TEST_DATABASE_URI");
        if (uri == null) { System.out.println("QUIZ_TEST_DATABASE_URI not configured; resources integration test not run."); return; }
        String schema = "resources_test_" + UUID.randomUUID().toString().replace("-", "");
        Javalin app = null;
        try (var admin = DriverManager.getConnection(uri)) {
            try {
                try (var sql = admin.createStatement()) {
                    sql.execute("CREATE SCHEMA " + schema);
                    sql.execute("SET search_path TO " + schema);
                    sql.execute("CREATE TABLE courses(course_id SERIAL PRIMARY KEY,title TEXT,description TEXT,instructor TEXT,times TEXT,start_date TEXT,level TEXT,price TEXT,live_url TEXT,days_of_week TEXT)");
                    sql.execute("CREATE TABLE course_units(unit_id SERIAL PRIMARY KEY,course_id INTEGER REFERENCES courses(course_id) ON DELETE CASCADE,title TEXT,sort_order INTEGER)");
                    sql.execute("CREATE TABLE enrollments(course_id INTEGER,unique_id TEXT)");
                }
                var db = Database.getDatabase(uri + "&currentSchema=" + schema + "&prepareThreshold=0");
                int courseId = createCourse(db, 3);
                assertTrue(courseId > 0);
                long unitId = 0;
                try (var sql = admin.createStatement(); var rows = sql.executeQuery("SELECT unit_id,title,sort_order FROM course_units WHERE course_id=" + courseId + " ORDER BY sort_order")) {
                    for (int i = 1; i <= 3; i++) {
                        assertTrue(rows.next()); assertEquals("Unit " + i, rows.getString("title")); assertEquals(i, rows.getInt("sort_order"));
                        if (i == 1) unitId = rows.getLong("unit_id");
                    }
                    assertFalse(rows.next());
                }
                assertTrue(createCourse(db, 0) > 0);
                assertTrue(createCourse(db, 50) > 0);
                assertEquals(-1, createCourse(db, -1));
                assertEquals(-1, createCourse(db, 51));
                try (var sql = admin.createStatement()) {
                    sql.execute("ALTER TABLE course_units ADD CONSTRAINT reject_new_units CHECK (sort_order <> 2) NOT VALID");
                }
                assertEquals(-1, createCourse(db, 3));
                try (var sql = admin.createStatement()) {
                    try (var rows = sql.executeQuery("SELECT count(*) FROM courses")) { rows.next(); assertEquals(3, rows.getInt(1)); }
                    try (var rows = sql.executeQuery("SELECT count(*) FROM course_units")) { rows.next(); assertEquals(53, rows.getInt(1)); }
                    sql.execute("ALTER TABLE course_units DROP CONSTRAINT reject_new_units");
                    sql.execute("INSERT INTO enrollments VALUES(" + courseId + ",'student')");
                }
                app = Javalin.create();
                new QuizApi(db, ctx -> {
                    String header = ctx.header("Authorization");
                    if (header == null) throw new QuizApi.Fault(401, "Login required");
                    String user = header.replace("Bearer ", "");
                    return new QuizApi.User(user, user, user.equals("admin") ? "admin" : user.contains("teacher") ? "instructor" : "user");
                }).register(app);
                app.start(0); root = "http://localhost:" + app.port() + "/quiz-api";
                String path = "/units/" + unitId + "/resources";
                var form = Map.of("title", "Video lesson", "url", "https://www.youtube.com/watch?v=example", "description", "Watch before class");
                assertEquals(401, request("GET", path, null, null).statusCode());
                assertEquals(403, request("GET", path, "outsider", null).statusCode());
                assertEquals(403, request("POST", path, "student", form).statusCode());
                assertEquals(403, request("POST", path, "other-teacher", form).statusCode());
                long id = data(request("POST", path, "teacher", form)).get("id").getAsLong();
                var listing = data(request("GET", path, "student", null));
                assertFalse(listing.get("can_manage").getAsBoolean());
                assertEquals(1, listing.getAsJsonArray("resources").size());
                assertEquals(form.get("url"), listing.getAsJsonArray("resources").get(0).getAsJsonObject().get("url").getAsString());
                String resourcePath = "/resources/" + id;
                assertEquals(403, request("PUT", resourcePath, "student", form).statusCode());
                assertEquals(403, request("DELETE", resourcePath, "student", null).statusCode());
                assertEquals(403, request("PUT", resourcePath, "other-teacher", form).statusCode());
                for (String url : List.of("javascript:alert(1)", "data:text/html,test", "https://", "file:///test.pdf", "https://user:password@example.com/file")) {
                    assertEquals(400, request("POST", path, "teacher", Map.of("title", "Unsafe", "url", url)).statusCode());
                }
                assertEquals(400, request("PUT", resourcePath, "teacher", Map.of("title", " ", "url", "https://example.com")).statusCode());
                data(request("PUT", resourcePath, "teacher", Map.of("title", "Reading", "url", "https://example.com/reading.pdf", "description", "Read chapter one")));
                assertEquals("Reading", data(request("GET", path, "student", null)).getAsJsonArray("resources").get(0).getAsJsonObject().get("title").getAsString());
                data(request("DELETE", resourcePath, "admin", null));
                assertEquals(0, data(request("GET", path, "student", null)).getAsJsonArray("resources").size());
                assertEquals(404, request("PUT", resourcePath, "teacher", form).statusCode());
                data(request("POST", path, "teacher", form));
                try (var sql = admin.createStatement()) {
                    sql.execute("DELETE FROM course_units WHERE unit_id=" + unitId);
                    try (var rows = sql.executeQuery("SELECT count(*) FROM unit_resources")) { rows.next(); assertEquals(0, rows.getInt(1)); }
                    try (var rows = sql.executeQuery("SELECT relrowsecurity FROM pg_class WHERE oid='" + schema + ".unit_resources'::regclass")) { rows.next(); assertTrue(rows.getBoolean(1)); }
                }
            } finally {
                if (app != null) app.stop();
                if (!schema.matches("resources_test_[a-f0-9]{32}")) throw new IllegalStateException("Invalid test schema");
                try (var sql = admin.createStatement()) { sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE"); }
            }
        }
    }
    private int createCourse(Database db, int count) {
        return db.createCourse("Test Course", "Description", "teacher", "12:00 PM - 1:00 PM", "2026-10-01", "Beginner", "Free", "https://example.com", "1", count);
    }
    private HttpResponse<String> request(String method, String path, String user, Object body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create(root + path)).header("Content-Type", "application/json");
        if (user != null) builder.header("Authorization", "Bearer " + user);
        return http.send(builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.toJson(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
    private JsonObject data(HttpResponse<String> response) {
        assertEquals(response.body(), 200, response.statusCode());
        var body = JsonParser.parseString(response.body()).getAsJsonObject();
        assertEquals("ok", body.get("mStatus").getAsString());
        return body.getAsJsonObject("mData");
    }
}
