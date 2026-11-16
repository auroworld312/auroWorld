package auroWorld.backend;

import io.javalin.Javalin;
import io.javalin.http.Context;
import java.sql.Connection;
import java.util.Map;
import static auroWorld.backend.QuizApi.*;

/** Teaching membership grants scheduling, never ownership of shared materials. */
final class CourseMaterialGuards {
    private final QuizApi api;
    CourseMaterialGuards(QuizApi api) { this.api = api; }
    static Map<String,Object> target(Connection c, String type, long id) throws Exception {
        return switch(type) {
            case "course" -> one(c,"SELECT * FROM courses WHERE course_id=?",id);
            case "unit" -> one(c,"SELECT c.* FROM courses c JOIN course_units u ON u.course_id=c.course_id WHERE u.unit_id=?",id);
            case "lesson" -> one(c,"SELECT c.* FROM courses c JOIN course_units u ON u.course_id=c.course_id JOIN unit_lessons l ON l.unit_id=u.unit_id WHERE l.lesson_id=?",id);
            case "video" -> one(c,"SELECT c.* FROM courses c JOIN course_units u ON u.course_id=c.course_id JOIN unit_videos v ON v.unit_id=u.unit_id WHERE v.video_id=?",id);
            default -> throw new IllegalArgumentException();
        };
    }
    private void guard(Javalin app,String path,Check check) {
        app.before(path,ctx->{
            if (!java.util.Set.of("POST","PUT","DELETE","PATCH").contains(ctx.method().name())) return;
            api.handle(ctx,(c,u)->{check.run(ctx,c,u);return null;});
            if(ctx.statusCode()>=400) ctx.skipRemainingHandlers();
        });
    }
    static void owner(Connection c,User user,String type,long id) throws Exception {
        require(manage(user,target(c,type,id)),403,"Only the course owner or admin can edit shared course materials.");
    }
    private void single(Javalin app,String path,String type,String key) {
        guard(app,path,(ctx,c,u)->owner(c,u,type,id(ctx,key)));
    }
    private void pair(Javalin app,String path,String type) {
        guard(app,path,(ctx,c,u)->{
            String[] ids=ctx.body().split(",");require(ids.length==4,400,"Invalid reorder request.");
            var a=target(c,type,Long.parseLong(ids[0]));var b=target(c,type,Long.parseLong(ids[1]));
            require(manage(u,a) && manage(u,b),403,"Only the course owner or admin can reorder materials.");
            require(a.get("course_id").equals(b.get("course_id")),400,"Materials must belong to the same course.");
        });
    }
    void register(Javalin app) {
        single(app,"/edit/lesson/{lessonId}","lesson","lessonId");
        single(app,"/delete/lesson/{lessonId}","lesson","lessonId");
        single(app,"/edit/unit/{unitId}","unit","unitId");
        single(app,"/course_units/{id}","course","id");
        single(app,"/course_units/unit/{id}","unit","id");
        single(app,"/courses/edit/{cId}","course","cId");
        single(app,"/courses/{courseId}","course","courseId");
        single(app,"/delete/unit_videos/unit/{unitId}/lesson/{lessonId}/videoId/{videoId}","video","videoId");
        guard(app,"/unit_videos/unit/{id}/lesson/{lessonId}",(ctx,c,u)->{
            owner(c,u,"unit",id(ctx,"id"));owner(c,u,"lesson",id(ctx,"lessonId"));
            require(!rows(c,"SELECT 1 FROM unit_lessons WHERE lesson_id=? AND unit_id=?",id(ctx,"lessonId"),id(ctx,"id")).isEmpty(),400,"Lesson is not in this unit.");
        });
        guard(app,"/course/{courseId}/unit/{uId}/addlesson/{sortIndex}",(ctx,c,u)->{
            owner(c,u,"course",id(ctx,"courseId"));
            require(!rows(c,"SELECT 1 FROM course_units WHERE course_id=? AND unit_id=?",id(ctx,"courseId"),id(ctx,"uId")).isEmpty(),400,"Unit is not in this course.");
        });
        guard(app,"/delete/units/course/{cId}",(ctx,c,u)->{
            owner(c,u,"course",id(ctx,"cId"));
            for(String value:ctx.body().split(",")) {
                require(!rows(c,"SELECT 1 FROM course_units WHERE course_id=? AND unit_id=?",id(ctx,"cId"),Long.parseLong(value)).isEmpty(),400,"Unit is not in this course.");
            }
        });
        pair(app,"/swaplessons","lesson");pair(app,"/swapvideos","video");pair(app,"/course/{cId}/swapunits","unit");
    }
    interface Check { void run(Context ctx,Connection c,User user) throws Exception; }
}
