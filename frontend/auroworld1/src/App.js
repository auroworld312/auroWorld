import Settings from './Settings';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Posts from './posts.js'
import Courses from './courses.js'
import Login from './login.js'
import Signup from './signup.js'
import Profile from './profile.js'
import ResetPassword from './resetpass.js'
import { GoogleOAuthProvider } from '@react-oauth/google';
import Calendar from './Calendar.js';
import CourseDetail from './CourseDetail.js';
import QuizPage from './QuizPage.js';
import { AccessibilityProvider } from './AccessibilityContext.js';
import { UserProvider } from './UserContext.js';
import ReactGA from "react-ga4";
import { useEffect } from "react";
// import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = "134970251770-d7nviqn0qn0p0qpll7ru770kf2ntqu1h.apps.googleusercontent.com"

// const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')
// ReactGA.initialize('G-KJDT0BJZ61'); 

function App() {
  useEffect(() => {
      ReactGA.initialize("G-KJDT0BJZ61"); 
      ReactGA.send({
          hitType:'pageview',
          page:window.location.pathname,
          title:'App.js'
      })
  }, []);
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AccessibilityProvider>
        <UserProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/posts" element={<Posts />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/signup" element={<Signup />}/>
                <Route path ="/resetpass" element={<ResetPassword />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/courses/:courseId" element={<CourseDetail />} />
                <Route path="/quizzes/:quizId" element={<QuizPage />} />
              </Routes>
          </BrowserRouter>
        </UserProvider>
      </AccessibilityProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
