package auroWorld.backend;

import com.google.gson.Gson;
import io.javalin.Javalin;
import io.javalin.http.Context;
import java.sql.*;
import java.time.*;
import java.net.URI;
import java.util.*;
import static auroWorld.backend.QuizApi.*;

/** Shared course content, independent teaching offerings and dated sessions. */
final class CourseScheduleApi {
    private final QuizApi api;
    private static final Gson JSON = new Gson();
    CourseScheduleApi(QuizApi api) { this.api = api; }
    static final String SESSION_SELECT = "SELECT s.*,o.course_id,o.title AS offering_title,c.title AS course_title,c.instructor AS course_owner,l.lesson_title AS lesson_title FROM course_sessions s JOIN course_offerings o ON o.id=s.offering_id JOIN courses c ON c.course_id=o.course_id JOIN unit_lessons l ON l.lesson_id=s.lesson_id ";
    static boolean assigned(Connection c, User u, long course) throws SQLException {
        return ("instructor".equals(u.role()) || "admin".equals(u.role())) && !rows(c,"SELECT 1 FROM course_teachers WHERE course_id=? AND username=?",course,u.username()).isEmpty();
    }
    static boolean access(Connection c, User u, Map<String,Object> course) throws SQLException {
        return manage(u,course) || assigned(c,u,((Number)course.get("course_id")).longValue()) || !rows(c,"SELECT 1 FROM enrollments WHERE course_id=? AND unique_id=?",course.get("course_id"),u.id()).isEmpty();
    }
    static Map<String,Object> course(Connection c,long id) throws SQLException { return one(c,"SELECT * FROM courses WHERE course_id=?",id); }
    static void teacher(Connection c,Map<String,Object> course,String name) throws SQLException {
        require(name!=null && !rows(c,"SELECT 1 FROM users WHERE username=? AND role IN ('instructor','admin')",name).isEmpty(),400,"Choose an existing teacher.");
        require(name.equals(course.get("instructor")) || !rows(c,"SELECT 1 FROM course_teachers WHERE course_id=? AND username=?",course.get("course_id"),name).isEmpty(),400,"Add this teacher to the course first.");
    }
    static String url(String value) {
        if(value==null || value.isBlank()) return "";
        require(value.length()<=2048,400,"Link is too long.");
        URI uri=URI.create(value.trim());
        require(("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())) && uri.getHost()!=null && uri.getUserInfo()==null,400,"Use a valid HTTP or HTTPS link.");
        return uri.toString();
    }
    static long durationMinutes(Map<String,Object> course) {
        String times=Objects.toString(course.get("times"), "");
        var matcher=java.util.regex.Pattern.compile("(\\d{1,2}):(\\d{2})\\s*(AM|PM)?",java.util.regex.Pattern.CASE_INSENSITIVE).matcher(times);
        var minutes=new ArrayList<Integer>();
        while(matcher.find()) {
            int hour=Integer.parseInt(matcher.group(1)),minute=Integer.parseInt(matcher.group(2));
            String period=matcher.group(3);
            if(minute>59 || hour>23)return 60;
            if(period!=null)hour=hour%12+(period.equalsIgnoreCase("PM")?12:0);
            minutes.add(hour*60+minute);
        }
        if(minutes.size()!=2)return 60;
        int duration=(minutes.get(1)-minutes.get(0)+1440)%1440;
        return duration==0?60:duration;
    }
    static void dates(Instant start,Instant end) { require(start!=null && end!=null && end.isAfter(start) && Duration.between(start,end).toHours()<=24,400,"End time must follow the start, within 24 hours."); }
    void register(Javalin app) {
        app.get("/quiz-api/course-live-status",ctx->api.handle(ctx,(c,u)->rows(c,"SELECT course_id,bool_or(owner_scheduled) AS owner_scheduled,bool_or(live) AS live FROM (SELECT o.course_id,bool_or(o.teacher=c.instructor) AS owner_scheduled,COALESCE(bool_or(s.starts_at<=now() AND s.ends_at>now() AND s.live_url<>''),false) AS live FROM course_offerings o JOIN courses c ON c.course_id=o.course_id LEFT JOIN course_sessions s ON s.offering_id=o.id GROUP BY o.course_id UNION ALL SELECT course_id,false AS owner_scheduled,bool_or(starts_at<=now() AND ends_at>now()) AS live FROM live_events GROUP BY course_id) status GROUP BY course_id")));
        app.get("/quiz-api/teaching-courses",ctx->api.handle(ctx,(c,u)->rows(c,"SELECT course_id FROM course_teachers WHERE username=?",u.username())));
        app.get("/quiz-api/courses/{courseId}/schedule",ctx->api.handle(ctx,(c,u)->{
            var course=course(c,id(ctx,"courseId")); boolean manager=manage(u,course); boolean allowed=access(c,u,course) || "instructor".equals(u.role());
            if(!allowed) return Map.of("can_access",false);
            var result=new LinkedHashMap<String,Object>();
            result.put("duration_minutes", durationMinutes(course));
            result.put("can_teach", "instructor".equals(u.role()) || "admin".equals(u.role())); result.put("joined",manage(u,course) || assigned(c,u,((Number)course.get("course_id")).longValue())); result.put("can_access",true); result.put("can_manage",manager); result.put("username",u.username());
            result.put("teachers",rows(c,"SELECT username FROM course_teachers WHERE course_id=? UNION SELECT instructor AS username FROM courses WHERE course_id=?",course.get("course_id"),course.get("course_id")));
            result.put("available_teachers",manager ? rows(c,"SELECT username FROM users WHERE role IN ('instructor','admin') ORDER BY lower(username)") : List.of());
            result.put("lessons",rows(c,"SELECT l.lesson_id,l.lesson_title AS title,u.title AS unit_title FROM unit_lessons l JOIN course_units u ON u.unit_id=l.unit_id WHERE u.course_id=? ORDER BY u.sort_order,l.sort_order,l.lesson_id",course.get("course_id")));
            result.put("offerings",rows(c,"SELECT * FROM course_offerings WHERE course_id=? ORDER BY id",course.get("course_id")));
            result.put("sessions",rows(c,SESSION_SELECT+"WHERE o.course_id=? ORDER BY s.starts_at,s.id",course.get("course_id")));
            result.put("choices",rows(c,"SELECT ch.session_id FROM course_session_choices ch JOIN course_sessions s ON s.id=ch.session_id JOIN course_offerings o ON o.id=s.offering_id WHERE o.course_id=? AND ch.user_id=?",course.get("course_id"),u.id()));
            return result;
        }));
        app.post("/quiz-api/courses/{courseId}/teachers",ctx->api.handle(ctx,(c,u)->{
            var course=course(c,id(ctx,"courseId")); require(manage(u,course),403,"Only the course owner or admin can assign teachers.");
            var f=JSON.fromJson(ctx.body(),Form.class); require(f!=null && f.teacher!=null,400,"Choose a teacher.");
            require(!rows(c,"SELECT 1 FROM users WHERE username=? AND role IN ('instructor','admin')",f.teacher).isEmpty(),400,"Choose an existing teacher.");
            update(c,"INSERT INTO course_teachers(course_id,username) VALUES (?,?) ON CONFLICT DO NOTHING",course.get("course_id"),f.teacher);return Map.of("saved",true);
        }));
        app.delete("/quiz-api/courses/{courseId}/teachers/{username}",ctx->api.handle(ctx,(c,u)->{
            c.setAutoCommit(false);var course=one(c,"SELECT * FROM courses WHERE course_id=? FOR UPDATE",id(ctx,"courseId")); require(manage(u,course),403,"Only the course owner or admin can remove teachers.");
            String name=ctx.pathParam("username"); require(!name.equals(course.get("instructor")),400,"The course owner cannot be removed here.");
            require(rows(c,"SELECT 1 FROM course_offerings WHERE course_id=? AND teacher=? UNION ALL SELECT 1 FROM course_sessions s JOIN course_offerings o ON o.id=s.offering_id WHERE o.course_id=? AND s.teacher=?",course.get("course_id"),name,course.get("course_id"),name).isEmpty(),409,"Reassign or delete this teacher's offerings and sessions first.");
            update(c,"DELETE FROM course_teachers WHERE course_id=? AND username=?",course.get("course_id"),name);c.commit(); return Map.of("deleted",true);
        }));
        app.post("/quiz-api/courses/{courseId}/join-teaching",ctx->api.handle(ctx,(c,u)->saveOffering(ctx,c,u,true,true)));
        app.post("/quiz-api/courses/{courseId}/offerings",ctx->api.handle(ctx,(c,u)->saveOffering(ctx,c,u,true)));
        app.put("/quiz-api/offerings/{offeringId}",ctx->api.handle(ctx,(c,u)->saveOffering(ctx,c,u,false)));
        app.delete("/quiz-api/offerings/{offeringId}",ctx->api.handle(ctx,(c,u)->{
            var o=one(c,"SELECT * FROM course_offerings WHERE id=?",id(ctx,"offeringId"));require(manage(u,course(c,((Number)o.get("course_id")).longValue())) || (assigned(c,u,((Number)o.get("course_id")).longValue()) && u.username().equals(o.get("teacher"))),403,"You can only delete your own teaching plan.");
            update(c,"DELETE FROM course_offerings WHERE id=?",o.get("id"));return Map.of("deleted",true);
        }));
        app.post("/quiz-api/offerings/{offeringId}/sessions",ctx->api.handle(ctx,(c,u)->saveSession(ctx,c,u,true)));
        app.put("/quiz-api/sessions/{sessionId}",ctx->api.handle(ctx,(c,u)->saveSession(ctx,c,u,false)));
        app.delete("/quiz-api/sessions/{sessionId}",ctx->api.handle(ctx,(c,u)->{
            var s=one(c,SESSION_SELECT+"WHERE s.id=?",id(ctx,"sessionId"));
            require(manage(u,course(c,((Number)s.get("course_id")).longValue())) || ("instructor".equals(u.role()) && u.username().equals(s.get("teacher")) && assigned(c,u,((Number)s.get("course_id")).longValue())),403,"You can only delete your own sessions.");
            update(c,"DELETE FROM course_sessions WHERE id=?",s.get("id"));return Map.of("deleted",true);
        }));
        app.post("/quiz-api/sessions/{sessionId}/calendar",ctx->api.handle(ctx,(c,u)->{
            var s=one(c,SESSION_SELECT+"WHERE s.id=?",id(ctx,"sessionId"));require(access(c,u,course(c,((Number)s.get("course_id")).longValue())),403,"Enroll before adding a session.");
            update(c,"INSERT INTO course_session_choices(session_id,user_id) VALUES (?,?) ON CONFLICT DO NOTHING",s.get("id"),u.id());return Map.of("saved",true);
        }));
        app.delete("/quiz-api/sessions/{sessionId}/calendar",ctx->api.handle(ctx,(c,u)->{update(c,"DELETE FROM course_session_choices WHERE session_id=? AND user_id=?",id(ctx,"sessionId"),u.id());return Map.of("deleted",true);}));
        app.get("/quiz-api/calendar-sessions",ctx->api.handle(ctx,(c,u)->calendarSessions(c,u)));
    }
    static List<Map<String,Object>> calendarSessions(Connection c,User u) throws SQLException {
        var result=rows(c,SESSION_SELECT+"WHERE (?='admin' OR s.teacher=? OR EXISTS(SELECT 1 FROM enrollments e WHERE e.course_id=o.course_id AND e.unique_id=?)) ORDER BY s.starts_at",u.role(),u.username(),u.id());
        for(var row:result)row.put("can_edit", "admin".equals(u.role()) || ("instructor".equals(u.role()) && (u.username().equals(row.get("teacher")) || u.username().equals(row.get("course_owner")))));
        return result;
    }
    Object saveOffering(Context ctx,Connection c,User u,boolean create) throws Exception { return saveOffering(ctx,c,u,create,false); }
    Object saveOffering(Context ctx,Connection c,User u,boolean create,boolean joining) throws Exception {
        c.setAutoCommit(false);
        var existing=create ? null : one(c,"SELECT * FROM course_offerings WHERE id=? FOR UPDATE",id(ctx,"offeringId"));
        long cid=create?id(ctx,"courseId"):((Number)existing.get("course_id")).longValue();
        var course=one(c,"SELECT * FROM courses WHERE course_id=? FOR UPDATE",cid);
        boolean manager=manage(u,course);
        require(manager || ("instructor".equals(u.role()) && (joining || (assigned(c,u,cid) && (create || u.username().equals(existing.get("teacher")))))),403,"You can only manage your own teaching plan.");
        var f=JSON.fromJson(ctx.body(),Form.class);require(f!=null,400,"Enter your live link and class times.");
        // The authenticated instructor is authoritative; clients cannot join as someone else.
        f.teacher=create?u.username():(String)existing.get("teacher");
        f.title=f.teacher;
        if(joining) {
            require("instructor".equals(u.role()) || "admin".equals(u.role()),403,"Teacher account required.");
            require(!assigned(c,u,cid),409,"You already teach this course. Edit your schedule instead.");
            require(!url(f.live_url).isEmpty(),400,"Add your live link before joining.");
            update(c,"INSERT INTO course_teachers(course_id,username) VALUES (?,?) ON CONFLICT DO NOTHING",cid,u.username());
        }
        require(manager || u.username().equals(f.teacher),403,"You can only manage your own schedule.");
        if(create && manager && !u.username().equals(course.get("instructor"))) update(c,"INSERT INTO course_teachers(course_id,username) VALUES (?,?) ON CONFLICT DO NOTHING",cid,u.username());
        teacher(c,course,f.teacher);
        ZoneId zone=ZoneId.of(f.timezone==null?"UTC":f.timezone);String link=url(f.live_url);
        var o=create?one(c,"INSERT INTO course_offerings(course_id,title,teacher,live_url,timezone) VALUES (?,?,?,?,?) RETURNING *",cid,f.title.trim(),f.teacher,link,zone.getId()):one(c,"UPDATE course_offerings SET title=?,teacher=?,live_url=?,timezone=? WHERE id=? RETURNING *",f.title.trim(),f.teacher,link,zone.getId(),existing.get("id"));
        if(!create) update(c,"UPDATE course_sessions SET live_url=? WHERE offering_id=? AND starts_at>now() AND live_url=?",link,o.get("id"),existing.get("live_url"));
        if(create) {
            require(f.start_date!=null && f.weekly_slots!=null && !f.weekly_slots.isEmpty(),400,"Choose a start date and at least one teaching day.");
            LocalDate first=LocalDate.parse(f.start_date);
            var slots=new TreeMap<Integer,WeeklySlot>();
            for(var slot:f.weekly_slots) {
                require(slot!=null && slot.day>=1 && slot.day<=7 && slot.start!=null,400,"Choose valid weekly class times.");
                LocalTime.parse(slot.start);
                require(slots.put(slot.day,slot)==null,400,"Choose each weekday once.");
            }
            var lessons=rows(c,"SELECT l.lesson_id FROM unit_lessons l JOIN course_units u ON u.unit_id=l.unit_id WHERE u.course_id=? ORDER BY u.sort_order,u.unit_id,l.sort_order,l.lesson_id",cid);
            require(!lessons.isEmpty(),400,"The course owner must add lessons before you can join.");
            int index=0;
            for(LocalDate date=first;index<lessons.size();date=date.plusDays(1)) {
                var slot=slots.get(date.getDayOfWeek().getValue());if(slot==null)continue;
                var localStart=date.atTime(LocalTime.parse(slot.start));var localEnd=localStart.plusMinutes(durationMinutes(course));
                require(!zone.getRules().getValidOffsets(localStart).isEmpty() && !zone.getRules().getValidOffsets(localEnd).isEmpty(),400,"A class falls in a daylight-saving gap. Choose another time.");
                Instant start=localStart.atZone(zone).toInstant(),end=localEnd.atZone(zone).toInstant();dates(start,end);
                update(c,"INSERT INTO course_sessions(offering_id,lesson_id,teacher,starts_at,ends_at,live_url) VALUES (?,?,?,?,?,?)",o.get("id"),lessons.get(index++).get("lesson_id"),f.teacher,start,end,link);
            }
        }
        c.commit();return o;
    }
    static void validateLesson(Connection c,long course,long lesson) throws SQLException { require(!rows(c,"SELECT 1 FROM unit_lessons l JOIN course_units u ON u.unit_id=l.unit_id WHERE l.lesson_id=? AND u.course_id=?",lesson,course).isEmpty(),400,"Choose a lesson from this course."); }
    Object saveSession(Context ctx,Connection c,User u,boolean create) throws Exception {
        c.setAutoCommit(false);
        var existing=create?null:one(c,"SELECT * FROM course_sessions WHERE id=? FOR UPDATE",id(ctx,"sessionId"));
        var o=one(c,"SELECT * FROM course_offerings WHERE id=?",create?id(ctx,"offeringId"):existing.get("offering_id"));long cid=((Number)o.get("course_id")).longValue();
        var course=one(c,"SELECT * FROM courses WHERE course_id=? FOR UPDATE",cid);boolean manager=manage(u,course);
        require(manager || ("instructor".equals(u.role()) && assigned(c,u,cid) && u.username().equals(create?o.get("teacher"):existing.get("teacher"))),403,"You can only edit your own sessions.");
        var f=JSON.fromJson(ctx.body(),Form.class);require(f!=null,400,"Enter session details.");teacher(c,course,f.teacher);require(manager || u.username().equals(f.teacher),403,"Only the owner or admin can reassign teachers.");
        validateLesson(c,cid,f.lesson_id);require(f.starts_at!=null,400,"Choose a start time.");Instant start=Instant.parse(f.starts_at),end=start.plusSeconds(durationMinutes(course)*60);dates(start,end);String link=url(f.live_url);
        var result=create?one(c,"INSERT INTO course_sessions(offering_id,lesson_id,teacher,starts_at,ends_at,live_url) VALUES (?,?,?,?,?,?) RETURNING *",o.get("id"),f.lesson_id,f.teacher,start,end,link):one(c,"UPDATE course_sessions SET lesson_id=?,teacher=?,starts_at=?,ends_at=?,live_url=? WHERE id=? RETURNING *",f.lesson_id,f.teacher,start,end,link,existing.get("id"));c.commit();return result;
    }
    static class WeeklySlot { int day; String start,end; }
    static class Form { String start_date; List<WeeklySlot> weekly_slots; String title,teacher,live_url,timezone,local_start,starts_at,ends_at;long lesson_id;List<Long> lesson_ids;int interval_days=7,duration_minutes=60; }
}
