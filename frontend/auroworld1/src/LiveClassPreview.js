import { useEffect, useState } from 'react';
import { isCourseTime } from './courseSchedule';
import { courseDays } from './CourseEnrollment';
import './LiveClassPreview.css';

export default function LiveClassPreview({ course }) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    let meetingUrl = '';
    try {
        const url = new URL((course.liveUrl || '').trim());
        if (['https:', 'http:'].includes(url.protocol)) meetingUrl = url.href;
    } catch {}
    const scheduled = isCourseTime(course, now);
    const canJoin = scheduled && !!meetingUrl;
    return <section className="live-preview" aria-label="Live classroom">
        <div className="live-room-heading"><span className="live-room-eyebrow">LIVE CLASSROOM</span><span className={`live-room-status${scheduled ? ' is-current' : ''}`}><i aria-hidden="true" />{scheduled ? 'Scheduled session' : 'Outside class hours'}</span></div>
        <div className="live-room-stage">
            <div className="live-room-broadcast" aria-hidden="true"><span /><i /></div>
            <span className="live-room-stage-label">YOUR LIVE LEARNING SPACE</span>
            <h2>{course.title}</h2>
            {course.instructor && <p className="live-room-instructor">With {course.instructor}</p>}
            <p className="live-room-intro">Meet your instructor and join the conversation.</p>
            <button className="live-preview-join" disabled={!canJoin} onClick={() => {
                if (canJoin && isCourseTime(course, new Date())) window.open(meetingUrl, '_blank', 'noopener,noreferrer');
            }}>Join Class<span className="live-room-external" aria-hidden="true" /></button>
            <p className="live-preview-hint">{!meetingUrl ? 'Your instructor has not added a meeting link yet.' : scheduled ? 'Your meeting opens in a new tab.' : 'Available during your scheduled class hours.'}</p>
        </div>
        <div className="live-room-footer"><span className="live-room-footer-mark" aria-hidden="true" /><p>Video, audio and class chat are hosted in your instructor?s meeting room.</p></div>
    </section>;
}

export function RoomChatPreview({ course }) {
    return <section className="live-session-details" aria-label="Session details">
        <span className="live-room-eyebrow">YOUR SESSION</span>
        <h2>Class details</h2>
        <dl>
            {[
                ['Instructor', course?.instructor],
                ['Class days', courseDays(course?.daysOfWeek)],
                ['Class time', course?.times],
                ['Starts', course?.startDate],
            ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <p className="live-session-timezone">Times shown in your local time.</p>
        <div className="live-session-note"><h3>Before you join</h3><p>Have your microphone and headphones ready. You can manage your camera and audio in the meeting.</p></div>
    </section>;
}
