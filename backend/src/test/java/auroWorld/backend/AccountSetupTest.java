package auroWorld.backend;
import java.sql.*;
import junit.framework.TestCase;

public class AccountSetupTest extends TestCase {
 public void testSetupResponseWithoutJackson() throws Exception {
  var app=io.javalin.Javalin.create().start(0);
  try {
   app.post("/setup",ctx -> QuizApi.accountSetupResponse(ctx, java.util.Map.of("ready",true)));
   var request=java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://localhost:"+app.port()+"/setup")).POST(java.net.http.HttpRequest.BodyPublishers.ofString("{}")).build();
   var response=java.net.http.HttpClient.newHttpClient().send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
   assertEquals(200,response.statusCode());
   assertTrue(response.headers().firstValue("content-type").orElse("").contains("application/json"));
   var result=com.google.gson.JsonParser.parseString(response.body()).getAsJsonObject();
   assertEquals("ok",result.get("mStatus").getAsString());
   assertTrue(result.getAsJsonObject("mData").get("ready").getAsBoolean());
  } finally {app.stop();}
 }
 public void testInitializationPreservesIdentityAndRoles() throws Exception {
  String uri=System.getenv("QUIZ_TEST_DATABASE_URI");
  if(uri==null){System.out.println("Account integration test requires QUIZ_TEST_DATABASE_URI.");return;}
  try(var c=DriverManager.getConnection(uri)) {
   // Temporary tables shadow production names and disappear when this connection closes.
   try(var st=c.createStatement()) {
    st.execute("CREATE TEMP TABLE users(username text PRIMARY KEY,email text NOT NULL,unique_id text,role text)");
    st.execute("CREATE TEMP TABLE profile_attributes(uuid text PRIMARY KEY,email text NOT NULL,username text,role text)");
   }
   var person=new QuizApi.AuthUser("new-user", "new@example.test");
   assertFalse(QuizApi.initializeAccount(c,person,null).get("ready"));
   assertTrue(QuizApi.initializeAccount(c,person,new QuizApi.SetupAccount("new_user","instructor")).get("ready"));
   assertTrue(QuizApi.initializeAccount(c,person,new QuizApi.SetupAccount("different","admin")).get("ready"));
   try(var st=c.createStatement();var r=st.executeQuery("SELECT count(*),min(role),min(username) FROM users")){r.next();assertEquals(1,r.getInt(1));assertEquals("instructor",r.getString(2));assertEquals("new_user",r.getString(3));}
   reject(c,new QuizApi.AuthUser("other","other@example.test"),new QuizApi.SetupAccount("other_user","admin"));
   reject(c,new QuizApi.AuthUser("other","new@example.test"),new QuizApi.SetupAccount("other_user","user"));
   reject(c,new QuizApi.AuthUser("new-user","wrong@example.test"),null);
   reject(c,new QuizApi.AuthUser("other","other@example.test"),new QuizApi.SetupAccount("NEW_USER","user"));
   try(var st=c.createStatement()){st.execute("INSERT INTO users VALUES('duplicate','duplicate@example.test','new-user','user')");c.commit();}
   reject(c,person,null);
   // A failed profile insert must roll back the corresponding users insert.
   try(var st=c.createStatement()){st.execute("ALTER TABLE profile_attributes ADD CONSTRAINT reject_test CHECK(username <> 'rollback_user')");c.commit();}
   reject(c,new QuizApi.AuthUser("rollback","rollback@example.test"),new QuizApi.SetupAccount("rollback_user","user"));
   try(var st=c.createStatement();var r=st.executeQuery("SELECT count(*) FROM users WHERE unique_id='rollback'")){r.next();assertEquals(0,r.getInt(1));}
  }
 }
 private void reject(Connection c,QuizApi.AuthUser user,QuizApi.SetupAccount body) throws Exception {
  try {QuizApi.initializeAccount(c,user,body);fail("Expected account setup to reject ambiguous or invalid data");}
  catch(RuntimeException | SQLException expected) {c.rollback();}
 }
}
