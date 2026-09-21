package auroWorld.backend;

import com.google.gson.*;
import io.javalin.Javalin;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import junit.framework.TestCase;

public class QuizIntegrationTest extends TestCase {
    private final Gson json = new Gson();
    private final HttpClient http = HttpClient.newHttpClient();
    private String root;

    public void testQuizLifecycleWithIsolatedDatabase() throws Exception {
        String uri = System.getenv("QUIZ_TEST_DATABASE_URI");
        if (uri == null) { System.out.println("QUIZ_TEST_DATABASE_URI not configured; integration test not run."); return; }
        String schema = "quiz_test_" + UUID.randomUUID().toString().replace("-", "");
        Javalin app = null;
        try (var admin = DriverManager.getConnection(uri)) {
            try {
                try (var sql = admin.createStatement()) {
                    sql.execute("CREATE SCHEMA " + schema);
                    sql.execute("SET search_path TO " + schema);
                    sql.execute("CREATE TABLE courses(course_id INTEGER PRIMARY KEY,title TEXT,instructor TEXT)");
                    sql.execute("CREATE TABLE course_units(unit_id INTEGER PRIMARY KEY,course_id INTEGER REFERENCES courses(course_id),title TEXT)");
                    sql.execute("CREATE TABLE users(unique_id TEXT,username TEXT,role TEXT)");
                    sql.execute("CREATE TABLE enrollments(course_id INTEGER,unique_id TEXT)");
                    sql.execute("INSERT INTO courses VALUES(1,'Test Course','teacher'),(2,'Other Course','other-teacher')");
                    sql.execute("INSERT INTO course_units VALUES(1,1,'Unit 1'),(2,2,'Unit 2')");
                    sql.execute("INSERT INTO users VALUES('teacher','teacher','instructor'),('other-teacher','other-teacher','instructor'),('student','student','user'),('student2','student2','user')");
                    sql.execute("INSERT INTO enrollments VALUES(1,'student'),(1,'student2')");
                }
                var db = Database.getDatabase(uri + "&currentSchema=" + schema);
                app = Javalin.create();
                new QuizApi(db, ctx -> {
                    String token = ctx.header("Authorization");
                    if (token == null) throw new QuizApi.Fault(401, "Login required");
                    String id = token.replace("Bearer ", "");
                    return new QuizApi.User(id, id, id.contains("teacher") ? "instructor" : "user");
                }).register(app);
                app.start(0);
                root = "http://localhost:" + app.port() + "/quiz-api";

                assertEquals(401, get("/calendar", null).statusCode());
                var draft = metadata(false, null, null, null, List.of());
                assertEquals(403, upload("POST", "/units/1", "student", draft, "question.txt").statusCode());
                assertEquals(403, upload("POST", "/units/1", "other-teacher", draft, "question.txt").statusCode());
                long id = data(upload("POST", "/units/1", "teacher", draft, "question.txt")).getAsJsonObject().get("id").getAsLong();
                String quizPath = "/quizzes/" + id;
                assertEquals(0, data(get("/units/1", "student")).getAsJsonObject().getAsJsonArray("quizzes").size());
                assertEquals(403, get(quizPath, "student").statusCode());
                var question = data(get(quizPath, "teacher")).getAsJsonObject().getAsJsonArray("files").get(0).getAsJsonObject();
                long questionId = question.get("id").getAsLong();
                Instant now = Instant.now();
                var scheduled = metadata(true, now.plusSeconds(3600), now.plusSeconds(7200), null, List.of(questionId));
                data(upload("PUT", quizPath, "teacher", scheduled, null));
                var hidden = data(get(quizPath, "student")).getAsJsonObject();
                assertFalse(hidden.has("instructions"));
                assertEquals(0, hidden.getAsJsonArray("files").size());
                assertFalse(hidden.get("can_submit").getAsBoolean());
                assertEquals(403, get("/files/" + questionId, "student").statusCode());
                assertEquals(200, get("/files/" + questionId, "teacher").statusCode());
                assertEquals(1, data(get("/calendar", "student")).getAsJsonArray().size());
                assertEquals(0, data(get("/calendar", "outsider")).getAsJsonArray().size());

                var opened = metadata(true, now.minusSeconds(3600), now.plusSeconds(3600), null, List.of(questionId));
                data(upload("PUT", quizPath, "teacher", opened, null));
                assertEquals(200, get("/files/" + questionId, "student").statusCode());
                assertEquals(403, get(quizPath, "outsider").statusCode());
                assertEquals(403, upload("POST", quizPath + "/answers", "teacher", Map.of("submit", true), "answer.txt").statusCode());
                data(upload("POST", quizPath + "/answers", "student", Map.of("submit", false), "answer.txt"));
                var answerDraft = data(get(quizPath, "student")).getAsJsonObject().getAsJsonArray("submissions").get(0).getAsJsonObject();
                long answerFile = answerDraft.getAsJsonArray("files").get(0).getAsJsonObject().get("id").getAsLong();
                assertEquals(0, data(get(quizPath, "teacher")).getAsJsonObject().getAsJsonArray("submissions").size());
                assertEquals(403, get("/files/" + answerFile, "student2").statusCode());
                assertEquals(403, get("/files/" + answerFile, "teacher").statusCode());
                assertEquals(200, get("/files/" + answerFile, "student").statusCode());
                data(upload("POST", quizPath + "/answers", "student", Map.of("submit", true, "keep_file_ids", List.of(answerFile)), null));
                assertEquals(200, get("/files/" + answerFile, "teacher").statusCode());
                assertFalse(data(get(quizPath, "student")).getAsJsonObject().getAsJsonArray("submissions").get(0).getAsJsonObject().get("late").getAsBoolean());
                data(upload("POST", quizPath + "/answers", "student", Map.of("submit", true), "revised.txt"));
                assertEquals(2, data(get(quizPath, "teacher")).getAsJsonObject().getAsJsonArray("submissions").size());
                assertTrue(data(get("/calendar", "student")).getAsJsonArray().get(0).getAsJsonObject().get("submitted").getAsBoolean());
                var late = metadata(true, now.minusSeconds(7200), now.minusSeconds(3600), now.plusSeconds(3600), List.of(questionId));
                data(upload("PUT", quizPath, "teacher", late, null));
                data(upload("POST", quizPath + "/answers", "student2", Map.of("submit", true), "late.txt"));
                assertTrue(data(get(quizPath, "student2")).getAsJsonObject().getAsJsonArray("submissions").get(0).getAsJsonObject().get("late").getAsBoolean());
                var closed = metadata(true, now.minusSeconds(7200), now.minusSeconds(3600), now.minusSeconds(1800), List.of(questionId));
                data(upload("PUT", quizPath, "teacher", closed, null));
                assertEquals(403, upload("POST", quizPath + "/answers", "student", Map.of("submit", true), "closed.txt").statusCode());
                assertEquals(400, upload("PUT", quizPath, "teacher", opened, "program.exe").statusCode());
                assertEquals("Closed", data(get(quizPath, "teacher")).getAsJsonObject().get("status").getAsString());
                assertEquals(1, data(get(quizPath, "teacher")).getAsJsonObject().getAsJsonArray("files").size());
                assertEquals(400, upload("POST", "/units/1", "teacher", metadata(true, now, now.minusSeconds(1), null, List.of()), "question.txt").statusCode());
                assertEquals(1, data(get("/units/1", "teacher")).getAsJsonObject().getAsJsonArray("quizzes").size());
                try (var sql = admin.createStatement(); var result = sql.executeQuery("SELECT relrowsecurity FROM pg_class WHERE oid='" + schema + ".quiz_files'::regclass")) {
                    assertTrue(result.next()); assertTrue(result.getBoolean(1));
                }
            } finally {
                if (app != null) app.stop();
                if (!schema.matches("quiz_test_[a-f0-9]{32}")) throw new IllegalStateException("Invalid test schema");
                try (var sql = admin.createStatement()) { sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE"); }
            }
        }
    }

    private Map<String, Object> metadata(boolean published, Instant release, Instant due, Instant late, List<Long> keep) {
        var map = new HashMap<String, Object>();
        map.put("title", "Integration quiz"); map.put("instructions", "Private questions"); map.put("published", published);
        map.put("release_at", release == null ? null : release.toString());
        map.put("due_at", due == null ? null : due.toString());
        map.put("late_until", late == null ? null : late.toString());
        map.put("keep_file_ids", keep);
        return map;
    }
    private HttpResponse<String> get(String path, String user) throws Exception {
        var request = HttpRequest.newBuilder(URI.create(root + path));
        if (user != null) request.header("Authorization", "Bearer " + user);
        return http.send(request.GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> upload(String method, String path, String user, Object metadata, String filename) throws Exception {
        String boundary = "QuizTestBoundary";
        String body = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"metadata\"\r\n\r\n" + json.toJson(metadata) + "\r\n";
        if (filename != null) body += "--" + boundary + "\r\nContent-Disposition: form-data; name=\"files\"; filename=\"" + filename + "\"\r\nContent-Type: text/plain\r\n\r\nExample answer\r\n";
        body += "--" + boundary + "--\r\n";
        var request = HttpRequest.newBuilder(URI.create(root + path)).header("Authorization", "Bearer " + user)
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .method(method, HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }
    private JsonElement data(HttpResponse<String> response) {
        assertEquals(response.body(), 200, response.statusCode());
        JsonObject body = JsonParser.parseString(response.body()).getAsJsonObject();
        assertEquals(response.body(), "ok", body.get("mStatus").getAsString());
        return body.get("mData");
    }
}
