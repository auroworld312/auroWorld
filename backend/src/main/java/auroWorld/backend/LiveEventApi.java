package auroWorld.backend;

import com.google.gson.Gson;
import io.javalin.Javalin;
import io.javalin.http.Context;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import static auroWorld.backend.QuizApi.*;

/** Events are independent of teaching offerings and lessons. Course is an audience gate only. */
final class LiveEventApi {
    private final QuizApi api;
    LiveEventApi(QuizApi api) { this.api=api; }
    static boolean staff(User u) { return "admin".equals(u.role()) || "instructor".equals(u.role()); }
    static boolean editable(User u, Map<String,Object> event) {
        return "admin".equals(u.role()) || (staff(u) && u.id().equals(event.get("created_by")));
    }
    static List<Map<String,Object>> list(Connection c, User u, Long courseId) throws SQLException {
        var result=rows(c,"SELECT e.*,c.title AS course_title,EXISTS(SELECT 1 FROM live_event_registrations r WHERE r.event_id=e.id AND r.user_id=?) AS registered FROM live_events e LEFT JOIN courses c ON c.course_id=e.course_id WHERE (?::bigint IS NULL OR e.course_id=?) ORDER BY e.starts_at,e.id",u.id(),courseId,courseId);
        for(var row:result) {
            boolean edit=editable(u,row), registered=Boolean.TRUE.equals(row.get("registered"));
            row.put("can_edit",edit);
            if(!edit && !registered) { row.remove("description");row.remove("live_url"); }
            if(!edit && Boolean.TRUE.equals(row.get("cancelled")))row.remove("live_url");
            row.remove("created_by");
        }
        return result;
    }
    void register(Javalin app) {
        app.get("/quiz-api/live-events/catalog",ctx->api.handle(ctx,(c,u)->Map.of("can_create",staff(u),"events",list(c,u,null))));
        app.post("/quiz-api/live-events",ctx->api.handle(ctx,(c,u)->save(ctx,c,u,true)));
        app.post("/quiz-api/live-events/{eventId}/register",ctx->api.handle(ctx,(c,u)->registerEvent(c,u,id(ctx,"eventId"))));
        app.delete("/quiz-api/live-events/{eventId}/register",ctx->api.handle(ctx,(c,u)->{update(c,"DELETE FROM live_event_registrations WHERE event_id=? AND user_id=?",id(ctx,"eventId"),u.id());return Map.of("registered",false);}));
        app.get("/quiz-api/live-events",ctx->api.handle(ctx,(c,u)->list(c,u,null).stream().filter(e->Boolean.TRUE.equals(e.get("registered")) || Boolean.TRUE.equals(e.get("can_edit"))).toList()));
        app.get("/quiz-api/courses/{courseId}/live-events",ctx->api.handle(ctx,(c,u)->{
            long cid=id(ctx,"courseId");
            require(staff(u) || CourseScheduleApi.access(c,u,CourseScheduleApi.course(c,cid)),403,"Enroll in this course to view live events.");
            return Map.of("can_create",staff(u),"events",list(c,u,cid));
        }));
        app.post("/quiz-api/courses/{courseId}/live-events",ctx->api.handle(ctx,(c,u)->save(ctx,c,u,true)));
        app.put("/quiz-api/live-events/{eventId}",ctx->api.handle(ctx,(c,u)->save(ctx,c,u,false)));
        app.delete("/quiz-api/live-events/{eventId}",ctx->api.handle(ctx,(c,u)->{
            c.setAutoCommit(false);
            var e=one(c,"SELECT * FROM live_events WHERE id=? FOR UPDATE",id(ctx,"eventId"));
            require(editable(u,e),403,"Only the event creator or admin can delete this event.");
            update(c,"DELETE FROM live_events WHERE id=?",e.get("id"));c.commit();return Map.of("deleted",true);
        }));
    }
    static Object registerEvent(Connection c,User u,long eventId) throws SQLException {
        c.setAutoCommit(false);
        var event=one(c,"SELECT * FROM live_events WHERE id=? FOR UPDATE",eventId);
        require(!Boolean.TRUE.equals(event.get("cancelled")) && Instant.parse(event.get("ends_at").toString()).isAfter(Instant.now()),409,"This event is cancelled or has ended.");
        update(c,"INSERT INTO live_event_registrations(event_id,user_id) VALUES (?,?) ON CONFLICT DO NOTHING",eventId,u.id());
        c.commit();return Map.of("registered",true);
    }
    Object save(Context ctx,Connection c,User u,boolean create) throws Exception {
        require(staff(u),403,"Teacher or admin access required.");
        c.setAutoCommit(false);
        var existing=create?null:one(c,"SELECT * FROM live_events WHERE id=? FOR UPDATE",id(ctx,"eventId"));
        require(create || editable(u,existing),403,"Only the event creator or admin can edit this event.");
        Long cid=create?null:(existing.get("course_id")==null?null:((Number)existing.get("course_id")).longValue());
        var f=new Gson().fromJson(ctx.body(),Form.class);
        require(f!=null && f.title!=null && !f.title.isBlank() && f.title.length()<=200,400,"Enter an event title (up to 200 characters).");
        require(f.starts_at!=null && f.ends_at!=null,400,"Enter the event start and end times.");
        Instant start=Instant.parse(f.starts_at),end=Instant.parse(f.ends_at);
        require(end.isAfter(start) && !end.isAfter(start.plusSeconds(86400)),400,"Choose an end time after the start, within 24 hours.");
        String link=CourseScheduleApi.url(f.live_url);
        require(!link.isBlank(),400,"Enter a live link.");
        String description=Objects.toString(f.description,""),host=Objects.toString(f.host_name,"");
        require(description.length()<=5000 && host.length()<=200,400,"Description or host name is too long.");
        String category=Objects.toString(f.category,"").trim(),level=Objects.toString(f.level,"").trim();
        require(category.length()<=100 && level.length()<=100,400,"Category and level must be under 100 characters.");
        var result=create?one(c,"INSERT INTO live_events(course_id,title,description,host_name,starts_at,ends_at,live_url,created_by,cancelled,category,level) VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING *",cid,f.title.trim(),description,host,start,end,link,u.id(),f.cancelled,category,level):one(c,"UPDATE live_events SET title=?,description=?,host_name=?,starts_at=?,ends_at=?,live_url=?,cancelled=?,category=?,level=? WHERE id=? RETURNING *",f.title.trim(),description,host,start,end,link,f.cancelled,category,level,existing.get("id"));
        c.commit();return result;
    }
    static class Form { boolean cancelled; String title,description,host_name,starts_at,ends_at,live_url,category,level; }
}
