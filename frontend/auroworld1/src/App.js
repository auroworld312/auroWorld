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
import { AccessibilityProvider } from './AccessibilityContext.js';
import { UserProvider } from './UserContext.js';

const GOOGLE_CLIENT_ID = "134970251770-d7nviqn0qn0p0qpll7ru770kf2ntqu1h.apps.googleusercontent.com"

function App() {
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
                <Route path="/signup" element={<Signup />}/>
                <Route path ="/resetpass" element={<ResetPassword />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/courses/:courseId" element={<CourseDetail />} />
              </Routes>
          </BrowserRouter>
        </UserProvider>
      </AccessibilityProvider>
    </GoogleOAuthProvider>
  );
}

export default App;