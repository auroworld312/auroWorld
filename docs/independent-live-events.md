# Live Classes

Independent events are available from /live-classes. New events have no course, lesson, offering or teacher association. Optional host name is display text. created_by is the authenticated creator ID for editing permissions.

Authenticated users browse titles, dates and optional hosts. POST /quiz-api/live-events/:id/register grants access to the description and link. DELETE of the same registration cancels only the requesting user's registration. Registration is idempotent and rejects ended/cancelled events. Course enrollment does not grant event access. Course content permissions remain unchanged.

Teachers create events; creators and Admin edit/delete. Cancelled events remain visible and editable but attendee links and new registration are disabled. Admin can manage all events. Deleting removes event registrations via FK cascade, never accounts or course content.

GET /live-events/catalog returns public summaries plus authorized detail fields and creation permission. GET /live-events returns only registered/managed events for personal Calendar and NextClass. All endpoints are under /quiz-api and require authentication. CRUD: POST /live-events; PUT/DELETE /live-events/:id. Time stored as timestamptz; browser timezone shown in editor and listings. Edit form validates start/end and HTTP(S) live URL. UI supports search, date filter, past events, All events/My events and retained input after errors.

Existing course schedules are preserved in Calendar. Legacy live_events.course_id remains nullable for compatibility; deleting its old course now clears association instead of deleting event. No accounts or old schedules are migrated/deleted. Startup applies additive schema and creates RLS-enabled registration table.

Manual test:
1. Teacher: Live Classes > Add event, use future date and a test https link. Save and reload; confirm same row. Edit title/time/link and reload.
2. Student without course enrollment: browse Live Classes, see title/time but no Details/Join. Register, see Details/Join and My events. Confirm Calendar date/time; click navigates Live Classes.
3. Cancel registration: details/link disappear and personal Calendar excludes event.
4. Teacher: cancel event via Edit checkbox; registered student sees Cancelled with no Join. Restore checkbox and save; Join returns. Delete with confirmation removes event.
5. Different teacher cannot edit original teacher's event. Admin can edit all. Search/date filters and dark theme should remain readable.
6. Confirm existing course enrollment still gates course materials.

Automated validation uses temporary database tables; no real test events or accounts are created.

Optional category and level labels are editable on events. Course Video entry applies only a removable level filter; sidebar entry shows all. These labels do not create course ownership or grant event access. Existing events remain uncategorized until edited.
