package auroWorld.backend;


import com.google.gson.Gson;
import io.javalin.Javalin;
import io.javalin.http.Context;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Backblaze B2 (S3-compatible) storage: multipart upload signing, download signing, delete. */
public final class B2Api {
    private static final Gson JSON = new Gson();
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private static final String BUCKET = System.getenv("B2_BUCKET");

    private final Database db;
    private final S3Client s3;
    private final S3Presigner presigner;

    private record Caller(String id, String username, String role) {
        boolean staff() { return "admin".equals(role) || "instructor".equals(role); }
    }
    private static final class Fault extends RuntimeException {
        final int code;
        Fault(int code, String message) { super(message); this.code = code; }
    }
    private interface Action { Object run(Caller user) throws Exception; }

    private static final class InitReq { String key; String contentType; }
    private static final class PartReq { String key; String uploadId; int partNumber; }
    private static final class PartDone { int partNumber; String etag; }
    private static final class CompleteReq { String key; String uploadId; List<PartDone> parts; }
    private static final class AbortReq { String key; String uploadId; }
    private static final class DeleteReq { List<String> keys; }

    public B2Api(Database db) {
        this.db = db;
        var creds = StaticCredentialsProvider.create(
            AwsBasicCredentials.create(System.getenv("B2_KEY_ID"), System.getenv("B2_APP_KEY")));
        URI endpoint = URI.create(System.getenv("B2_ENDPOINT"));
        Region region = Region.of(System.getenv("B2_REGION"));
        this.s3 = S3Client.builder().endpointOverride(endpoint).region(region)
            .credentialsProvider(creds).forcePathStyle(true).build();
        this.presigner = S3Presigner.builder().endpointOverride(endpoint).region(region)
            .credentialsProvider(creds)
            .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build()).build();
    }

    public void register(Javalin app) {
        // ---- upload (instructors/admins only) ----
        app.post("/b2/upload/init", ctx -> handle(ctx, user -> {
            requireStaff(user);
            var req = body(ctx, InitReq.class);
            checkKey(req.key);
            String type = (req.contentType == null || req.contentType.isBlank()) ? "application/octet-stream" : req.contentType;
            var res = s3.createMultipartUpload(CreateMultipartUploadRequest.builder()
                .bucket(BUCKET).key(req.key).contentType(type).build());
            return Map.of("uploadId", res.uploadId());
        }));

        app.post("/b2/upload/part-url", ctx -> handle(ctx, user -> {
            requireStaff(user);
            var req = body(ctx, PartReq.class);
            checkKey(req.key);
            if (req.uploadId == null || req.partNumber < 1 || req.partNumber > 10000) throw new Fault(400, "Bad part request");
            var part = UploadPartRequest.builder().bucket(BUCKET).key(req.key)
                .uploadId(req.uploadId).partNumber(req.partNumber).build();
            var url = presigner.presignUploadPart(UploadPartPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1)).uploadPartRequest(part).build()).url();
            return Map.of("url", url.toString());
        }));

        app.post("/b2/upload/complete", ctx -> handle(ctx, user -> {
            requireStaff(user);
            var req = body(ctx, CompleteReq.class);
            checkKey(req.key);
            if (req.uploadId == null || req.parts == null || req.parts.isEmpty()) throw new Fault(400, "Missing parts");
            List<CompletedPart> parts = new ArrayList<>();
            for (PartDone p : req.parts) parts.add(CompletedPart.builder().partNumber(p.partNumber).eTag(p.etag).build());
            parts.sort((a, b) -> Integer.compare(a.partNumber(), b.partNumber()));
            s3.completeMultipartUpload(CompleteMultipartUploadRequest.builder()
                .bucket(BUCKET).key(req.key).uploadId(req.uploadId)
                .multipartUpload(CompletedMultipartUpload.builder().parts(parts).build()).build());
            return Map.of("key", req.key);
        }));

        app.post("/b2/upload/abort", ctx -> handle(ctx, user -> {
            requireStaff(user);
            var req = body(ctx, AbortReq.class);
            checkKey(req.key);
            s3.abortMultipartUpload(AbortMultipartUploadRequest.builder()
                .bucket(BUCKET).key(req.key).uploadId(req.uploadId).build());
            return Map.of("aborted", true);
        }));

        // ---- playback: staff, or a user enrolled in the course ----
        app.get("/b2/download-url", ctx -> handle(ctx, user -> {
            String key = ctx.queryParam("key");
            checkKey(key);
            if (!user.staff() && !isEnrolled(user.id(), courseIdOf(key))) throw new Fault(403, "Enroll in this course to view its files.");
            var get = GetObjectRequest.builder().bucket(BUCKET).key(key).build();
            var url = presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(2)).getObjectRequest(get).build()).url();
            return Map.of("url", url.toString());
        }));

        // ---- delete ----
        app.post("/b2/delete", ctx -> handle(ctx, user -> {
            requireStaff(user);
            var req = body(ctx, DeleteReq.class);
            if (req.keys == null) throw new Fault(400, "Missing keys");
            for (String key : req.keys) {
                checkKey(key);
                s3.deleteObject(DeleteObjectRequest.builder().bucket(BUCKET).key(key).build());
            }
            return Map.of("deleted", req.keys.size());
        }));
    }

    // ---------- helpers ----------
    private static <T> T body(Context ctx, Class<T> type) {
        T value = JSON.fromJson(ctx.body(), type);
        if (value == null) throw new Fault(400, "Missing request body");
        return value;
    }

    private static void requireStaff(Caller user) {
        if (!user.staff()) throw new Fault(403, "Only instructors and admins can upload or delete files.");
    }

    /** Keys must look like course/<id>/... so nobody can touch other paths. */
    private static void checkKey(String key) {
        if (key == null || key.length() > 900 || !key.startsWith("course/") || key.contains("..") || courseIdOf(key) < 0)
            throw new Fault(400, "Invalid file key");
    }

    private static int courseIdOf(String key) {
        try { return Integer.parseInt(key.split("/")[1]); } catch (Exception e) { return -1; }
    }

    private boolean isEnrolled(String uuid, int courseId) {
        return courseId >= 0 && db.isEnrolled(courseId, uuid);
    }

    private Caller authenticate(Context ctx) throws Exception {
        String authorization = ctx.header("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ") || authorization.length() > 16000)
            throw new Fault(401, "Please log in again.");
        var request = HttpRequest.newBuilder(URI.create(QuizApi.AUTH_URL + "/auth/v1/user"))
            .timeout(Duration.ofSeconds(15)).header("apikey", QuizApi.AUTH_KEY)
            .header("Authorization", authorization).GET().build();
        var response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) throw new Fault(401, "Your session has expired. Please log in again.");
        String id = JSON.fromJson(response.body(), Map.class).get("id").toString();
        try (Connection conn = db.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT username, role FROM users WHERE unique_id::text = ?")) {
            ps.setString(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) throw new Fault(403, "User profile not found.");
                return new Caller(id, rs.getString("username"), rs.getString("role"));
            }
        }
    }

    private void handle(Context ctx, Action action) {
        ctx.header("Cache-Control", "no-store").contentType("application/json");
        try {
            Object result = action.run(authenticate(ctx));
            ctx.result(JSON.toJson(new StructuredResponse("ok", null, result)));
        } catch (Fault e) {
            ctx.status(e.code).result(JSON.toJson(new StructuredResponse("error", e.getMessage(), null)));
        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).result(JSON.toJson(new StructuredResponse("error", "Storage request failed. Please try again.", null)));
        }
    }
}