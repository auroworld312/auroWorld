package auroWorld.backend;


import java.sql.*;
import java.util.*;

public class Database{


    public static final class CommentData {
        public final int commentId;
        public final int msgId;
        public final String comment;
        public final int upvote;
        //public final int downvote;
        //public final Timestamp createdAt;
        public final boolean valid;
        public final String uuid;
        public final String username;

        //public final String userFirst;
       // public final String userLast;

        public CommentData(int commentId, int msgId, String comment, int upvote, 
                            boolean valid, String uuid, String username){
                           //int upvote, int downvote, Timestamp createdAt, boolean valid,
                           //String userFirst, String userLast) {
            this.commentId = commentId;
            this.msgId = msgId;
            this.comment = comment;
            this.upvote = upvote;
            //this.downvote = downvote;
            //this.createdAt = createdAt;
            this.valid = valid;
            this.uuid=uuid;
            this.username=username;
            //this.userFirst = userFirst;
            //this.userLast = userLast;
        }
    }

    public static final class MessageData {
        public final int msgId;
        public final String subject;
        public final String message;
        public final int upvote;
        public final int downvote;
        public final String uuid;
        public final ArrayList<CommentData> commentdata;
        public final String filepath;
        public final String username;

        // NEW: author name fields
        // public final String firstName;
        // public final String lastName;

        public MessageData(int msgId, String subject, String message,
                        int upvote, int downvote, String uuid, ArrayList<CommentData> commentdata, 
                        String filepath, String username) {
            this.msgId = msgId;
            this.subject = subject;
            this.message = message;
            this.upvote = upvote;
            this.downvote = downvote;
            this.uuid=uuid;
            this.commentdata=commentdata;
            this.filepath=filepath;
            this.username=username;
            // this.createdAt = createdAt;
            // this.valid = valid;
            // this.firstName = firstName;
            // this.lastName = lastName;
        }
        public void getterTest(){
            System.out.println(msgId);
            System.out.println(subject);
        }
    }

    public static final class ProfilePublicData {
        public final String userId;
        public final String firstName;
        public final String lastName;
        public final String email;
        public final String note;

        public ProfilePublicData(String userId, String firstName, String lastName,
                                 String email, String note) {
            this.userId = userId;
            this.firstName = firstName;
            this.lastName = lastName;
            this.email = email;
            this.note = note;
        }
    }

    public static final class FileData{
        public final int fileId;
        public final String user_uuid;
        public final int msgId;
        public final String filepath;
        public final String filename;
        
        public FileData(int fileId, String user_uuid,int msgId, String filepath, String filename){
            this.fileId=fileId;
            this.user_uuid=user_uuid;
            this.msgId=msgId;
            this.filepath=filepath;
            this.filename=filename;
        }
    }

    public static final class VideoData {
        public final int    videoId;
        public final int    unitId;
        public final String title;
        public final String driveUrl;
        public final String duration;
        public final int    sortOrder;

        public VideoData(int videoId, int unitId, String title,
                         String driveUrl, String duration, int sortOrder) {
            this.videoId   = videoId;
            this.unitId    = unitId;
            this.title     = title;
            this.driveUrl  = driveUrl;
            this.duration  = duration;
            this.sortOrder = sortOrder;
        }
    }

    public static final class UnitData {
        public final int             unitId;
        public final int             courseId;
        public final String          title;
        public final int             sortOrder;
        public final List<VideoData> videos;

        public UnitData(int unitId, int courseId, String title,
                        int sortOrder, List<VideoData> videos) {
            this.unitId    = unitId;
            this.courseId  = courseId;
            this.title     = title;
            this.sortOrder = sortOrder;
            this.videos    = videos;
        }
        public List<VideoData> getVideos(){
            return this.videos;
        }
    }

    public static final class CourseData {
        public final int  courseId;
        public final String   title;
        public final String description;
        public final String  instructor;
        public final String   times;
        public final String startDate;
        public final String   level;
        public final String    price;
        public final String   thumbnail;
        public final String   liveUrl;
        public final boolean   inSession;
        public final List<UnitData>  units;

        public CourseData(int courseId, String title, String description,
                          String instructor, String times, String startDate,
                          String level, String price, String thumbnail,
                          String liveUrl, boolean inSession, List<UnitData> units) {
            this.courseId   = courseId;
            this.title      = title;
            this.description = description;
            this.instructor = instructor;
            this.times   = times;
            this.startDate  = startDate;
            this.level   = level;
            this.price   = price;
            this.thumbnail = thumbnail;
            this.liveUrl   = liveUrl;
            this.inSession = inSession;
            this.units   = units;
        }
        public List<UnitData> getUnits(){
            return this.units;
        }
    }

    public static final class UserData{
        public final String username;
        public final String firstname;
        public final String lastname;
        public final String email;
        public final String role;
        public final String note;
        public final String unique_id;

        public UserData(String username, String firstname, String lastname, String email,
            String role, String note, String unique_id){
            this.username=username;
            this.firstname=firstname;
            this.lastname=lastname;
            this.email=email;
            this.role=role;
            this.note=note;
            this.unique_id=unique_id;
        }
    }

    public static final class LikedMessage{
        public final int msgId;
        public LikedMessage(int msgId){
            this.msgId=msgId;
        }
    }

    //database class attributes and constructor + helper methods
    private final String dbUri;

    private Database(String dbUri) {
        this.dbUri = dbUri;
    }
    private Connection getConnection() throws SQLException {
        return DriverManager.getConnection(dbUri);
    }
    public boolean disconnect() {
        // Nothing to close; each method closes its own connection
        return true;
    }
    //overloaded methods for getDatabase
    public static Database getDatabase(String dbUri) {
        try {
            // Optional: test initial connection so we fail fast if URI is bad
            try (Connection conn = DriverManager.getConnection(dbUri)) {
                System.out.println("Database: initial connection OK");
            }
            return new Database(dbUri);
        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
    }

    public static Database getDatabase(String ip, String port, String dbname, String user, String pass) {
        String uri = "jdbc:postgresql://" + ip + ":" + port + "/" + dbname +
                     "?user=" + user + "&password=" + pass;
        return getDatabase(uri);
    }

    public static Database getDatabase() {
        Map<String, String> env = System.getenv();

        String dbUri = env.get("DATABASE_URI");
        if (dbUri != null && !dbUri.isEmpty()) {
            return getDatabase(dbUri);
        }

        String ip = env.get("POSTGRES_IP");
        String port = env.get("POSTGRES_PORT");
        String dbname = env.get("POSTGRES_DBNAME");
        String user = env.get("POSTGRES_USER");
        String pass = env.get("POSTGRES_PASS");

        if (ip != null && port != null && dbname != null &&
            user != null && pass != null) {
            return getDatabase(ip, port, dbname, user, pass);
        }

        return null;
    }

    public int ensureUserWithEmail(String first, String last, String email) {
        String sql =
                "INSERT INTO \"users\" (\"username\", firstname, lastname, email, role) " +
                "VALUES (?, ?, ?, ?, NULL) " +
                "ON CONFLICT (\"username\") DO UPDATE SET " +
                "firstname = EXCLUDED.firstname, " +
                "lastname = EXCLUDED.lastname, " +
                "email = EXCLUDED.email";

        try (Connection conn = getConnection();
             PreparedStatement q = conn.prepareStatement(sql)) {

            // q.setString(1, username);
            q.setString(2, first);
            q.setString(3, last);
            q.setString(4, email);
            return q.executeUpdate();

        } catch (SQLException e) {
            e.printStackTrace();
            return -1;
        }
    }
    public String grabUsernameFromUuid(String uuid){
        String sql =
            "SELECT username FROM users WHERE unique_id = ?";
        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, uuid);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("username");
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
        return null;
    }

    public boolean usernameExists(String username){
        String username_sql=
            "SELECT username FROM users WHERE username = ?";
        try(Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(username_sql)){
            ps.setString(1,username);
            try (ResultSet user_exists = ps.executeQuery()){
                while(user_exists.next()){
                    String foundUsername=user_exists.getString("username");
                    return true;
                }
            }
        } catch(SQLException e){
            e.printStackTrace();
            return true;
        }
        return false;
    }

    public boolean emailExists(String email){
        String email_sql=
            "SELECT email FROM users WHERE email = ?";
        try(Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(email_sql)){
            ps.setString(1,email);
            try (ResultSet email_exists = ps.executeQuery()){
                while(email_exists.next()){
                    String foundEmail=email_exists.getString("email");
                    return true;
                }
            }
        } catch(SQLException e){
            e.printStackTrace();
            return true;
        }
        return false;
    }
    public int insertNewProfile(String username, String email, String uuid){
        String sql =
                "INSERT INTO profile_attributes (uuid, email, birthday, firstname, lastname, note, username, role)" +
                "VALUES (?, ?, NULL, NULL, NULL, NULL, ?, NULL) ";
        try(Connection conn =getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)){
                ps.setString(1,uuid);
                ps.setString(2,email);
                ps.setString(3,username);

                int res = ps.executeUpdate();
                System.out.println(res);

                return res;
        }catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }

    public int insertNewAccount(String username, String email, String uuid,String lastname, String firstname){
        String sql =
                "INSERT INTO users (username, firstname, lastname, email, role, note, unique_id)" +
                "VALUES (?, ?, ?, ?, ?, ?, ?) ";
        try(Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)){
                ps.setString(1,username);
                ps.setString(2,firstname);
                ps.setString(3,lastname);
                ps.setString(4,email);
                ps.setString(5,"user");
                ps.setString(6,null);
                ps.setString(7,uuid);
                return ps.executeUpdate();
        }catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }
// String sql=
//             "SELECT m.msg_id, m.subject, m.message, " +
//             "m.upvote AS message_upvote, m.downvote, m.unique_id AS your_uuid, " +
//             "c.comment_id, c.comment, c.upvote AS comment_upvote, c.unique_id AS comment_unique_id, " +
//             "f.filepath AS file_path, u.username AS your_username, cu.username AS comment_username " +
//             "FROM messages m " +
//             "LEFT JOIN comments c ON m.msg_id = c.msg_id " +
//             "LEFT JOIN files f ON m.msg_id = f.msg_id " +
//             "LEFT JOIN users u ON m.unique_id = u.unique_id " +
//             "LEFT JOIN users cu ON c.unique_id = cu.unique_id " +
//             "ORDER BY m.msg_id DESC";
// public String grabUsernameFromUuid(String uuid){
//         String sql =
//             "SELECT username FROM users WHERE unique_id = ?";
//         try (Connection conn = getConnection();
//             PreparedStatement ps = conn.prepareStatement(sql)) {
//             ps.setString(1, uuid);
//             try (ResultSet rs = ps.executeQuery()) {
//                 if (rs.next()) {
//                     return rs.getString("username");
//                 }
//             }
//         } catch (SQLException e) {
//             e.printStackTrace();
//             return null;
//         }
//         return null;
//     }
    public String getMessageFilepath(int msgId){
        String sqlFilepath = "SELECT filepath FROM files WHERE msg_id = ? ";
        try(Connection conn = getConnection();
        PreparedStatement ps = conn.prepareStatement(sqlFilepath)){
            ps.setInt(1,msgId);
            try(ResultSet rs = ps.executeQuery()){
                if(rs.next()){
                    return rs.getString("filepath");
                }
                return null;
            }
        } catch(SQLException e){
            e.printStackTrace();
            return null;
        }
    }

    public int deleteMessageAndComments(int msgId){
        String deleteCommentVote="DELETE FROM vote_comments WHERE msg_id = ?";
        String deleteMessageVote = "DELETE FROM vote_messages WHERE msg_id = ?";
        String deleteComment = "DELETE FROM comments WHERE msg_id = ?";
        String deleteFile ="DELETE FROM files WHERE msg_id = ?";
        String deleteMessage= "DELETE FROM messages WHERE msg_id = ?";

        try(Connection conn = getConnection();
        PreparedStatement ps1 = conn.prepareStatement(deleteCommentVote);
        PreparedStatement ps2 = conn.prepareStatement(deleteMessageVote);
        PreparedStatement ps3 = conn.prepareStatement(deleteComment);
        PreparedStatement ps4 = conn.prepareStatement(deleteFile);
        PreparedStatement ps5 = conn.prepareStatement(deleteMessage)){
            ps1.setInt(1, msgId);
            ps2.setInt(1, msgId);
            ps3.setInt(1, msgId);
            ps4.setInt(1, msgId);
            ps5.setInt(1, msgId);
            ps1.executeUpdate();
            ps2.executeUpdate();
            ps3.executeUpdate();
            ps4.executeUpdate();
            ps5.executeUpdate();
            return 1;
        } 
        catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }

    // insert a new message, return msg_id 
    public int insertMessage(String userId, String subject, String message) {
        String sql =
                "INSERT INTO messages (subject, message, upvote, downvote, unique_id) " +
                "VALUES (?, ?, 0, 0, ?) " +
                "RETURNING msg_id";

        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, subject);
            ps.setString(2, message);
            ps.setString(3, userId);

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return rs.getInt("msg_id");
                return -1;
            }

        } catch (SQLException e) {
            e.printStackTrace();
            return -1;
        }
    }

    public ArrayList<MessageData> selectAllMessages(){
        Map<Integer,MessageData> msgs = new LinkedHashMap<>();

        String sql=
            "SELECT m.msg_id, m.subject, m.message, " +
            "m.upvote AS message_upvote, m.downvote, m.unique_id AS your_uuid, " +
            "c.comment_id, c.comment, c.upvote AS comment_upvote, c.unique_id AS comment_unique_id, " +
            "f.filepath AS file_path, u.username AS your_username, cu.username AS comment_username " +
            "FROM messages m " +
            "LEFT JOIN comments c ON m.msg_id = c.msg_id " +
            "LEFT JOIN files f ON m.msg_id = f.msg_id " +
            "LEFT JOIN users u ON m.unique_id = u.unique_id " +
            "LEFT JOIN users cu ON c.unique_id = cu.unique_id " +
            "ORDER BY m.msg_id DESC";
        
        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)){

            try (ResultSet rs = ps.executeQuery()){
            
                while (rs.next()){
                    int msgId= rs.getInt("msg_id");

                    MessageData msg = msgs.get(msgId);

                    // String name ="[unknown]";
                    // if (rs.getString("your_username")!=null){
                    //     name=rs.getString("your_username");
                    // }

                    if(msg==null){

                        msg = new MessageData(
                            msgId,
                            rs.getString("subject"),
                            rs.getString("message"),
                            rs.getInt("message_upvote"),
                            rs.getInt("downvote"),
                            rs.getString("your_uuid"),
                            new ArrayList<>(),
                            rs.getString("file_path"),
                            //name
                            rs.getString("your_username")
                            // rs.getString("first_name"),   // may be null if somehow missing
                            // rs.getString("last_name")
                        );
                        msgs.put(msgId,msg);
                    }
                    int commentId = rs.getInt("comment_id");

                    // if(rs.getString("comment_username")!=null){
                    //     name=rs.getString("comment_username");
                    // }
                    if (!rs.wasNull()) {

                        CommentData comm = new CommentData(
                            rs.getInt("comment_id"),
                            msgId,
                            rs.getString("comment"),
                            rs.getInt("comment_upvote"),
                            true,
                            rs.getString("comment_unique_id"),
                            rs.getString("comment_username")
                        );
                        msg.commentdata.add(comm);
                    }
                    //System.out.println(msg);
                    // msg.getterTest();
                    
                }
            }
        }catch(SQLException e){
            e.printStackTrace();
        }
        ArrayList<MessageData> res = new ArrayList<>(msgs.values());
        return res;
    }

    public ArrayList<MessageData> selectUserMessages(String user_uuid){

        Map<Integer, MessageData> msgs = new LinkedHashMap<>();

        String sql = 
            "SELECT m.msg_id, m.subject, m.message, " +
            "m.upvote AS message_upvote, m.downvote, m.unique_id, " +
            "c.comment_id, c.comment, c.upvote AS comment_upvote, c.unique_id AS comment_unique_id, " +
            "f.filepath AS file_path, u.username AS your_username, cu.username AS comment_username " +
            "FROM messages m " +
            "LEFT JOIN comments c ON m.msg_id = c.msg_id " +
            "LEFT JOIN files f ON m.msg_id = f.msg_id " +
            "LEFT JOIN users u ON m.unique_id = u.unique_id " +
            "LEFT JOIN users cu ON c.unique_id = cu.unique_id " +
            "WHERE m.unique_id = ? "+
            "ORDER BY m.msg_id DESC";

        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)){

            ps.setString(1,user_uuid);

            try (ResultSet rs = ps.executeQuery()){
            
                while (rs.next()){
                    int msgId= rs.getInt("msg_id");

                    MessageData msg = msgs.get(msgId);

                    if(msg==null){

                        msg = new MessageData(
                            msgId,
                            rs.getString("subject"),
                            rs.getString("message"),
                            rs.getInt("message_upvote"),
                            rs.getInt("downvote"),
                            user_uuid,
                            new ArrayList<>(),
                            rs.getString("file_path"),
                            rs.getString("your_username")
                            // rs.getString("first_name"),   // may be null if somehow missing
                            // rs.getString("last_name")
                        );
                        msgs.put(msgId,msg);
                    }
                    int commentId = rs.getInt("comment_id");

                    if (!rs.wasNull()) {

                        CommentData comm = new CommentData(
                            rs.getInt("comment_id"),
                            msgId,
                            rs.getString("comment"),
                            rs.getInt("comment_upvote"),
                            true,
                            rs.getString("comment_unique_id"),
                            rs.getString("comment_username")
                        );
                        msg.commentdata.add(comm);
                    }
                }
            }
        }catch(SQLException e){
            e.printStackTrace();
        }
        ArrayList<MessageData> res = new ArrayList<>(msgs.values());
        return res;
    }
    //String fileId, String user_uuid,int msgId, String filepath, String filename
    public ArrayList<FileData> grabMyFilenames(String user_uuid){
        ArrayList<FileData> files = new ArrayList<>();
        String sql=
            "SELECT f.file_id AS f_id, f.filename AS f_name, f.msg_id AS m_id, f.filepath AS f_path FROM files f WHERE f.unique_id=? ORDER BY f_id DESC";
        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)){
            ps.setString(1,user_uuid);
            try (ResultSet rs = ps.executeQuery()){
                while(rs.next()){
                    files.add(new FileData(
                        rs.getInt("f_id"),
                        user_uuid,
                        rs.getInt("m_id"),
                        rs.getString("f_path"),
                        rs.getString("f_name")
                    ));
                }
            }
        } catch(SQLException e){
            e.printStackTrace();
            return null;
        }
        return files;
    }

    public String grabFilename(int msg_id){
        String sql =
            "SELECT f.msg_id, f.filename FROM files f WHERE f.msg_id=?";
        try (Connection conn = getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)){
            ps.setInt(1,msg_id);
            try (ResultSet rs = ps.executeQuery()){
                if(rs.next()){
                    return(rs.getString("filename"));
                }
                else{
                    return null;
                }
            }
        } catch(SQLException e){
            e.printStackTrace();
            return null;
        }

    }

    // "SELECT m.msg_id, m.subject, m.message, " +
    //         "m.upvote AS message_upvote, m.downvote, m.unique_id AS your_uuid, " +
    //         "c.comment_id, c.comment, c.upvote AS comment_upvote, c.unique_id AS comment_unique_id, " +
    //         "f.filepath AS file_path, u.username AS your_username, cu.username AS comment_username " +
    //         "FROM messages m " +
    //         "LEFT JOIN comments c ON m.msg_id = c.msg_id " +
    //         "LEFT JOIN files f ON m.msg_id = f.msg_id " +
    //         "LEFT JOIN users u ON m.unique_id = u.unique_id " +
    //         "LEFT JOIN users cu ON c.unique_id = cu.unique_id " +
    //         "ORDER BY m.msg_id DESC";
    public MessageData selectMessage(int msg_Id) {
        String sql =
            "SELECT m.msg_id, m.subject, m.message, " +
            "       m.upvote AS message_upvote, m.downvote, m.unique_id AS your_uuid, " +
            "       c.comment_id, c.comment, c.upvote AS comment_upvote, c.unique_id AS comment_unique_id, " +
            "       f.filepath AS file_path, u.username AS your_username, cu.username AS comment_username " +
            "FROM messages m " +
            "LEFT JOIN comments c ON m.msg_id = c.msg_d " +
            "LEFT JOIN files f ON m.msg_id = f.msg_id " +
            "LEFT JOIN \"users\" u ON m.\"unique_id\" = u.\"unique_id\" " +
            "LEFT JOIN users cu ON c.unique_id = cu.unique_id " +
            "WHERE m.msg_id=?";

        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, msg_Id);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;

                MessageData msg = new MessageData(
                    rs.getInt("msg_id"),
                    rs.getString("subject"),
                    rs.getString("message"),
                    rs.getInt("message_upvote"),
                    rs.getInt("downvote"),
                    rs.getString("unique_id"),
                    new ArrayList<>(),
                    rs.getString("file_path"),
                    rs.getString("your_username")
                    //rs.getTimestamp("created_at"),
                    //rs.getBoolean("valid"),
                    //rs.getString("first_name"),
                    //rs.getString("last_name")
                );
                int commentId = rs.getInt("comment_id");

                if (!rs.wasNull()) {
                    CommentData comm = new CommentData(
                        rs.getInt("comment_id"),
                        rs.getInt("msg_id"),
                        rs.getString("comment"),
                        rs.getInt("comment_upvote"),
                        true,
                        rs.getString("comment_unique_id"),
                        rs.getString("comment_username")
                    );
                    msg.commentdata.add(comm);
                }
                return msg;
            }

        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
    }
    public int deleteComment(int comId){
        String deleteCommentSql="DELETE FROM comments WHERE comment_id = ? ";
        String deleteVoteCommentSql="DELETE FROM vote_comments WHERE comment_id =? ";
        try(Connection conn = getConnection();
        PreparedStatement ps1 = conn.prepareStatement(deleteVoteCommentSql);
        PreparedStatement ps2= conn.prepareStatement(deleteCommentSql)){
            ps1.setInt(1,comId);
            ps2.setInt(1,comId);
            ps1.executeUpdate();
            ps2.executeUpdate();
            return 1;
        }catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }
    
    public int updateComment(int comId, String comment){
        String sql ="UPDATE comments SET comment = ? WHERE comment_id = ? ";
        try(Connection conn = getConnection();
        PreparedStatement ps = conn.prepareStatement(sql)){
            ps.setString(1,comment);
            ps.setInt(2,comId);
            int res=ps.executeUpdate();
            if (res>0) {
                return res;
            }
            return -1;
        }catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }

    public int updatePost(int msgId, String title, String message){
        String sql =
                "UPDATE messages SET subject=?, message=? WHERE msg_id=?";

            try(Connection conn= getConnection();
                PreparedStatement ps = conn.prepareStatement(sql)){
                    ps.setString(1,title);
                    ps.setString(2,message);
                    ps.setInt(3,msgId);
                
                int res=ps.executeUpdate();
                if (res>0) {
                    return res;
                }
                return -1;
            } catch (SQLException e){
                e.printStackTrace();
                return -1;
            }
    }

    public int insertFileToTable(String userId, String file,int msgId,String filepath){
        String sql=
            "INSERT INTO files (filename, msg_id, filepath, unique_id) "+
            "VALUES (?, ?, ?, ?)" +
            "RETURNING file_id";
        try(Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)){
                ps.setString(1,file);
                ps.setInt(2,msgId);
                ps.setString(3,filepath);
                ps.setString(4,userId);
            
            try (ResultSet rs = ps.executeQuery()){
                if (rs.next()) return rs.getInt("file_id");
                return -1;
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return -1;
        }
    }
    public ArrayList<Integer> getLikedComments(String uuid){
        ArrayList<Integer> likedComments = new ArrayList<>();
        String select ="SELECT comment_id FROM vote_comments WHERE unique_id = ? AND upvote = 1 ";
        try(Connection conn = getConnection()){
            PreparedStatement ps = conn.prepareStatement(select);
            ps.setString(1, uuid);
            try (ResultSet rs = ps.executeQuery()){
                while (rs.next()){
                    likedComments.add(rs.getInt("comment_id"));
                }    
            }    
        }catch(SQLException e){
            e.printStackTrace();
        }
        return likedComments;
    }

    public ArrayList<Integer> getLikedPosts(String uuid){
        ArrayList<Integer> likedPosts = new ArrayList<>();
        String select ="SELECT msg_id FROM vote_messages WHERE unique_id = ? AND upvote = 1 ";
        try(Connection conn = getConnection()){
            PreparedStatement ps = conn.prepareStatement(select);
            ps.setString(1, uuid);
            try (ResultSet rs = ps.executeQuery()){
                while (rs.next()){
                    likedPosts.add(rs.getInt("msg_id"));
                }    
            }    
        }catch(SQLException e){
            e.printStackTrace();
        }
        return likedPosts;
    }

    public int voteMessageTable(int msgId,String user_uuid, int upvote){
        Integer oldVote=null;
        int newVote=-1; 
        int change=0;
        String text="";

        String selectUpvoteSql="SELECT upvote FROM vote_messages WHERE msg_id=? AND \"unique_id\"=?";
        String deleteUpvoteSql="DELETE FROM vote_messages WHERE msg_id=? AND \"unique_id\"=?";
        String insertUpvoteSql = "INSERT INTO vote_messages (msg_id, \"unique_id\", upvote) VALUES (?, ?, ?)";
        String updateUpvoteSql = "UPDATE vote_messages SET upvote=? WHERE msg_id=? AND \"unique_id\"=?";

        try(Connection conn = getConnection()){
            try (PreparedStatement ps = conn.prepareStatement(selectUpvoteSql)){
                ps.setInt(1,msgId);
                ps.setString(2,user_uuid);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        oldVote = rs.getInt("upvote");
                    }
                }
                System.out.println(ps);
            }
            if (oldVote==null){
                text="Inserting upvote.";
                newVote=1;
                try(PreparedStatement ins=conn.prepareStatement(insertUpvoteSql)){
                    ins.setInt(1,msgId);
                    ins.setString(2,user_uuid);
                    ins.setInt(3,newVote);

                    ins.executeUpdate();
                }
                System.out.println("Successfully inserted upvote");
                change=1;
            }
            else if (oldVote==1){
                newVote=0;
                text="Updating upvote takeback";

                try(PreparedStatement upd = conn.prepareStatement(updateUpvoteSql)){
                    upd.setInt(1,newVote);
                    System.out.println(upd);
                    upd.setInt(2,msgId);
                    System.out.println(upd);
                    upd.setString(3,user_uuid);
                    System.out.println(upd);
                    upd.executeUpdate();
                }
                System.out.println("Successfully took back your upvote");
                change=-1;
            }
            else if (oldVote==0){
                text="Updating upvote regive";
                newVote=1;
                try(PreparedStatement upd = conn.prepareStatement(updateUpvoteSql)){
                    upd.setInt(1,newVote);
                    System.out.println(upd);
                    upd.setInt(2,msgId);
                    System.out.println(upd);
                    upd.setString(3,user_uuid);
                    System.out.println(upd);
                    upd.executeUpdate();
                }
                System.out.println("Successfully regave your upvote");
                change=1;
            }
            changeMessageUpvote(conn, msgId,change);
            return newVote;

        } catch (SQLException e) {
            System.out.println(text);
            e.printStackTrace();
            return -1;
        }

    }

    private void changeMessageUpvote(Connection conn, int msgId, int change) throws SQLException{
        System.out.println("modifying upvotes for post "+msgId);
        int newUpvotes=0;
        String selectUpvote = "SELECT upvote FROM messages WHERE msg_id=?";
        String updateUpvote="UPDATE messages SET upvote=? WHERE msg_id=?";

        try( PreparedStatement ps=conn.prepareStatement(selectUpvote)){
            ps.setInt(1,msgId);
            System.out.println(ps);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int currentUpvotes = rs.getInt("upvote");
                    newUpvotes= currentUpvotes + change;
                    System.out.println("Change ="+change);
                    System.out.println("currentUpvotes = "+currentUpvotes);
                    System.out.println("newUpvotes="+newUpvotes);
                }
            }
        }
        try(PreparedStatement upd=conn.prepareStatement(updateUpvote)){
            System.out.println("preparing to update upvote in messages table");
            upd.setInt(1,newUpvotes);
            System.out.println(upd);
            upd.setInt(2,msgId);
            System.out.println(upd);
            upd.executeUpdate();
            System.out.println("successfully updated upvote for messages table");
        }

    }

    public int voteCommentTable(int comment_id,String unique_id, int upvote, int msgId){
        Integer oldVote=null;
        int newVote=-1;
        int change=0;
        String text="";

        // String selectSql = "SELECT vote FROM votes WHERE \"userID\"=? AND message_id=?";
        // String deleteSql = "DELETE FROM votes WHERE \"userID\"=? AND message_id=?";
        // String insertSql = "INSERT INTO votes (\"userID\", message_id, vote) VALUES (?, ?, ?)";
        // String updateSql = "UPDATE votes SET vote=? WHERE \"userID\"=? AND message_id=?";
        String selectUpvoteSql="SELECT upvote FROM vote_comments WHERE comment_id=? AND \"unique_id\"=?";
        String deleteUpvoteSql="DELETE upvote FROM vote_comments WHERE comment_id=? AND \"unique_id\"=?";
        String insertUpvoteSql = "INSERT INTO vote_comments (comment_id, \"unique_id\", upvote, msg_id) VALUES (?, ?, ?, ?)";
        String updateUpvoteSql = "UPDATE vote_comments SET upvote=? WHERE comment_id=? AND \"unique_id\"=?";

        try(Connection conn = getConnection()){
            try (PreparedStatement ps = conn.prepareStatement(selectUpvoteSql)){
                ps.setInt(1,comment_id);
                ps.setString(2,unique_id);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        oldVote = rs.getInt("upvote");
                    }
                }
                System.out.println(ps);
            }
            if (oldVote==null){
                text="Inserting upvote. (comments)";
                newVote=1;
                try(PreparedStatement ins=conn.prepareStatement(insertUpvoteSql)){
                    ins.setInt(1,comment_id);
                    ins.setString(2,unique_id);
                    ins.setInt(3,newVote);
                    ins.setInt(4,msgId);
                    ins.executeUpdate();
                }
                System.out.println("Successfully inserted upvote (comments)");
                change=1;
            }
            else if (oldVote==1){
                newVote=0;
                text="Updating upvote takeback";

                try(PreparedStatement upd = conn.prepareStatement(updateUpvoteSql)){
                    upd.setInt(1,newVote);
                    System.out.println(upd);
                    upd.setInt(2,comment_id);
                    System.out.println(upd);
                    upd.setString(3,unique_id);
                    System.out.println(upd);
                    upd.executeUpdate();
                }
                System.out.println("Successfully took back your upvote (comments)");
                change=-1;
            }
            else if (oldVote==0){
                text="Updating upvote regive (comments)";
                newVote=1;
                try(PreparedStatement upd = conn.prepareStatement(updateUpvoteSql)){
                    upd.setInt(1,newVote);
                    System.out.println(upd);
                    upd.setInt(2,comment_id);
                    System.out.println(upd);
                    upd.setString(3,unique_id);
                    System.out.println(upd);
                    upd.executeUpdate();
                }
                System.out.println("Successfully regave your upvote");
                change=1;
            }
            changeCommentUpvote(conn, comment_id,change);
            return newVote;

        } catch (SQLException e) {
            System.out.println(text);
            e.printStackTrace();
            return -1;
        }

    }

    private void changeCommentUpvote(Connection conn, int comment_id, int change) throws SQLException{
        System.out.println("modifying upvotes for comment "+comment_id);
        int newUpvotes=0;
        String selectUpvote = "SELECT upvote FROM comments WHERE comment_id=?";
        String updateUpvote="UPDATE comments SET upvote=? WHERE comment_id=?";

        try( PreparedStatement ps=conn.prepareStatement(selectUpvote)){
            ps.setInt(1,comment_id);
            System.out.println(ps);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int currentUpvotes = rs.getInt("upvote");
                    newUpvotes= currentUpvotes + change;
                    System.out.println("Change ="+change);
                    System.out.println("currentUpvotes = "+currentUpvotes);
                    System.out.println("newUpvotes="+newUpvotes);
                }
            }
        }
        try(PreparedStatement upd=conn.prepareStatement(updateUpvote)){
            System.out.println("preparing to update upvote in comments table");
            upd.setInt(1,newUpvotes);
            System.out.println(upd);
            upd.setInt(2,comment_id);
            System.out.println(upd);
            upd.executeUpdate();
            System.out.println("successfully updated upvote for messages table");
        }
    }

    //insert a new comment and return comment_id
    public int insertComment(int msgId, String userId, String comment) {
        String sql =
            "INSERT INTO comments (msg_id, comment, valid, unique_id) " +
            "VALUES (?, ?, true, ?) RETURNING comment_id";

        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, msgId);
            ps.setString(2, comment);
            ps.setString(3, userId);

            try (ResultSet rs = ps.executeQuery()) {
                System.out.println(rs);
                if (rs.next()) return rs.getInt("comment_id");
                return -1;
            }

        } catch (SQLException e) {
            e.printStackTrace();
            return -1;
        }
    }

    public ArrayList<CommentData> selectComments(int msgId) {
        ArrayList<CommentData> res = new ArrayList<>();

        String sql =
            "SELECT c.comment_id, c.msg_id, c.comment,c.valid ,c.upvote, " + 
            "c.unique_id, cu.username AS comment_username " +
            //"       c.created_at,  u.first_name, u.last_name " +
            "FROM comments c " +
            "JOIN \"users\" u ON c.\"unique_id\" = u.\"unique_id\" " +
            "LEFT JOIN \"users\" cu ON  c.unique_id = cu.unique_id " +
            "WHERE c.msg_id=? ORDER BY c.comment_id DESC";

        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, msgId);

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    res.add(new CommentData(
                            rs.getInt("comment_id"),
                            rs.getInt("msg_id"),
                            rs.getString("comment"),
                            rs.getInt("upvote"),
                            //0, // upvote placeholder
                            //0, // downvote placeholder
                            //rs.getTimestamp("created_at"),
                            rs.getBoolean("valid"),
                            rs.getString("unique_id"),
                            rs.getString("comment_username")
                            //rs.getString("first_name"),
                            //rs.getString("last_name")
                    ));
                }
            }

        } catch (SQLException e) {
            e.printStackTrace();
        }
        return res;
    }

    public ProfilePublicData selectPublicProfile(String user_uuid) {
        String sql =
                "SELECT \"username\", firstname, lastname, email, note " +
                "FROM \"users\" WHERE \"unique_id\"=?";

        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, user_uuid);

            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return null;

                return new ProfilePublicData(
                    rs.getString("username"),
                    rs.getString("firstname"),
                    rs.getString("lastname"),
                    rs.getString("email"),
                    rs.getString("note")
                );
            }

        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
    }
    /* -------------------------------------------------------------
     *                       COURSE METHODS
     * ------------------------------------------------------------- */

    public int editCourseInfo(int courseId, String title, String description, String instructor, 
    String start_date, String level, String price){
        
        String updateCourseInfo = "UPDATE courses SET title = ?, description = ?, instructor =? , "
        +"start_date = ?, level = ?, price = ? WHERE course_id = ? ";

        try(Connection conn = getConnection();
        PreparedStatement ps = conn.prepareStatement(updateCourseInfo)){
            ps.setString(1,title);
            ps.setString(2,description);
            ps.setString(3,instructor);
            ps.setString(4,start_date);
            ps.setString(5,level);
            ps.setString(6,price);
            ps.setInt(7,courseId);
            return ps.executeUpdate();

        }catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
        
    }

    public int createCourse(String title, String description, String instructor, String times,
        String start_date, String level, String price, String live_url){
        String sql="INSERT INTO courses (title, description, instructor, times, start_date, level, "+ 
        "price, live_url) "+
        "VALUES (?,?,?,?,?,?,?,?) ";
        try(Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)){
            ps.setString(1,title);
            ps.setString(2,description);
            ps.setString(3,instructor);
            ps.setString(4,times);
            ps.setString(5,start_date);
            ps.setString(6,level);
            ps.setString(7,price);
            ps.setString(8,live_url);
            try(ResultSet rs = ps.executeQuery()){
                System.out.println(rs);
                if(rs.next()) return rs.getInt("course_id");
                return -1;
            }
        }
        catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }

    public int createUnit(String unitName, int courseId){
        String insertUnit = "INSERT INTO course_units (course_id, title) VALUES (?,?) ";
        try(Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(insertUnit)){
            ps.setInt(1,courseId);
            ps.setString(2,unitName);
            try(ResultSet rs = ps.executeQuery()){
                System.out.println(rs);
                if(rs.next()) return rs.getInt("unit_id");
                return -1;
            }
        }
        catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }

    // public String getVideoFilepath(int videoId, int unitId){

    // }

    public int deleteVideoEntry(int videoId, int unitId){
        String delete = "DELETE FROM unit_videos WHERE video_id = ? AND unit_id = ? ";
        try(Connection conn = getConnection();
        PreparedStatement ps = conn.prepareStatement(delete)){
            ps.setInt(1,videoId);
            ps.setInt(2,unitId);
            return ps.executeUpdate();
        
        }catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }

    public boolean doesVideoTitleExist(int unitId, String videoTitle){
        String selectVideoFilepath="SELECT drive_url " +
        "FROM \"unit_videos\" WHERE \"title\"=? AND \"unit_id\"=? ";
        try(Connection conn = getConnection();
        PreparedStatement ps = conn.prepareStatement(selectVideoFilepath)){
            ps.setString(1,videoTitle);
            ps.setInt(2,unitId);
            try(ResultSet rs = ps.executeQuery()){
                System.out.println(rs);
                if(rs.next()){
                    return true;
                }
                return false;
            }
        }catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public int addUnitVideo(int unitId, String title, String filepath){
        String insertVideo="INSERT INTO unit_videos (unit_id, title, drive_url) VALUES (?,?,?) ";
        try(Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(insertVideo)){
            ps.setInt(1,unitId);
            ps.setString(2,title);
            ps.setString(3,filepath);
            try(ResultSet rs = ps.executeQuery()){
                System.out.println(rs);
                if(rs.next()) return rs.getInt("video_id");
                return -1;
            }
        }
        catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }
    public UserData getUserAttributes(String uuid){
        String grabUser = "SELECT username, firstname, lastname, email, role, note FROM users WHERE unique_id=?";
        try(Connection conn = getConnection();
        PreparedStatement ps = conn.prepareStatement(grabUser)){
            ps.setString(1,uuid);
            try(ResultSet rs = ps.executeQuery()){
                if(rs.next()){
                    return new UserData(
                        rs.getString("username"),
                        rs.getString("firstname"),
                        rs.getString("lastname"),
                        rs.getString("email"),
                        rs.getString("role"),
                        rs.getString("note"),
                        uuid
                    );
                }
                return null;
            }
        }catch(SQLException e){
            e.printStackTrace();
            return null;
        }
    }
    public int changeUserRole(String username, String role, String uuid){
        String changerole = "UPDATE users SET username=?, role=? WHERE unique_id=? ";

        try(Connection conn = getConnection();
        PreparedStatement ps = conn.prepareStatement(changerole)){
            ps.setString(1,username);
            ps.setString(2,role);
            ps.setString(3,uuid);
            return ps.executeUpdate();

        }catch(SQLException e){
            e.printStackTrace();
            return -1;
        }
    }
    
    public List<UserData> grabAllInstructors(){
        String selectinstructors = "SELECT * FROM users WHERE role IN (?, ?) ";
        List<UserData> instructorList = new ArrayList<>();

        try(Connection conn = getConnection();
        PreparedStatement ps = conn.prepareStatement(selectinstructors)){
            ps.setString(1,"instructor");
            ps.setString(2,"admin");
            try(ResultSet rs = ps.executeQuery()){
                while(rs.next()){
                    instructorList.add(new UserData(
                        rs.getString("username"),
                        rs.getString("firstname"),
                        rs.getString("lastname"),
                        rs.getString("email"),
                        rs.getString("role"),
                        rs.getString("note"),
                        rs.getString("unique_id")
                    ));
                }
            }
        }catch(SQLException e){
            e.printStackTrace();
        }
        return instructorList;
    }

    public List<UserData> grabAllUsernames(){
        String selectusers = "SELECT * FROM users ORDER BY username ";

        List<UserData> userList = new ArrayList<>();

        try(Connection conn = getConnection();
        PreparedStatement ps = conn.prepareStatement(selectusers)){
            try(ResultSet rs = ps.executeQuery()){
                while(rs.next()){
                    userList.add(new UserData(
                        rs.getString("username"),
                        rs.getString("firstname"),
                        rs.getString("lastname"),
                        rs.getString("email"),
                        rs.getString("role"),
                        rs.getString("note"),
                        rs.getString("unique_id")
                    ));
                }
            }
        }catch(SQLException e){
            e.printStackTrace();
        }
        return userList;
    }
    

    /** Load all units + videos for a given course_id */
    private List<UnitData> selectUnitsForCourse(Connection conn, int courseId) throws SQLException {
        List<UnitData> units = new ArrayList<>();
        String unitSql = "SELECT unit_id, course_id, title, sort_order FROM course_units " +
                         "WHERE course_id = ? ORDER BY sort_order";
        try (PreparedStatement ps = conn.prepareStatement(unitSql)) {
            ps.setInt(1, courseId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int unitId = rs.getInt("unit_id");
                    List<VideoData> videos = selectVideosForUnit(conn, unitId);
                    units.add(new UnitData(
                        unitId,
                        rs.getInt("course_id"),
                        rs.getString("title"),
                        rs.getInt("sort_order"),
                        videos
                    ));
                }
            }
        }
        return units;
    }

    /** Load all videos for a given unit_id */
    private List<VideoData> selectVideosForUnit(Connection conn, int unitId) throws SQLException {
        List<VideoData> videos = new ArrayList<>();
        String sql = "SELECT video_id, unit_id, title, drive_url, duration, sort_order " +
                     "FROM unit_videos WHERE unit_id = ? ORDER BY sort_order";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, unitId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    videos.add(new VideoData(
                        rs.getInt("video_id"),
                        rs.getInt("unit_id"),
                        rs.getString("title"),
                        rs.getString("drive_url"),
                        rs.getString("duration"),
                        rs.getInt("sort_order")
                    ));
                }
            }
        }
        return videos;
    }

    /** Build a CourseData from a ResultSet row (connection still open) */
    // private CourseData courseFromRow(Connection conn, ResultSet rs) throws SQLException {
    //     int courseId = rs.getInt("course_id");
    //     return new CourseData(
    //         courseId,
    //         rs.getString("title"),
    //         rs.getString("description"),
    //         rs.getString("instructor"),
    //         rs.getString("times"),
    //         rs.getString("start_date"),
    //         rs.getString("level"),
    //         rs.getString("price"),
    //         rs.getString("thumbnail"),
    //         rs.getString("live_url"),
    //         rs.getBoolean("in_session"),
    //         selectUnitsForCourse(conn, courseId)
    //     );
    // }
    // "SELECT m.msg_id, m.subject, m.message, " +
    //         "m.upvote AS message_upvote, m.downvote, m.unique_id AS your_uuid, " +
    //         "c.comment_id, c.comment, c.upvote AS comment_upvote, c.unique_id AS comment_unique_id, " +
    //         "f.filepath AS file_path, u.username AS your_username, cu.username AS comment_username " +
    //         "FROM messages m " +
    //         "LEFT JOIN comments c ON m.msg_id = c.msg_id " +
    //         "LEFT JOIN files f ON m.msg_id = f.msg_id " +
    //         "LEFT JOIN users u ON m.unique_id = u.unique_id " +
    //         "LEFT JOIN users cu ON c.unique_id = cu.unique_id " +
    //         "ORDER BY m.msg_id DESC";

    /** GET /courses — all courses */
    public List<CourseData> selectAllCourses() {
        // List<CourseData> res = new ArrayList<>();
        Map<Integer, CourseData> courseMap = new LinkedHashMap<>();
        Map<Integer, UnitData> unitMap = new HashMap<>();

        String sql = "SELECT " +
            "c.course_id AS c_id, c.title AS c_title, c.description, c.instructor, c.times, " +
            "c.start_date, c.level, c.price, c.thumbnail, c.live_url, c.in_session, " +
            "cu.unit_id AS u_id, cu.title AS u_title, cu.sort_order AS u_sort, " +
            "uv.video_id AS v_id, uv.title AS v_title, uv.drive_url, uv.duration, uv.sort_order AS v_sort " +
            "FROM courses c " +
            "LEFT JOIN course_units cu ON c.course_id = cu.course_id " +
            "LEFT JOIN unit_videos uv ON uv.unit_id = cu.unit_id " +
            "ORDER BY c.course_id, cu.sort_order, uv.sort_order";

        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql);
            ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                while (rs.next()) {
                    int courseId = rs.getInt("c_id");

                    CourseData course = courseMap.get(courseId);

                    if (course == null) {
                        course = new CourseData(
                            courseId,
                            rs.getString("c_title"),
                            rs.getString("description"),
                            rs.getString("instructor"),
                            rs.getString("times"),
                            rs.getString("start_date"),
                            rs.getString("level"),
                            rs.getString("price"),
                            rs.getString("thumbnail"),
                            rs.getString("live_url"),
                            rs.getBoolean("in_session"),
                            new ArrayList<>()
                        );
                        courseMap.put(courseId, course);
                    }
                    //int unitId = rs.getInt("u_id");
                    Integer unitId = (Integer) rs.getObject("u_id");
                    if (unitId != null) {

                        UnitData unit = unitMap.get(unitId);

                        if (unit == null) {
                            unit = new UnitData(
                                unitId,
                                courseId,
                                rs.getString("u_title"),
                                rs.getInt("u_sort"),
                                new ArrayList<>()
                            );

                            unitMap.put(unitId, unit);
                            course.getUnits().add(unit);
                        }

                        //int videoId = rs.getInt("v_id");
                        Integer videoId = (Integer) rs.getObject("v_id");
                        if (videoId != null) {
                            unit.getVideos().add(
                                new VideoData(
                                    videoId,
                                    unitId,
                                    rs.getString("v_title"),
                                    rs.getString("drive_url"),
                                    rs.getString("duration"),
                                    rs.getInt("v_sort")
                                )
                            );
                        }
                    }
                }

            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return new ArrayList<>(courseMap.values());
    }
    public CourseData selectCourse(int courseId) {
        CourseData course = null;
        Map<Integer, UnitData> unitMap = new HashMap<>();

        String sql =
            "SELECT " +
            "c.course_id AS c_id, c.title AS c_title, c.description, c.instructor, c.times, " +
            "c.start_date, c.level, c.price, c.thumbnail, c.live_url, c.in_session, " +
            "cu.unit_id AS u_id, cu.title AS u_title, cu.sort_order AS u_sort, " +
            "uv.video_id AS v_id, uv.title AS v_title, uv.drive_url, uv.duration, uv.sort_order AS v_sort " +
            "FROM courses c " +
            "LEFT JOIN course_units cu ON c.course_id = cu.course_id " +
            "LEFT JOIN unit_videos uv ON uv.unit_id = cu.unit_id " +
            "WHERE c.course_id = ? " +
            "ORDER BY cu.sort_order, uv.sort_order";

        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, courseId);

            try (ResultSet rs = ps.executeQuery()) {

                while (rs.next()) {
                    if (course == null) {
                        course = new CourseData(
                            courseId,
                            rs.getString("c_title"),
                            rs.getString("description"),
                            rs.getString("instructor"),
                            rs.getString("times"),
                            rs.getString("start_date"),
                            rs.getString("level"),
                            rs.getString("price"),
                            rs.getString("thumbnail"),
                            rs.getString("live_url"),
                            rs.getBoolean("in_session"),
                            new ArrayList<>()
                        );
                    }

                    Integer unitId = (Integer) rs.getObject("u_id");

                    if (unitId != null) {

                        UnitData unit = unitMap.get(unitId);

                        if (unit == null) {
                            unit = new UnitData(
                                unitId,
                                courseId,
                                rs.getString("u_title"),
                                rs.getInt("u_sort"),
                                new ArrayList<>()
                            );

                            unitMap.put(unitId, unit);
                            course.getUnits().add(unit);
                        }
                        Integer videoId = (Integer) rs.getObject("v_id");

                        if (videoId != null) {
                            unit.getVideos().add(
                                new VideoData(
                                    videoId,
                                    unitId,
                                    rs.getString("v_title"),
                                    rs.getString("drive_url"),
                                    rs.getString("duration"),
                                    rs.getInt("v_sort")
                                )
                            );
                        }
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        return course;
    }


    /** GET /courses/enrolled/{uuid} — courses the user is enrolled in */
    public List<CourseData> selectEnrolledCourses(String uuid) {
        List<CourseData> courses = new ArrayList<>();

        Map<Integer, CourseData> courseMap = new LinkedHashMap<>();
        Map<Integer, UnitData> unitMap = new HashMap<>();

        String sql =
            "SELECT " +
            "c.course_id AS c_id, c.title AS c_title, c.description, c.instructor, c.times, " +
            "c.start_date, c.level, c.price, c.thumbnail, c.live_url, c.in_session, " +
            "cu.unit_id AS u_id, cu.title AS u_title, cu.sort_order AS u_sort, " +
            "uv.video_id AS v_id, uv.title AS v_title, uv.drive_url, uv.duration, uv.sort_order AS v_sort " +
            "FROM courses c " +
            "JOIN enrollments e ON c.course_id = e.course_id " +
            "LEFT JOIN course_units cu ON c.course_id = cu.course_id " +
            "LEFT JOIN unit_videos uv ON uv.unit_id = cu.unit_id " +
            "WHERE e.unique_id = ? " +
            "ORDER BY e.enrolled_at, cu.sort_order, uv.sort_order";

        try (Connection conn = getConnection();
            PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, uuid);
            try (ResultSet rs = ps.executeQuery()) {

                while (rs.next()) {

                    int courseId = rs.getInt("c_id");
                    CourseData course = courseMap.get(courseId);
                    if (course == null) {

                        course = new CourseData(
                            courseId,
                            rs.getString("c_title"),
                            rs.getString("description"),
                            rs.getString("instructor"),
                            rs.getString("times"),
                            rs.getString("start_date"),
                            rs.getString("level"),
                            rs.getString("price"),
                            rs.getString("thumbnail"),
                            rs.getString("live_url"),
                            rs.getBoolean("in_session"),
                            new ArrayList<>()
                        );

                        courseMap.put(courseId, course);
                        courses.add(course);

                        unitMap.clear();
                    }

                    Integer unitId = (Integer) rs.getObject("u_id");

                    if (unitId != null) {

                        UnitData unit = unitMap.get(unitId);
                        if (unit == null) {

                            unit = new UnitData(
                                unitId,
                                courseId,
                                rs.getString("u_title"),
                                rs.getInt("u_sort"),
                                new ArrayList<>()
                            );
                            unitMap.put(unitId, unit);
                            course.getUnits().add(unit);
                        }
                        Integer videoId = (Integer) rs.getObject("v_id");
                        if (videoId != null) {

                            unit.getVideos().add(
                                new VideoData(
                                    videoId,
                                    unitId,
                                    rs.getString("v_title"),
                                    rs.getString("drive_url"),
                                    rs.getString("duration"),
                                    rs.getInt("v_sort")
                                )
                            );
                        }
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return courses;
    }


    /**
     * POST /courses/{id}/enroll — enroll a user.
     * Returns 1 on success, 0 if already enrolled, -1 on error.
     */
    public int enrollUser(int courseId, String uuid) {
        String sql = "INSERT INTO enrollments (unique_id, course_id) VALUES (?, ?) ON CONFLICT DO NOTHING";
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, uuid);
            ps.setInt(2, courseId);
            return ps.executeUpdate(); // 1 = inserted, 0 = already existed
        } catch (SQLException e) {
            e.printStackTrace();
            return -1;
        }
    }

    /**
     * DELETE /courses/{id}/enroll — unenroll a user.
     * Returns rows deleted (1) or 0 if not enrolled.
     */
    public int unenrollUser(int courseId, String uuid) {
        String sql = "DELETE FROM enrollments WHERE course_id = ? AND unique_id = ?";
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, courseId);
            ps.setString(2, uuid);
            return ps.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
            return -1;
        }
    }

    /** Returns true if the user is enrolled in the given course */
    public boolean isEnrolled(int courseId, String uuid) {
        String sql = "SELECT 1 FROM enrollments WHERE course_id = ? AND unique_id = ?";
        try (Connection conn = getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, courseId);
            ps.setString(2, uuid);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
    
}