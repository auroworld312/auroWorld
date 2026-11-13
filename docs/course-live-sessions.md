# Parallel teachers for a shared course

Teachers browse all courses. In Course, choose Become an instructor and submit your own live link, start date, weekly teaching days and a start/end time for each day. Your account is used automatically, and the browser supplies the time zone. All shared lessons are scheduled in curriculum order, one lesson per selected class date. Membership and the initial schedule save atomically. The owner must first create the shared lessons.

## Permissions and editing

- The course owner and Admin maintain the course, Units, Lessons, videos and Quizzes. This is enforced on the server as well as in the UI.
- Joined teachers manage their own teaching schedules and sessions through Course > Teaching schedule. They cannot change another teacher's plan or shared materials.
- Owners and Admin can manage every teaching schedule in the course. Existing team assignment APIs remain for compatibility.
- Edit a plan to change defaults for future sessions; edit individual sessions to change already scheduled times, teachers or links.
- Delete confirmation explains that deleting a plan also removes its sessions. Accounts, shared lessons and quizzes are preserved.

## Student experience

Enroll once in the course. Video retains its classroom view; Choose a live class opens a teacher selection view with teacher, lesson, class time and link. Ongoing sessions show first; Show upcoming classes includes future sessions. Unenrolled students remain on Course information.

All teachers' dated sessions appear automatically in an enrolled student's Calendar, together with shared quiz deadlines. Teachers see their own dated sessions. Legacy course-owner times and links remain until the owner has an explicit teaching schedule. Dated sessions do not repeat indefinitely. Post-term behavior is deferred.

## Data and checks

Backend startup applies course-schedule-schema.sql additively and transactionally. Its tables have RLS enabled and are accessed through the authenticated Java API. No existing accounts are merged or deleted. Restart the backend alongside the frontend update.

CourseScheduleTest uses connection-local temporary tables to check joins, rollback, shared-material permissions, cross-course lesson rejection, schedule generation and deletion preservation. Frontend tests cover teacher controls, student selection and exact-date Calendar/NextClass behavior.

## Teacher directory and calendar

Course and Video show a persistent teacher directory, including when no class is live. Future class cards are only shown in Calendar. Clicking a calendar class opens Video; authorized instructors can edit/delete individual classes through Edit class in the calendar list. End times are derived from the original course duration (60 minutes for legacy courses without a readable duration). New weekly schedules only ask for start times. Updating an instructor link updates future classes that still use the previous default link.
