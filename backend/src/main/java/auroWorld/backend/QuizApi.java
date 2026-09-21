package auroWorld.backend;

import com.google.gson.Gson;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.UploadedFile;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.Instant;
import java.time.Duration;
import java.util.*;

public final class QuizApi {
    private final Database db;
    private final Authenticator authenticator;
    private static final Gson JSON = new Gson();
    private static final int FILE_LIMIT = 10 * 1024 * 1024;
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private static final String AUTH_URL = System.getenv().getOrDefault("SUPABASE_URL", "https://rduempiojxizkwwbzaml.supabase.co");
    private static final String AUTH_KEY = System.getenv().getOrDefault("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo");
    private static final Map<String, String> TYPES = Map.ofEntries(
        Map.entry("pdf", "application/pdf"), Map.entry("png", "image/png"),
        Map.entry("jpg", "image/jpeg"), Map.entry("jpeg", "image/jpeg"), Map.entry("webp", "image/webp"),
        Map.entry("txt", "text/plain"), Map.entry("csv", "text/csv"),
        Map.entry("doc", "application/msword"), Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        Map.entry("ppt", "application/vnd.ms-powerpoint"), Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
        Map.entry("xls", "application/vnd.ms-excel"), Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    );

    public QuizApi(Database db) { this.db = db; this.authenticator = this::authenticate; }
    QuizApi(Database db, Authenticator authenticator) { this.db = db; this.authenticator = authenticator; }

    private Connection connection() throws SQLException {
        var conn = db.getConnection();
        conn.unwrap(org.postgresql.PGConnection.class).setPrepareThreshold(0);
        return conn;
    }

    public void register(Javalin app) throws Exception {
        try (var stream = QuizApi.class.getResourceAsStream("/quiz-schema.sql"); var conn = connection()) {
            if (stream == null) throw new IllegalStateException("Missing quiz schema");
            conn.setAutoCommit(false);
            try (var statement = conn.createStatement()) {
                for (String sql : new String(stream.readAllBytes(), StandardCharsets.UTF_8).split(";")) {
                    if (!sql.isBlank()) statement.execute(sql);
                }
                conn.commit();
            } catch (Exception e) { conn.rollback(); throw e; }
        }
        app.get("/quiz-api/units/{unitId}", ctx -> handle(ctx, (conn, user) -> {
            var unit = unit(conn, id(ctx, "unitId"));
            boolean manager = manage(user, unit);
            require(manager || enrolled(conn, user, unit), 403, "Enroll in this course to view quizzes.");
            var quizzes = rows(conn, "SELECT q.* FROM course_quizzes q WHERE unit_id=? AND (published OR ?) ORDER BY id", unit.get("unit_id"), manager);
            for (var quiz : quizzes) {
                quiz.remove("instructions");
                quiz.put("status", status(quiz, Instant.now()));
                quiz.put("submitted", !rows(conn, "SELECT id FROM quiz_submissions WHERE quiz_id=? AND user_id=? AND submitted_at IS NOT NULL LIMIT 1", quiz.get("id"), user.id).isEmpty());
            }
            return Map.of("quizzes", quizzes, "can_manage", manager);
        }));
        app.get("/quiz-api/calendar", ctx -> handle(ctx, (conn, user) -> rows(conn,
            "SELECT q.id, q.title, q.due_at, q.late_until, q.release_at, c.course_id, c.title AS course_title, u.title AS unit_title, " +
            "EXISTS(SELECT 1 FROM quiz_submissions s WHERE s.quiz_id=q.id AND s.user_id=? AND s.submitted_at IS NOT NULL) AS submitted " +
            "FROM course_quizzes q JOIN course_units u ON u.unit_id=q.unit_id JOIN courses c ON c.course_id=u.course_id " +
            "WHERE q.published AND EXISTS(SELECT 1 FROM enrollments e WHERE e.course_id=c.course_id AND e.unique_id::text=?) ORDER BY q.due_at", user.id, user.id)));
        app.get("/quiz-api/quizzes/{quizId}", ctx -> handle(ctx, (conn, user) -> {
            var quiz = quiz(conn, id(ctx, "quizId"), false);
            boolean manager = manage(user, quiz);
            require(manager || (bool(quiz, "published") && enrolled(conn, user, quiz)), 403, "This quiz is not available to you.");
            Instant now = Instant.now();
            boolean released = bool(quiz, "published") && time(quiz, "release_at") != null && !now.isBefore(time(quiz, "release_at"));
            quiz.put("can_manage", manager);
            quiz.put("can_submit", !manager && canSubmit(quiz, now));
            quiz.put("status", status(quiz, now));
            quiz.put("server_now", now.toString());
            quiz.put("files", manager || released ? files(conn, quiz.get("id"), null) : List.of());
            if (!manager && !released) quiz.remove("instructions");
            var submissions = rows(conn, "SELECT s.*, COALESCE(u.username, s.user_id) AS username FROM quiz_submissions s LEFT JOIN users u ON u.unique_id::text=s.user_id " +
                "WHERE s.quiz_id=? AND " + (manager ? "s.submitted_at IS NOT NULL" : "s.user_id=?") + " ORDER BY s.id DESC",
                manager ? new Object[]{quiz.get("id")} : new Object[]{quiz.get("id"), user.id});
            for (var submission : submissions) submission.put("files", files(conn, quiz.get("id"), submission.get("id")));
            quiz.put("submissions", submissions);
            return quiz;
        }));
        app.post("/quiz-api/units/{unitId}", ctx -> handle(ctx, (conn, user) -> saveQuiz(ctx, conn, user, true)));
        app.put("/quiz-api/quizzes/{quizId}", ctx -> handle(ctx, (conn, user) -> saveQuiz(ctx, conn, user, false)));
        app.post("/quiz-api/quizzes/{quizId}/answers", ctx -> handle(ctx, (conn, user) -> saveAnswer(ctx, conn, user)));
        app.get("/quiz-api/files/{fileId}", ctx -> handle(ctx, (conn, user) -> {
            var file = one(conn, "SELECT id,quiz_id,submission_id,filename,media_type FROM quiz_files WHERE id=?", id(ctx, "fileId"));
            var quiz = quiz(conn, ((Number) file.get("quiz_id")).longValue(), false);
            boolean manager = manage(user, quiz);
            if (file.get("submission_id") == null) {
                require(manager || (enrolled(conn, user, quiz) && bool(quiz, "published") && time(quiz, "release_at") != null && !Instant.now().isBefore(time(quiz, "release_at"))), 403, "Quiz files are not available yet.");
            } else {
                var answer = one(conn, "SELECT user_id,submitted_at FROM quiz_submissions WHERE id=?", file.get("submission_id"));
                require((manager && answer.get("submitted_at") != null) || (user.id.equals(answer.get("user_id")) && enrolled(conn, user, quiz)), 403, "You cannot access this answer.");
            }
            try (var ps = prepare(conn, "SELECT content FROM quiz_files WHERE id=?", file.get("id")); var rs = ps.executeQuery()) {
                rs.next();
                ctx.header("Cache-Control", "no-store").header("X-Content-Type-Options", "nosniff");
                ctx.header("Content-Disposition", "attachment; filename*=UTF-8''" + URLEncoder.encode((String) file.get("filename"), StandardCharsets.UTF_8).replace("+", "%20"));
                ctx.contentType((String) file.get("media_type")).result(rs.getBytes(1));
            }
            return null;
        }));
    }

    private Object saveQuiz(Context ctx, Connection conn, User user, boolean create) throws Exception {
        conn.setAutoCommit(false);
        var target = create ? unit(conn, id(ctx, "unitId")) : quiz(conn, id(ctx, "quizId"), true);
        require(manage(user, target), 403, "Only the course instructor or an administrator can edit quizzes.");
        var body = JSON.fromJson(ctx.formParam("metadata"), QuizForm.class);
        require(body != null && body.title != null && !body.title.isBlank() && body.title.length() <= 200, 400, "Enter a title (up to 200 characters).");
        require(body.instructions == null || body.instructions.length() <= 20000, 400, "Instructions are too long.");
        Instant release = parseTime(body.release_at), due = parseTime(body.due_at), late = parseTime(body.late_until);
        validateSchedule(body.published, release, due, late);
        if (!create && bool(target, "published")) {
            require(body.published, 400, "A published quiz cannot be moved back to draft.");
        }
        long quizId;
        if (create) {
            quizId = ((Number) one(conn, "INSERT INTO course_quizzes(unit_id,title,instructions,published,release_at,due_at,late_until) VALUES (?,?,?,?,?,?,?) RETURNING id",
                target.get("unit_id"), body.title.trim(), body.instructions == null ? "" : body.instructions, body.published, release, due, late).get("id")).longValue();
        } else {
            quizId = ((Number) target.get("id")).longValue();
            update(conn, "UPDATE course_quizzes SET title=?,instructions=?,published=?,release_at=?,due_at=?,late_until=?,updated_at=now() WHERE id=?",
                body.title.trim(), body.instructions == null ? "" : body.instructions, body.published, release, due, late, quizId);
        }
        replaceFiles(ctx, conn, quizId, null, body.keep_file_ids);
        require(!body.published || !files(conn, quizId, null).isEmpty(), 400, "Upload at least one question file before publishing.");
        conn.commit();
        return Map.of("id", quizId);
    }

    private Object saveAnswer(Context ctx, Connection conn, User user) throws Exception {
        conn.setAutoCommit(false);
        var quiz = quiz(conn, id(ctx, "quizId"), true);
        require(!manage(user, quiz) && enrolled(conn, user, quiz), 403, "Only enrolled students can submit answers.");
        require(canSubmit(quiz, Instant.now()), 403, "The submission window is closed or has not opened.");
        var form = JSON.fromJson(ctx.formParam("metadata"), AnswerForm.class);
        require(form != null, 400, "Missing submission details.");
        long quizId = ((Number) quiz.get("id")).longValue();
        var drafts = rows(conn, "SELECT id FROM quiz_submissions WHERE quiz_id=? AND user_id=? AND submitted_at IS NULL", quizId, user.id);
        long submissionId = ((Number) (drafts.isEmpty()
            ? one(conn, "INSERT INTO quiz_submissions(quiz_id,user_id) VALUES (?,?) RETURNING id", quizId, user.id)
            : drafts.get(0)).get("id")).longValue();
        replaceFiles(ctx, conn, quizId, submissionId, form.keep_file_ids);
        require(!files(conn, quizId, submissionId).isEmpty(), 400, "Upload at least one answer file.");
        Instant now = Instant.now();
        require(canSubmit(quiz, now), 403, "The submission window closed while uploading. Your submission was not accepted.");
        if (form.submit) update(conn, "UPDATE quiz_submissions SET submitted_at=?,late=? WHERE id=?", now, !now.isBefore(time(quiz, "due_at")), submissionId);
        conn.commit();
        return Map.of("id", submissionId, "submitted", form.submit);
    }

    private void replaceFiles(Context ctx, Connection conn, long quizId, Long submissionId, List<Long> keepIds) throws Exception {
        Set<Long> keep = new HashSet<>(keepIds == null ? List.of() : keepIds);
        var existing = files(conn, quizId, submissionId);
        Set<Long> owned = new HashSet<>();
        for (var file : existing) owned.add(((Number) file.get("id")).longValue());
        require(owned.containsAll(keep), 400, "Invalid attachment selection.");
        var uploads = ctx.uploadedFiles("files");
        require(keep.size() + uploads.size() <= 5, 400, "Use at most 5 files.");
        for (var file : existing) if (!keep.contains(((Number) file.get("id")).longValue())) update(conn, "DELETE FROM quiz_files WHERE id=?", file.get("id"));
        long total = 0;
        for (var file : existing) if (keep.contains(((Number) file.get("id")).longValue())) total += ((Number) file.get("size")).longValue();
        for (UploadedFile upload : uploads) {
            String name = upload.filename().replace('\\', '/');
            name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
            String extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
            require(TYPES.containsKey(extension) && name.length() <= 200, 400, "Unsupported file type or filename.");
            byte[] bytes;
            try (var stream = upload.content()) { bytes = stream.readNBytes(FILE_LIMIT + 1); }
            require(bytes.length > 0 && bytes.length <= FILE_LIMIT, 400, "Each file must be nonempty and no larger than 10 MB.");
            total += bytes.length;
            update(conn, "INSERT INTO quiz_files(quiz_id,submission_id,filename,media_type,content) VALUES (?,?,?,?,?)", quizId, submissionId, name, TYPES.get(extension), bytes);
        }
        require(total <= 30L * 1024 * 1024, 400, "Attachments must total no more than 30 MB.");
    }

    static void validateSchedule(boolean published, Instant release, Instant due, Instant late) {
        require(!published || (release != null && due != null), 400, "Select a release date and a due date before publishing.");
        require((release == null && due == null && late == null) || (release != null && due != null && due.isAfter(release) && (late == null || late.isAfter(due))), 400, "Release must be before due; late deadline must be after due.");
    }

    static boolean canSubmit(Map<String, Object> quiz, Instant now) {
        Instant release = time(quiz, "release_at"), due = time(quiz, "due_at"), late = time(quiz, "late_until");
        return bool(quiz, "published") && release != null && due != null && !now.isBefore(release) && now.isBefore(late == null ? due : late);
    }

    static String status(Map<String, Object> quiz, Instant now) {
        if (!bool(quiz, "published")) return "Draft";
        if (time(quiz, "release_at") == null || now.isBefore(time(quiz, "release_at"))) return "Scheduled";
        if (canSubmit(quiz, now)) return now.isBefore(time(quiz, "due_at")) ? "Open" : "Late submissions";
        return "Closed";
    }

    static boolean manage(User user, Map<String, Object> target) {
        return "admin".equals(user.role) || ("instructor".equals(user.role) && user.username != null && user.username.equals(target.get("instructor")));
    }

    private boolean enrolled(Connection conn, User user, Map<String, Object> target) throws SQLException {
        return !rows(conn, "SELECT 1 FROM enrollments WHERE course_id=? AND unique_id::text=?", target.get("course_id"), user.id).isEmpty();
    }

    private Map<String, Object> unit(Connection conn, long id) throws SQLException {
        return one(conn, "SELECT u.unit_id,u.course_id,c.instructor FROM course_units u JOIN courses c ON c.course_id=u.course_id WHERE u.unit_id=?", id);
    }

    private Map<String, Object> quiz(Connection conn, long id, boolean lock) throws SQLException {
        return one(conn, "SELECT q.*,u.course_id,u.title AS unit_title,c.title AS course_title,c.instructor FROM course_quizzes q JOIN course_units u ON u.unit_id=q.unit_id JOIN courses c ON c.course_id=u.course_id WHERE q.id=?" + (lock ? " FOR UPDATE OF q" : ""), id);
    }

    private List<Map<String, Object>> files(Connection conn, Object quizId, Object submissionId) throws SQLException {
        return rows(conn, "SELECT id,filename,media_type,octet_length(content) AS size FROM quiz_files WHERE quiz_id=? AND " +
            (submissionId == null ? "submission_id IS NULL" : "submission_id=?") + " ORDER BY id", submissionId == null ? new Object[]{quizId} : new Object[]{quizId, submissionId});
    }

    private User authenticate(Context ctx) throws Exception {
        String authorization = ctx.header("Authorization");
        require(authorization != null && authorization.startsWith("Bearer ") && authorization.length() < 16000, 401, "Please log in again.");
        var request = HttpRequest.newBuilder(URI.create(AUTH_URL + "/auth/v1/user")).timeout(Duration.ofSeconds(15))
            .header("apikey", AUTH_KEY).header("Authorization", authorization).GET().build();
        var response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        require(response.statusCode() == 200, 401, "Your session has expired. Please log in again.");
        var auth = JSON.fromJson(response.body(), AuthUser.class);
        require(auth != null && auth.id != null, 401, "Invalid session.");
        try (var conn = connection()) {
            var record = rows(conn, "SELECT username,role FROM users WHERE unique_id::text=?", auth.id);
            require(!record.isEmpty(), 403, "User profile not found.");
            return new User(auth.id, (String) record.get(0).get("username"), (String) record.get(0).get("role"));
        }
    }

    private void handle(Context ctx, Action action) {
        ctx.header("Cache-Control", "no-store");
        try {
            User user = authenticator.authenticate(ctx);
            try (var conn = connection()) {
                try {
                    Object result = action.run(conn, user);
                    if (result != null) ctx.contentType("application/json").result(JSON.toJson(new StructuredResponse("ok", null, result)));
                } catch (Exception e) {
                    if (!conn.getAutoCommit()) conn.rollback();
                    throw e;
                }
            }
        } catch (Fault e) { error(ctx, e.code, e.getMessage()); }
        catch (IllegalArgumentException | com.google.gson.JsonParseException | java.time.DateTimeException e) { error(ctx, 400, "Invalid quiz data."); }
        catch (Exception e) { System.err.println("Quiz request failed: " + e.getClass().getSimpleName()); error(ctx, 500, "Unable to complete the quiz request. Please try again."); }
    }

    private static void error(Context ctx, int code, String message) {
        ctx.status(code).contentType("application/json").result(JSON.toJson(new StructuredResponse("error", message, null)));
    }
    private static long id(Context ctx, String key) { return Long.parseLong(ctx.pathParam(key)); }
    private static boolean bool(Map<String, Object> row, String key) { return Boolean.TRUE.equals(row.get(key)); }
    private static Instant time(Map<String, Object> row, String key) { return parseTime((String) row.get(key)); }
    private static Instant parseTime(String value) { return value == null || value.isBlank() ? null : Instant.parse(value); }
    private static void require(boolean valid, int code, String message) { if (!valid) throw new Fault(code, message); }
    private static PreparedStatement prepare(Connection conn, String sql, Object... params) throws SQLException {
        var ps = conn.prepareStatement(sql);
        for (int i = 0; i < params.length; i++) {
            Object value = params[i];
            if (value instanceof Instant instant) ps.setTimestamp(i + 1, Timestamp.from(instant));
            else if (value instanceof byte[] bytes) ps.setBytes(i + 1, bytes);
            else ps.setObject(i + 1, value);
        }
        return ps;
    }
    private static void update(Connection conn, String sql, Object... params) throws SQLException {
        try (var ps = prepare(conn, sql, params)) { ps.executeUpdate(); }
    }
    private static List<Map<String, Object>> rows(Connection conn, String sql, Object... params) throws SQLException {
        try (var ps = prepare(conn, sql, params); var rs = ps.executeQuery()) {
            var result = new ArrayList<Map<String, Object>>();
            while (rs.next()) {
                var row = new LinkedHashMap<String, Object>();
                for (int i = 1; i <= rs.getMetaData().getColumnCount(); i++) {
                    Object value = rs.getObject(i);
                    row.put(rs.getMetaData().getColumnLabel(i), value instanceof Timestamp t ? t.toInstant().toString() : value);
                }
                result.add(row);
            }
            return result;
        }
    }
    private static Map<String, Object> one(Connection conn, String sql, Object... params) throws SQLException {
        var values = rows(conn, sql, params);
        require(!values.isEmpty(), 404, "Quiz, unit or file not found.");
        return values.get(0);
    }
    record User(String id, String username, String role) {}
    private record AuthUser(String id) {}
    private static class QuizForm {
        String title, instructions, release_at, due_at, late_until;
        boolean published;
        List<Long> keep_file_ids;
    }
    private static class AnswerForm { boolean submit; List<Long> keep_file_ids; }
    static class Fault extends RuntimeException {
        final int code;
        Fault(int code, String message) { super(message); this.code = code; }
    }
    private interface Action { Object run(Connection conn, User user) throws Exception; }
    interface Authenticator { User authenticate(Context ctx) throws Exception; }
}
