import { useEffect, useState } from 'react';
import { quizRequest } from './quizApi';
import { getCourseTimeValues } from './courseSchedule';
import { paymentLink } from './CourseEnrollment';
import './NextClass.css';

export function nextClass(courses, now = new Date()) {
    const sessions = [];
    for (const course of courses) {
        const [from, to] = getCourseTimeValues(course.times);
        const date = (course.startDate || '').slice(0, 10);
        if (!from || !to || from === to || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const first = new Date(`${date}T00:00:00`);
        if (Number.isNaN(first.getTime())) continue;
        const days = String(course.daysOfWeek || '').split(',').map(day => day.trim()).filter(day => /^[0-6]$/.test(day)).map(Number);
        const base = new Date(Math.max(first.getTime(), now.getTime()));
        base.setHours(0, 0, 0, 0);
        for (let offset = -1; offset <= 7; offset++) {
            const start = new Date(base);
            start.setDate(start.getDate() + offset);
            if (start < first || !days.includes(start.getDay())) continue;
            start.setHours(...from.split(':').map(Number), 0, 0);
            const end = new Date(start);
            end.setHours(...to.split(':').map(Number), 0, 0);
            if (to < from) end.setDate(end.getDate() + 1);
            if (end <= now) continue;
            sessions.push({ course, start, end, live: start <= now, url: paymentLink(course.liveUrl) });
            break;
        }
    }
    return sessions.sort((a, b) => Number(b.live) - Number(a.live) || a.start - b.start || Number(a.course.courseId) - Number(b.course.courseId))[0] || null;
}

export default function NextClass() {
    const [courses, setCourses] = useState(null);
    const [error, setError] = useState('');
    const [now, setNow] = useState(() => new Date());
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const result = await quizRequest('/calendar-courses');
                if (active) { setCourses(result); setError(''); setNow(new Date()); }
            } catch (err) { if (active) setError(err.message); }
        };
        load();
        const timer = setInterval(load, 60000);
        window.addEventListener('focus', load);
        return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load); };
    }, [revision]);
    const session = nextClass(courses || [], now);
    return <section className="next-class" aria-label="Your next class">
        <div className="next-class-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v5m10-5v5M3 11h18m-13 4h3m2 0h3m-8 3h3" /></svg></div>
        <span className="course-eyebrow">YOUR CLASSROOM</span>
        <h2>{session?.live ? 'Class in session' : 'Up next'}</h2>
        <p className="next-class-caption">Your next session across all enrolled courses.</p>
        {error ? <div role="alert"><p>Could not load your schedule.</p><button className="next-class-join" onClick={() => setRevision(value => value + 1)}>Try again</button></div>
            : courses === null ? <p role="status">Loading your schedule...</p>
            : !session ? <p className="next-class-empty">No upcoming scheduled classes. Your enrolled courses will appear here when a schedule is available.</p>
            : <>
                <div className="next-class-session">
                    <span className={`next-class-status${session.live ? ' is-live' : ''}`}>{session.live ? 'Live now' : 'Upcoming'}</span>
                    <h3>{session.course.title}</h3>
                    {session.course.instructor && <p>{session.course.instructor}</p>}
                    <div className="next-class-date">{session.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <strong>{session.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {session.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</strong>
                </div>
                {session.url ? <a className="next-class-join" href={session.url} target="_blank" rel="noopener noreferrer">{session.live ? 'Join Class' : 'Open Zoom Link'}<span aria-hidden="true"> ↗</span></a> : <button className="next-class-join" disabled>Link not available yet</button>}
                <p className="next-class-note">{session.url ? 'Opens the instructor’s meeting link in a new tab.' : 'The instructor has not added a valid Zoom Link yet.'}</p>
                <p className="next-class-note">Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
            </>}
    </section>;
}
