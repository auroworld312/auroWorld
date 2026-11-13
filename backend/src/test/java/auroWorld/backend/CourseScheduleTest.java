package auroWorld.backend;
import java.sql.*;
import java.time.Instant;
import java.lang.reflect.Proxy;
import java.util.Map;
import io.javalin.http.Context;
import junit.framework.TestCase;

public class CourseScheduleTest extends TestCase {
 public void testUnauthenticatedLegacyMutationIsStopped() throws Exception {
  var app=io.javalin.Javalin.create();
  new CourseMaterialGuards(new QuizApi(null,ctx->{throw new QuizApi.Fault(401,"Login required");})).register(app);
  app.put("/edit/lesson/{lessonId}",ctx->ctx.result("MUTATED"));
  app.start(0);
  try {
   var request=java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://localhost:"+app.port()+"/edit/lesson/1")).PUT(java.net.http.HttpRequest.BodyPublishers.ofString("{}")).build();
   var response=java.net.http.HttpClient.newHttpClient().send(request,java.net.http.HttpResponse.BodyHandlers.ofString());
   assertEquals(401,response.statusCode());assertFalse(response.body().contains("MUTATED"));
  } finally {app.stop();}
 }
 public void testUrlAndTimeValidation() {
  assertEquals(90L,CourseScheduleApi.durationMinutes(Map.of("times","9:00 PM - 10:30 PM")));
  assertEquals(120L,CourseScheduleApi.durationMinutes(Map.of("times","11:00 PM - 1:00 AM")));
  assertEquals("https://example.com/room",CourseScheduleApi.url("https://example.com/room"));
  for(String value:new String[]{"javascript:alert(1)","https://name:pass@example.com"}) {
   try{CourseScheduleApi.url(value);fail("Unsafe URL accepted");}catch(QuizApi.Fault expected){}
  }
  try{CourseScheduleApi.dates(Instant.parse("2026-01-01T12:00:00Z"),Instant.parse("2026-01-01T11:00:00Z"));fail();}catch(QuizApi.Fault expected){}
 }
 static Context context(String body,Map<String,String> params) {
  return (Context)Proxy.newProxyInstance(Context.class.getClassLoader(),new Class[]{Context.class},(p,m,a)-> switch(m.getName()){case "body" -> body;case "pathParam" -> params.get((String)a[0]);default -> throw new UnsupportedOperationException(m.getName());});
 }
 public void testIsolatedScheduleGenerationPermissionsAndCascade() throws Exception {
  String uri=System.getenv("QUIZ_TEST_DATABASE_URI");if(uri==null){System.out.println("Schedule DB test requires QUIZ_TEST_DATABASE_URI");return;}
  try(var c=DriverManager.getConnection(uri);var st=c.createStatement()) {
   st.execute("CREATE TEMP TABLE users(username varchar PRIMARY KEY,role text)");
   st.execute("CREATE TEMP TABLE courses(course_id integer PRIMARY KEY,instructor text,title text)");
   st.execute("CREATE TEMP TABLE course_units(unit_id integer PRIMARY KEY,course_id integer,title text,sort_order integer)");
   st.execute("CREATE TEMP TABLE unit_lessons(lesson_id integer PRIMARY KEY,unit_id integer,lesson_title text,sort_order integer)");
   st.execute("CREATE TEMP TABLE enrollments(course_id integer,unique_id text)");
   String schema=new String(getClass().getResourceAsStream("/course-schedule-schema.sql").readAllBytes(),java.nio.charset.StandardCharsets.UTF_8).replace("\uFEFF","").replace("CREATE TABLE IF NOT EXISTS","CREATE TEMP TABLE");
   for(String sql:schema.split(";"))if(!sql.isBlank())st.execute(sql);
   st.execute("INSERT INTO users VALUES ('owner','instructor'),('teacherB','instructor'),('student','user')");
   st.execute("INSERT INTO courses VALUES(1,'owner','French'),(2,'teacherB','Other')");
   st.execute("INSERT INTO course_units VALUES(1,1,'Unit',1),(2,2,'Other',1)");
   st.execute("INSERT INTO unit_lessons VALUES(1,1,'Lesson 1',1),(2,1,'Lesson 2',2),(3,2,'Other lesson',1)");
   st.execute("INSERT INTO course_teachers VALUES(1,'teacherB')");
   var api=new CourseScheduleApi(null);var owner=new QuizApi.User("owner-id","owner","instructor");
   String body="{\"teacher\":\"owner\",\"live_url\":\"https://example.com\",\"timezone\":\"America/New_York\",\"start_date\":\"2026-11-01\",\"weekly_slots\":[{\"day\":7,\"start\":\"10:00\",\"end\":\"11:00\"},{\"day\":3,\"start\":\"18:00\",\"end\":\"19:00\"}],\"lesson_ids\":[1]}";
   var o=(Map<?,?>)api.saveOffering(context(body,Map.of("courseId","1")),c,new QuizApi.User("b","teacherB","instructor"),true);
   assertEquals(2,QuizApi.rows(c,"SELECT * FROM course_sessions").size());
   assertEquals("teacherB",o.get("teacher"));
   assertEquals("2026-11-04T23:00:00Z",QuizApi.rows(c,"SELECT starts_at FROM course_sessions ORDER BY starts_at").get(1).get("starts_at"));
   assertEquals("2026-11-01T15:00:00Z",QuizApi.rows(c,"SELECT starts_at FROM course_sessions ORDER BY starts_at").get(0).get("starts_at"));
   try{api.saveOffering(context(body,Map.of("courseId","1")),c,new QuizApi.User("s","student","user"),true);fail("Student managed schedule");}catch(QuizApi.Fault expected){c.rollback();}
   try{api.saveOffering(context(body.replace("2026-11-01","bad-date"),Map.of("courseId","1")),c,owner,true);fail("Invalid date accepted");}catch(java.time.DateTimeException expected){c.rollback();}
   assertEquals(1,QuizApi.rows(c,"SELECT * FROM course_offerings").size());
   try{api.saveSession(context("{}",Map.of("offeringId",o.get("id").toString())),c,new QuizApi.User("s","student","user"),true);fail("Student created session");}catch(QuizApi.Fault expected){c.rollback();}
   var session=QuizApi.rows(c,"SELECT * FROM course_sessions ORDER BY id").get(0);
   var teaching=new QuizApi.User("b","teacherB","instructor");
   String edit="{\"lesson_id\":2,\"teacher\":\"teacherB\",\"live_url\":\"https://example.com/updated\",\"starts_at\":\"2026-11-02T15:00:00Z\",\"ends_at\":\"2026-11-02T16:00:00Z\"}";
   api.saveSession(context(edit,Map.of("sessionId",session.get("id").toString())),c,teaching,false);
   assertEquals("https://example.com/updated",QuizApi.one(c,"SELECT live_url FROM course_sessions WHERE id=?",session.get("id")).get("live_url"));
   try{api.saveSession(context(edit.replace("teacherB","owner"),Map.of("sessionId",session.get("id").toString())),c,teaching,false);fail("Teacher reassigned someone else");}catch(QuizApi.Fault expected){c.rollback();}

   // Joining is atomic: an invalid schedule must not leave a teaching membership behind.
   st.execute("INSERT INTO users VALUES ('teacherC','instructor')");c.commit();
   var joining=new QuizApi.User("c","teacherC","instructor");
   String join=body.replace("teacherB","teacherC");
   try{api.saveOffering(context(join.replace("10:00","bad-time"),Map.of("courseId","1")),c,joining,true,true);fail("Invalid join accepted");}catch(java.time.DateTimeException expected){c.rollback();}
   assertFalse(CourseScheduleApi.assigned(c,joining,1));
   api.saveOffering(context(join,Map.of("courseId","1")),c,joining,true,true);
   assertTrue(CourseScheduleApi.assigned(c,joining,1));
   assertFalse(QuizApi.manage(joining,CourseScheduleApi.course(c,1)));
   try{CourseMaterialGuards.owner(c,joining,"lesson",1);fail("Teaching membership edited shared materials");}catch(QuizApi.Fault expected){}
   CourseMaterialGuards.owner(c,owner,"lesson",1);
   try{api.saveOffering(context(join,Map.of("offeringId",o.get("id").toString())),c,joining,false);fail("Edited another teacher plan");}catch(QuizApi.Fault expected){c.rollback();}

   st.execute("INSERT INTO enrollments VALUES(1,'enrolled-student')");c.commit();
   assertEquals(4,CourseScheduleApi.calendarSessions(c,new QuizApi.User("enrolled-student","student","user")).size());
   assertEquals(0,CourseScheduleApi.calendarSessions(c,new QuizApi.User("not-enrolled","student2","user")).size());
   assertEquals(2,CourseScheduleApi.calendarSessions(c,joining).size());
   var events=new LiveEventApi(null);
   String eventBody="{\"title\":\"Conversation practice\",\"live_url\":\"https://example.com/event\",\"starts_at\":\"2099-11-20T15:00:00Z\",\"ends_at\":\"2099-11-20T16:00:00Z\"}";
   var event=(Map<?,?>)events.save(context(eventBody,Map.of("courseId","1")),c,owner,true);
   assertNull(event.get("course_id"));
   var attendee=new QuizApi.User("outsider","outsider","user");
   assertFalse(LiveEventApi.list(c,attendee,null).get(0).containsKey("live_url"));
   assertFalse(LiveEventApi.list(c,attendee,null).get(0).containsKey("description"));
   long eid=((Number)event.get("id")).longValue();
   LiveEventApi.registerEvent(c,attendee,eid);
   LiveEventApi.registerEvent(c,attendee,eid);
   assertEquals(1,QuizApi.rows(c,"SELECT * FROM live_event_registrations").size());
   assertEquals("https://example.com/event",LiveEventApi.list(c,attendee,null).get(0).get("live_url"));
   assertFalse(LiveEventApi.editable(joining,(Map<String,Object>)event));
   assertTrue(LiveEventApi.editable(new QuizApi.User("a","admin","admin"),(Map<String,Object>)event));
   try{events.save(context(eventBody,Map.of("eventId",event.get("id").toString())),c,joining,false);fail("Other teacher edited event");}catch(QuizApi.Fault expected){c.rollback();}
   events.save(context(eventBody.replace("Conversation practice","Updated event"),Map.of("eventId",event.get("id").toString())),c,owner,false);
   assertEquals("Updated event",LiveEventApi.list(c,owner,null).get(0).get("title"));
   events.save(context(eventBody.replace("Conversation practice","Cancelled").replace("{","{\"cancelled\":true,"),Map.of("eventId",event.get("id").toString())),c,owner,false);
   assertFalse(LiveEventApi.list(c,attendee,null).get(0).containsKey("live_url"));
   try{LiveEventApi.registerEvent(c,new QuizApi.User("new","new","user"),eid);fail("Cancelled registration allowed");}catch(QuizApi.Fault expected){c.rollback();}
   assertTrue(LiveEventApi.list(c,owner,null).get(0).containsKey("live_url"));
   // Event remains independent from teaching plans and curriculum.
   st.execute("DELETE FROM course_offerings");c.commit();assertEquals(0,QuizApi.rows(c,"SELECT * FROM course_sessions").size());assertEquals(3,QuizApi.rows(c,"SELECT * FROM unit_lessons").size());assertEquals(4,QuizApi.rows(c,"SELECT * FROM users").size());assertEquals(1,LiveEventApi.list(c,owner,null).size());
  }
 }
}
