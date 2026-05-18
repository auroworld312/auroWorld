package auroWorld.backend;

/**
 * Hello world!
 *
 */
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.UploadedFile;
import io.javalin.http.staticfiles.Location;
import java.io.IOException;

import com.google.gson.Gson;

//DATABASE_URI="jdbc:postgresql://aws-0-us-west-2.pooler.supabase.com:6543/postgres?user=postgres.rduempiojxizkwwbzaml&password=[YOURPASSWORD]&sslmode=require" mvn exec:java
public class App 
{
    //google_client_id is the id for the google oauth from the google cloud project
    private static final Gson gson = new Gson();
    private static final String GOOGLE_CLIENT_ID=
    "134970251770-d7nviqn0qn0p0qpll7ru770kf2ntqu1h.apps.googleusercontent.com";

    //class for pulling information from google account
    private static final class SessionData {
        // final String userId;
        final String email;
        final String firstName;
        final String lastName;
        final boolean isAdmin;   // you can wire this via env if you like

        SessionData(String email, String firstName, String lastName, boolean isAdmin) {
            // this.userId = userId;
            this.email = email;
            this.firstName = firstName;
            this.lastName = lastName;
            this.isAdmin = isAdmin;
        }
    }
    //class for pulling together session data objects 
    private static final class SessionManager {
        private static final Map<String, SessionData> SESSIONS = new ConcurrentHashMap<>();

        static String create(SessionData data) {
            String token = UUID.randomUUID().toString();
            SESSIONS.put(token, data);
            return token;
        }

        static SessionData get(String token) {
            return SESSIONS.get(token);
        }
    }
    private static final class GoogleAccountRequest{
        public String username;
        public String email;
        public String user_uuid;
        public String firstname;
        public String lastname;
    }
    private static final class CreateAccountRequest{
        public String username;
        public String email;
        public String user_uuid;
    }
    public static final class LoginRequest {
        public String idToken;
    }
    private static final class EnrollRequest {
      public String user_uuid;
    }
    private static final class CheckVideoRequest {
        public String videoFilepath;
        public String fileTitle;
    }
    //class for grabbing infromation from google account you use to sign in 
    private static final class GoogleTokenInfo {
        public String aud;
        public String iss;
        public String email;
        public String hd;
        public String sub;
        public String given_name;
        public String family_name;
        public String email_verified;
    }
    private static final class CreateFileRequest{
        public String user_uuid;
        public String filename;
        public int msgId;
    }
    private static final class ChangeFileRequest{
        public String filename;
    }
    private static final class CreateVoteRequest{
        public String user_uuid;
    }
    private static final class CommentVoteRequest{
        public String user_uuid;
    }
    private static final class DeleteMessageRequest{
        public String userUuid;
    }
    //body class for creating a new post/message
    private static final class CreateMessageRequest {
        public String user_uuid;
        public String subject;
        public String message;
    }   

    //class for pulling comment body data from frontend
    private static final class CreateCommentRequest {
        public String user_uuid;
        public String comment;
    }
    //class for updating message
    private static final class CreateUpdateRequest{
        public String subject;
        public String message;
    }
    private static final class ChangeCommentRequest{
        public String comment;
    }

    private static final class CreateCourseRequest{
        public String title;
        public String description;
        public String instructor;
        public String times;
        public String startDate;
        public String level;
        public String price;
        public String live_url;
    }
    private static final class ChangeCourseRequest{
        public String title;
        public String description;
        public String instructor;
        public String startDate;
        public String level;
        public String price;
    }
    private static final class CreateUnitRequest{
        public String unitName;
    }
    private static final class AddUnitMaterial{
        public String filepath;
        public String title;
    }
    private static final class ChangeRoleRequest{
        public String username;
        public String role;
        public String unique_id;
    }
    //function for getting session token from window
    private static SessionData requireSession(Context ctx) {
        String token = ctx.header("X-Session-Token");
        if (token == null) {
            ctx.status(401);
            ctx.contentType("application/json");
            ctx.result(gson.toJson(new StructuredResponse(
                    "error", "missing session token", null)));
            return null;
        }
        SessionData s = SessionManager.get(token);
        if (s == null) {
            ctx.status(401);
            ctx.contentType("application/json");
            ctx.result(gson.toJson(new StructuredResponse(
                    "error", "invalid session", null)));
            return null;
        }
        return s;
    }
    //function for checking if you have a valid token
    private static GoogleTokenInfo verifyGoogleIdToken(String idToken) {
        System.out.println("verifyGoogleIdToken: starting HTTP call");
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken))
                .GET()
                .build();
        try {
            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
            System.out.println("verifyGoogleIdToken: HTTP status = " + resp.statusCode());
            if (resp.statusCode() != 200) {
                return null;
            }
            GoogleTokenInfo info = gson.fromJson(resp.body(), GoogleTokenInfo.class);
            if (info == null) return null;

            if (!GOOGLE_CLIENT_ID.equals(info.aud)) {
                System.out.println("verifyGoogleIdToken: aud mismatch: " + info.aud);
                return null;
            }
            // if (info.hd == null || !ALLOWED_DOMAIN.equalsIgnoreCase(info.hd)) {
            //     System.out.println("verifyGoogleIdToken: hd mismatch: " + info.hd);
            //     return null;
            // }
            return info;
        } catch (IOException | InterruptedException e) {
            System.out.println("verifyGoogleIdToken ERROR: " + e);
            e.printStackTrace();
            return null;
        }
    }

    public static void main(String[] args) throws Exception{
        main_uses_database(args);
    }
    public static void main_uses_database( String[] args ) throws Exception{
        Database db = Database.getDatabase();
        if (db == null) {
            System.err.println("Failed to connect to DB, exiting.");
            return;
        }
        Javalin app = Javalin.create(config -> {
            config.requestLogger.http((ctx, ms) -> {
                System.out.printf("%s%n", "=".repeat(42));
                System.out.printf(
                        "%s\t%s\t%s%nfull url: %s%n",
                        ctx.scheme(), ctx.method().name(), ctx.path(), ctx.fullUrl()
                );
            });

            config.staticFiles.add(files -> {
                files.hostedPath = "/";
                String override = System.getenv("STATIC_LOCATION");
                if (override == null) {
                    files.directory = "/public";
                    files.location  = Location.CLASSPATH;
                } else {
                    files.directory = override;
                    files.location  = Location.EXTERNAL;
                }
            });
            config.bundledPlugins.enableCors(cors -> {
                cors.addRule(it -> {
                    it.anyHost();
                    // it.allowMethod(io.javalin.http.HttpMethod.POST);
                });
            });
        });

        app.post("/newuser",ctx->{
            ctx.status(200);
            ctx.contentType("application/json");
            //System.out.println("ctx body for creating account  : "+ctx.body());

            CreateAccountRequest car = gson.fromJson(ctx.body(),CreateAccountRequest.class);

            if(car==null || car.email == null || car.username==null || car.user_uuid==null){
                System.out.println(car);
                System.out.println(car.email);
                System.out.println(car.username);
                System.out.println(car.user_uuid);
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missing username or email", null)));
                return;
            }

            int outcome = db.insertNewAccount(car.username,car.email, car.user_uuid,null,null);

            if(outcome<0){
                ctx.result(gson.toJson(new StructuredResponse("adding to user table failed",null,outcome)));
            }
            else{
                ctx.result(gson.toJson(new StructuredResponse("ok",null,outcome)));
            }
        });

        app.post("/profile_attributes", ctx->{
            ctx.status(200);
            ctx.contentType("application/json");
            System.out.println("ctx bdoy : "+ctx.body());

            CreateAccountRequest car = gson.fromJson(ctx.body(),CreateAccountRequest.class);
            if(car==null || car.email == null || car.username==null || car.user_uuid==null){
                System.out.println(car);
                System.out.println(car.email);
                System.out.println(car.username);
                System.out.println(car.user_uuid);
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missing username or email", null)));
                return;
            }
            int  result = db.insertNewProfile(car.username,car.email,car.user_uuid);

            if(result==0){
                ctx.result(gson.toJson(new StructuredResponse("adding to profile table failed",null,result)));
            }
            else{
                ctx.result(gson.toJson(new StructuredResponse("ok",null,result)));
            }
        });

        app.get("/username/{uuid}", ctx->{
            ctx.status(200);
            ctx.contentType("application/json");
            System.out.println("ctx body for finding username from uuid : "+ctx.body());

            String user_uuid=ctx.pathParam("uuid");
            System.out.println("ABout to check which username is to that uuid");

            String username=db.grabUsernameFromUuid(user_uuid);
            System.out.println(username);
            if(username==null){
                ctx.result(gson.toJson(new StructuredResponse("cant find corresponding username",null,null)));
            }
            else{
                ctx.result(gson.toJson(new StructuredResponse("ok",null,username)));
            }
        });

        app.get("/user_username/{username}",ctx->{
            ctx.status(200);
            ctx.contentType("application/json");
            System.out.println("ctx body for checking username : "+ctx.body());

            String username=ctx.pathParam("username");

            System.out.println("ABout to check if username already registered");

            //boolean result = db.usernameExists(cur.username);
            boolean result=db.usernameExists(username);

            System.out.println(result);

            if(result==true){
                ctx.result(gson.toJson(new StructuredResponse("account with "+username+" already exists",null,result)));
            }
            else{
                ctx.result(gson.toJson(new StructuredResponse("ok",null,result)));
            }
            
        });

        app.get("/user_email/{email}",ctx->{
            ctx.status(200);
            ctx.contentType("application/json");
            System.out.println("ctx body for checking email : "+ctx.body());

            String email=ctx.pathParam("email");

            System.out.println("ABout to check if email already registered");

            //boolean result = db.emailExists(cer.email);
            boolean result=db.emailExists(email);

            System.out.println(result);

            if(result==true){
                ctx.result(gson.toJson(new StructuredResponse("account with "+email+" already exists",null,result)));
            }
            else{
                ctx.result(gson.toJson(new StructuredResponse("ok",null,result)));
            }
            
        });

        app.post("/auth/newuser", ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            System.out.println("ctx body: "+ctx.body());

            GoogleAccountRequest gar = gson.fromJson(ctx.body(),GoogleAccountRequest.class);

            if(gar==null || gar.username==null || gar.email==null || gar.lastname==null 
                || gar.firstname==null || gar.user_uuid==null ){
                System.out.println(gar);
                System.out.println(gar.username);
                System.out.println(gar.email);
                System.out.println(gar.lastname);
                System.out.println(gar.firstname);
                System.out.println(gar.user_uuid);
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missing username or email", null)));
                return;
            }

            int result = db.insertNewAccount(gar.username,gar.email,gar.user_uuid,gar.lastname,gar.firstname);

            if(result==0){
                ctx.result(gson.toJson(new StructuredResponse("adding to user table failed",null,result)));
            }
            else{
                ctx.result(gson.toJson(new StructuredResponse("ok",null,result)));
            }
        });

        app.get("/users/{userId}/messages", ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            String userid=ctx.pathParam("userId");

            ArrayList<Database.MessageData> my_msgs = db.selectUserMessages(userid);

            StructuredResponse resp = new StructuredResponse(
                    "ok",
                    null,
                    my_msgs
            );

            ctx.result(gson.toJson(resp));

        });

        app.get("/messages", ctx ->{
            ctx.status(200);
            ctx.contentType("application/json");

            ArrayList<Database.MessageData> msgs = db.selectAllMessages();

            StructuredResponse resp = new StructuredResponse(
                "ok",
                null,
                msgs
            );

            ctx.result(gson.toJson(resp));
        });

        app.delete("delete/message/{msg_id}",ctx ->{
            SessionData session = requireSession(ctx);

            ctx.contentType("application/json");

            int msgId = Integer.parseInt(ctx.pathParam("msg_id"));

            DeleteMessageRequest dmr = gson.fromJson(ctx.body(), DeleteMessageRequest.class);

            if (dmr==null || dmr.userUuid ==null){
                ctx.status(400);
                ctx.result(gson.toJson(new StructuredResponse("error","missing message attribute",null)));
                return;
            }
            String filepath = db.getMessageFilepath(msgId);
            System.out.println(filepath);

            int result = db.deleteMessageAndComments(msgId);
            System.out.println(result);

            if(result==-1){
                ctx.status(500);
                ctx.result(gson.toJson(new StructuredResponse("error", "failed to delete message", null)));
            }
            else{
                ctx.result(gson.toJson(new StructuredResponse("ok","deleted message and files and commetns",filepath)));
            }
            return;
        });

        app.post("/messages", ctx -> {
            SessionData session = requireSession(ctx);
            // // if (session == null) return;   // requireSession already sends error JSON
            // String userId = cache.get(ctx.header("X-Session-Token")).toString();
            // if(userId==null){
            //     return;
            // }

            ctx.contentType("application/json");

            CreateMessageRequest req = gson.fromJson(ctx.body(), CreateMessageRequest.class);

            if (req == null || req.user_uuid ==null || req.subject == null || req.message == null ||
                req.subject.trim().isEmpty() || req.message.trim().isEmpty()) {
                ctx.status(400);
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missing subject or message or uuid", null)));
                return;
            }
            System.out.println("user_uuid="+req.user_uuid);
            int newId = db.insertMessage(req.user_uuid, req.subject.trim(), req.message.trim());

            // int newId = db.insertMessage(session.userId, req.subject.trim(), req.message.trim());

            if (newId < 0) {
                ctx.status(500);
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "failed to create message", null)));
                return;
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("msgId", newId);

            ctx.status(201);
            ctx.result(gson.toJson(new StructuredResponse("ok", null, payload)));
        });

        app.post("/files", ctx->{
            SessionData session = requireSession(ctx);

            ctx.contentType("application/json");

            CreateFileRequest req = gson.fromJson(ctx.body(),CreateFileRequest.class);

            System.out.println("CreateFileRequest req= "+req.filename+" "+req.msgId);

            if(req==null || req.user_uuid ==null ||req.filename==null || req.filename.trim().isEmpty() || req.msgId==0){
                ctx.status(400);
                ctx.result(gson.toJson(new StructuredResponse(
                    "error","missing filename",null)));
                return;
            }

            int newId=db.insertFileToTable(req.user_uuid,req.filename.trim(),req.msgId,"posts/"+req.msgId+"/"+req.filename.trim());

            if(newId<0){
                ctx.status(500);
                ctx.result(gson.toJson(new StructuredResponse("error","failed to upload file",null)));
                return;
            }

            Map<String, Object> payload = new HashMap<>();
            payload.put("file_id",newId);
            
            ctx.status(201);
            ctx.result(gson.toJson(new StructuredResponse("ok",null,payload)));

        });

        app.get("/file/{msg_id}",ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            int msg_id=Integer.parseInt(ctx.pathParam("msg_id"));

            System.out.println(msg_id);

            String filename=db.grabFilename(msg_id);

            if(filename==null){
                ctx.result(gson.toJson(new StructuredResponse("no filename entry for that message",null,null)));
            }
            else{
                ctx.result(gson.toJson(new StructuredResponse("ok",null,filename)));
            }
        });

        app.get("/files/mymessages/{user_uuid}", ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            String user_uuid = ctx.pathParam("user_uuid");

            ArrayList<Database.FileData> files = db.grabMyFilenames(user_uuid);

            StructuredResponse resp = new StructuredResponse(
                    "ok",
                    null,
                    files
            );

            ctx.result(gson.toJson(resp));
        });

        // app.put("/file/{msg_id}",ctx->{
        //     ctx.status(200);
        //     ctx.contentType("application/json");

        //     int msg_id=Integer.parseInt(ctx.pathParam("msg_id"));
        //     System.out.println(msg_id);

        //     ChangeFileRequest cfr = gson.fromJson(ctx.body(),ChangeFileRequest.class);
        //     if(cfr==null || cfr.filename==null || cfr.filename.trim().isEmpty()){
        //         ctx.status(400);
        //         ctx.result(gson.toJson(new StructuredResponse(
        //             "error","missing filepath",null)));
        //         return;
        //     }

        //     int success = db.editFileInTable(msg_id,cfr.filename);
        // });

        app.post("/messages/{id}/comments", ctx -> {
            // // Require login
            SessionData session = requireSession(ctx);
            // // if (session == null) return;   // requireSession already sends error JSON
            // if (session == null) return;

            ctx.contentType("application/json");

            int msgId = Integer.parseInt(ctx.pathParam("id"));
            System.out.println("MESSAGE ID:"+msgId);
            CreateCommentRequest req = gson.fromJson(ctx.body(), CreateCommentRequest.class);

            if (req == null || req.user_uuid==null ||req.comment == null || req.comment.trim().isEmpty()) {
                ctx.status(400);
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missing comment", null)));
                return;
            }

            // int newId = db.insertComment(msgId, session.userId, req.comment.trim());
            int newId = db.insertComment(msgId, req.user_uuid, req.comment.trim());
            
            if (newId < 0) {
                ctx.status(500);
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "failed to create comment", null)));
                return;
            }

            // Map<String, Object> payload = new HashMap<>();
            // payload.put("commentId", newId);

            ctx.status(201);
            ctx.result(gson.toJson(new StructuredResponse("ok", null, newId)));
        });

        app.get("/likedcomments/{uuid}",ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            String uuid = ctx.pathParam("uuid");

            ArrayList<Integer> likedComments = db.getLikedComments(uuid);

            ctx.result(gson.toJson(new StructuredResponse("ok",null,likedComments)));
        });

        app.get("/likedmessages/{uuid}",ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            String uuid = ctx.pathParam("uuid");

            ArrayList<Integer> likedPosts = db.getLikedPosts(uuid);

            ctx.result(gson.toJson(new StructuredResponse("ok",null,likedPosts)));
        });

        app.put("/vote_messages/{msg_id}", ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            CreateVoteRequest cvr = gson.fromJson(ctx.body(),CreateVoteRequest.class);

            if (cvr==null || cvr.user_uuid ==null){
                ctx.status(400);
                System.out.println("cvr:" +cvr);
                System.out.println("cvr useruuid: "+cvr.user_uuid);
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missing uuid to do upvote for post", null)));
                return;
            }

            int msgId= Integer.parseInt(ctx.pathParam("msg_id"));
            
            int result = db.voteMessageTable(msgId, cvr.user_uuid, 1);

            StructuredResponse resp = (result == -1)
                    ? new StructuredResponse("error", "vote failed", null)
                    : new StructuredResponse("ok", "vote succeeded", result);
            
            ctx.result(gson.toJson(resp));
        });

        app.put("/vote_comments/comment/{comment_id}/msg/{msg_id}", ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            CommentVoteRequest cvr = gson.fromJson(ctx.body(),CommentVoteRequest.class);

            if (cvr==null || cvr.user_uuid ==null){
                ctx.status(400);
                System.out.println("cvr:" +cvr);
                System.out.println("cvr useruuid: "+cvr.user_uuid);
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missing uuid to do upvote for post", null)));
                return;
            }

            int comment_id= Integer.parseInt(ctx.pathParam("comment_id"));
            int msgId = Integer.parseInt(ctx.pathParam("msg_id"));
            
            int result = db.voteCommentTable(comment_id, cvr.user_uuid, 1, msgId);

            StructuredResponse resp = (result == -1)
                    ? new StructuredResponse("error", "comment vote failed", null)
                    : new StructuredResponse("ok", "comment vote successful", result);
            
            ctx.result(gson.toJson(resp));
        });

        app.get("/messages/{msg_id}", ctx -> {
            // // Require login
            // SessionData session = requireSession(ctx);
            // // if (session == null) return;   // requireSession already sends error JSON
            // String userId = cache.get(ctx.header("X-Session-Token")).toString();
            // if(userId==null){
            //     return;
            // }

            ctx.status(200);
            ctx.contentType("application/json");

            int msgId = Integer.parseInt(ctx.pathParam("msg_id"));
            //String cacheKey = "message_" + msgId;

            //String cached = (String)cache.get(cacheKey);


            Database.MessageData msg = db.selectMessage(msgId);

            StructuredResponse resp = (msg == null)
                    ? new StructuredResponse("error", "Message not found", null)
                    : new StructuredResponse("ok", null, msg);

            String json = gson.toJson(resp);

            // if (msg != null) {
            //     cache.set(cacheKey, 3600, json);
            // }

            ctx.result(json);
        });

        app.put("/messages/{id}",ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            int msgId=Integer.parseInt(ctx.pathParam("id"));

            CreateUpdateRequest cur = gson.fromJson(ctx.body(), CreateUpdateRequest.class);

            if (cur == null || cur.subject ==null || cur.message == null) {
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missing message subject or message", null)));
                return;
            }

            int result = db.updatePost(msgId, cur.subject, cur.message);

            StructuredResponse resp = (result == -1 || result == 0)
                    ? new StructuredResponse("error", "post update failed", null)
                    : new StructuredResponse("ok", null, "updated");

            ctx.result(gson.toJson(resp));
        });

        app.put("put/comment/{comid}", ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            int comId=Integer.parseInt(ctx.pathParam("comid"));

            ChangeCommentRequest ccr = gson.fromJson(ctx.body(),ChangeCommentRequest.class);

            if(ccr==null || ccr.comment==null){
                ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missing comment", null)));
                return;
            }
            int result = db.updateComment(comId,ccr.comment);

            StructuredResponse resp = (result == -1 || result == 0)
                    ? new StructuredResponse("error", "comment update failed", null)
                    : new StructuredResponse("ok", null, "updated");

            ctx.result(gson.toJson(resp));
        });

        app.delete("delete/comment/{comid}",ctx->{
            ctx.status(200);
            ctx.contentType("application/json");

            int comId=Integer.parseInt(ctx.pathParam("comid"));

            int result = db.deleteComment(comId);

            StructuredResponse resp = (result == -1 || result == 0)
                    ? new StructuredResponse("error", "comment delete failed", null)
                    : new StructuredResponse("ok", "commetn deleted", null);

            ctx.result(gson.toJson(resp));
        });


        app.get("/messages/{id}/comments", ctx -> {
            ctx.status(200);
            ctx.contentType("application/json");

            // SessionData session = requireSession(ctx);
            // // if (session == null) return;   // requireSession already sends error JSON
            // String userId = cache.get(ctx.header("X-Session-Token")).toString();
            // if(userId==null){
            //     return;
            // }

            int msgId = Integer.parseInt(ctx.pathParam("id"));

            // String cacheKey="messages_"+msgId+"_comments";
            // String cachedJson = (String) cache.get(cacheKey);

            // if (cachedJson != null) {
            //     System.out.println("CACHE HIT: messages-"+msgId+"-comments");
            //     ctx.result(cachedJson);
            //     return;
            // }

            ArrayList<Database.CommentData> comments = db.selectComments(msgId);

            StructuredResponse resp = new StructuredResponse("ok", null, comments);

            String json = gson.toJson(resp);
            // cache.set(cacheKey, 30, json);
            ctx.result(json);

            ctx.result(gson.toJson(resp));
        });

        app.get("/profile/{userId}", ctx -> {
            ctx.status(200);
            ctx.contentType("application/json");

            // you could require auth here; we'll do it to line up with "app use requires auth"
            //SessionData session = requireSession(ctx);
            // if (session == null) return;   // requireSession already sends error JSON
            //String userId = cache.get(ctx.header("X-Session-Token")).toString();
            // if(userId==null){
            //     return;
            // }

            String targetId = ctx.pathParam("userId");

            System.out.println("targetId = "+targetId);

            Database.ProfilePublicData profile = db.selectPublicProfile(targetId);

            System.out.println("profile: "+profile);

            StructuredResponse resp = (profile == null)
                    ? new StructuredResponse("error", "profile not found", null)
                    : new StructuredResponse("ok", null, profile);
            
            String json = gson.toJson(resp);
            //cache.set(cacheKey, 300, json);

            ctx.result(gson.toJson(resp));
        });

    // private static final class CreateCourseRequest{
    //     public String title;
    //     public String description;
    //     public String instructor;

    // }
    app.put("/change/role", ctx->{
        ctx.status(200);
        ctx.contentType("application/json");

        ChangeRoleRequest crr = gson.fromJson(ctx.body(), ChangeRoleRequest.class);

        if(crr==null || crr.username==null || crr.role==null || crr.unique_id==null){
            System.out.println(crr);
            System.out.println(crr.username);
            System.out.println(crr.role);
            System.out.println(crr.unique_id);
            ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missgin userrole feature", null)));
                return;
        }
        System.out.println(crr);
        System.out.println(crr.username);
        System.out.println(crr.role);
        System.out.println(crr.unique_id);

        int id = db.changeUserRole(crr.username, crr.role,crr.unique_id);

        StructuredResponse resp = new StructuredResponse("ok",null,null);
        ctx.result(gson.toJson(resp));
    });

    app.get("/userdata/{uuid}",ctx->{
        ctx.status(200);
        ctx.contentType("application/json");

        String uuid = ctx.pathParam("uuid");
        System.out.println(uuid);

        Database.UserData user = db.getUserAttributes(uuid);

        System.out.println("user: "+user);

        StructuredResponse resp = new StructuredResponse("ok",null,user);
        ctx.result(gson.toJson(resp));
    });

    app.get("/all/instructors",ctx->{
        ctx.status(200);
        ctx.contentType("application/json");

        List<Database.UserData> instructors = db.grabAllInstructors();

        ctx.result(gson.toJson(new StructuredResponse("ok",null,instructors)));
    });

    app.get("/get/allusers",ctx->{
        ctx.status(200);
        ctx.contentType("application/json");

        List<Database.UserData> userlist = db.grabAllUsernames();

        ctx.result(gson.toJson(new StructuredResponse("ok",null,userlist)));
    });

    app.post("/course_units/{id}",ctx->{
        ctx.status(200);
        ctx.contentType("application/json");

        int courseId = Integer.parseInt(ctx.pathParam("id"));

        CreateUnitRequest unitReq = gson.fromJson(ctx.body(), CreateUnitRequest.class);

        if(unitReq==null || unitReq.unitName==null){
            System.out.println(unitReq);
            System.out.println(unitReq.unitName);
            ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missgin unit feature", null)));
                return;
        }

        int unitId=db.createUnit(unitReq.unitName, courseId);

        ctx.result(gson.toJson(new StructuredResponse("ok", null, unitId)));

    });

    app.get("/unit_videos/{id}/{title}", ctx->{
        ctx.status(200);
        ctx.contentType("application/json");

        String videoTitle = ctx.pathParam("title");
        int unitId = Integer.parseInt(ctx.pathParam("id"));

        boolean doesEntryExist = db.doesVideoTitleExist(unitId,videoTitle);

        ctx.result(gson.toJson(new StructuredResponse("ok", null, doesEntryExist)));
    });

    app.delete("/delete/unit_videos/unit/{unitId}/videoId/{videoId}",ctx->{
        ctx.status(200);
        ctx.contentType("application/json");

        int unitId=Integer.parseInt(ctx.pathParam("unitId"));
        int videoId=Integer.parseInt(ctx.pathParam("videoId"));

        int result = db.deleteVideoEntry(videoId,unitId);

        if(result<=0){
            ctx.result(gson.toJson(new StructuredResponse("error",null,null)));
        }
        else{
            ctx.result(gson.toJson(new StructuredResponse("ok",null,null)));
        }
    });

    app.post("/course_units/unit/{id}", ctx->{
        ctx.status(200);
        ctx.contentType("application/json");

        int unitId = Integer.parseInt(ctx.pathParam("id"));

        AddUnitMaterial aum = gson.fromJson(ctx.body(), AddUnitMaterial.class);

        if(aum==null || aum.title==null || aum.filepath==null){
            System.out.println(aum);
            System.out.println(aum.title);
            System.out.println(aum.filepath);
             ctx.result(gson.toJson(new StructuredResponse(
                        "error", "missgin video attribute", null)));
                return;
        }

        int videoId = db.addUnitVideo(unitId, aum.title,aum.filepath);

        ctx.result(gson.toJson(new StructuredResponse("ok", null, videoId)));
    });

    app.put("/courses/edit/{cId}", ctx ->{
        ctx.status(200);
        ctx.contentType("application/json");

        int courseId = Integer.parseInt(ctx.pathParam("cId"));

        ChangeCourseRequest ccr = gson.fromJson(ctx.body(),ChangeCourseRequest.class);

        if (ccr == null || ccr.title ==null || ccr.description == null 
        || ccr.instructor==null || ccr.startDate ==null || ccr.level==null
        || ccr.price==null ) {
            System.out.println(ccr);
            System.out.println(ccr.title);
            System.out.println(ccr.description);
            System.out.println(ccr.instructor);
            System.out.println(ccr.startDate);
            System.out.println(ccr.level);
            System.out.println(ccr.price);
            ctx.result(gson.toJson(new StructuredResponse(
                    "error", "missgin course feature", null)));
            return;
        }
        
        int id = db.editCourseInfo(courseId, ccr.title,ccr.description,ccr.instructor,ccr.startDate, 
            ccr.level, ccr.price);

        if(id<=0){
            ctx.result(gson.toJson(new StructuredResponse("error",null,id)));
        }
        else{
            ctx.result(gson.toJson(new StructuredResponse("ok", null, id)));
        }
    });

    app.post("/courses", ctx ->{
        ctx.status(200);
        ctx.contentType("application/json");

        CreateCourseRequest ccr = gson.fromJson(ctx.body(), CreateCourseRequest.class);

        if (ccr == null || ccr.title ==null || ccr.description == null 
        || ccr.instructor==null || ccr.times==null || ccr.startDate ==null || ccr.level==null
        || ccr.price==null || ccr.live_url==null) {
            System.out.println(ccr);
            System.out.println(ccr.title);
            System.out.println(ccr.description);
            System.out.println(ccr.instructor);
            System.out.println(ccr.times);
            System.out.println(ccr.startDate);
            System.out.println(ccr.level);
            System.out.println(ccr.price);
            System.out.println(ccr.live_url);
            ctx.result(gson.toJson(new StructuredResponse(
                    "error", "missgin course feature", null)));
            return;
        }

        int id = db.createCourse(ccr.title,ccr.description,ccr.instructor,ccr.times,ccr.startDate, 
            ccr.level, ccr.price, ccr.live_url);

        ctx.result(gson.toJson(new StructuredResponse("ok", null, id)));
    });

    app.get("/courses", ctx -> {
        ctx.status(200);
        ctx.contentType("application/json");
        ctx.result(gson.toJson(new StructuredResponse("ok", null, db.selectAllCourses())));
    });
    
    // GET /courses/{id} — single course (full unit+video tree)
    app.get("/courses/{id}", ctx -> {
        ctx.status(200);
        ctx.contentType("application/json");
        int courseId = Integer.parseInt(ctx.pathParam("id"));
        Database.CourseData course = db.selectCourse(courseId);
        ctx.result(gson.toJson(course == null
            ? new StructuredResponse("error", "course not found", null)
            : new StructuredResponse("ok", null, course)));
    });
    
    // GET /courses/enrolled/{uuid} — enrolled courses for a user
    app.get("/courses/enrolled/{uuid}", ctx -> {
        ctx.status(200);
        ctx.contentType("application/json");
        String uuid = ctx.pathParam("uuid");
        ctx.result(gson.toJson(new StructuredResponse("ok", null, db.selectEnrolledCourses(uuid))));
    });
    
    // POST /courses/{id}/enroll — enroll the current user
    app.post("/courses/{id}/enroll", ctx -> {
        ctx.status(200);
        ctx.contentType("application/json");
    
        int courseId = Integer.parseInt(ctx.pathParam("id"));
        // reuse EnrollRequest inner class (add to top of App.java — see comment above)
        EnrollRequest req = gson.fromJson(ctx.body(), EnrollRequest.class);
        if (req == null || req.user_uuid == null) {
            ctx.status(400);
            ctx.result(gson.toJson(new StructuredResponse("error", "missing user_uuid", null)));
            return;
        }
    
        int result = db.enrollUser(courseId, req.user_uuid);
        if (result < 0) {
            ctx.status(500);
            ctx.result(gson.toJson(new StructuredResponse("error", "enroll failed", null)));
        } else if (result == 0) {
            ctx.result(gson.toJson(new StructuredResponse("ok", "already enrolled", null)));
        } else {
            ctx.result(gson.toJson(new StructuredResponse("ok", "enrolled", null)));
        }
    });
    
    // DELETE /courses/{id}/enroll — unenroll
    app.delete("/courses/{id}/enroll", ctx -> {
        ctx.status(200);
        ctx.contentType("application/json");
    
        int courseId = Integer.parseInt(ctx.pathParam("id"));
        EnrollRequest req = gson.fromJson(ctx.body(), EnrollRequest.class);
        if (req == null || req.user_uuid == null) {
            ctx.status(400);
            ctx.result(gson.toJson(new StructuredResponse("error", "missing user_uuid", null)));
            return;
        }
    
        int result = db.unenrollUser(courseId, req.user_uuid);
        ctx.result(gson.toJson(result <= 0
            ? new StructuredResponse("error", "unenroll failed or not enrolled", null)
            : new StructuredResponse("ok", "unenrolled", null)));
    });

        app.start(8080);
    }  
    
}
