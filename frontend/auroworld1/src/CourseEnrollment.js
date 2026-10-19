export function paymentLink(value) {
    try {
        const url = new URL(value);
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
}

export function courseDays(value) {
    const days = [...new Set((value || '').split(',').map(day => day.trim()).filter(day => /^[0-6]$/.test(day)))].sort();
    if (days.length === 7) return 'Every day';
    if (days.join(',') === '1,2,3,4,5') return 'Weekdays';
    if (days.join(',') === '0,6') return 'Weekend';
    return days.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(day)]).join(', ');
}

export function CourseOverview({ course }) {
    return <div className="course-overview">
        <span className="course-eyebrow">ABOUT THIS COURSE</span>
        <h2>{course.title}</h2>
        {course.level && <span className="course-level-badge">{course.level}</span>}
        {course.description && <section className="course-description-box"><h3>Course overview</h3><p>{course.description}</p></section>}
        <dl className="course-facts">
            {[
                ['Instructor', course.instructor],
                ['Class days', courseDays(course.daysOfWeek)],
                ['Class time', course.times],
                ['Start date', course.startDate],
            ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
    </div>;
}

export default function CourseEnrollment({ course, enrolled, enrolling, onEnroll, isOwner }) {
    const free = course.price === 'Free';
    const url = paymentLink(course.paymentUrl);
    const lessons = (course.units || []).reduce((sum, unit) => sum + (unit.lessons?.length || 0), 0);
    return <section className="course-enrollment" aria-label="Course enrollment">
        {course.thumbnail && <img className="course-enrollment-cover" src={course.thumbnail} alt={course.title} />}
        <div className="course-enrollment-content">
            <span className="course-eyebrow">{free ? 'FREE COURSE' : 'PAID COURSE'}</span>
            <h3>{free ? 'Free' : 'Join this course'}</h3>
            {isOwner ? <div className="course-enrollment-state">Your course</div> : enrolled ? <div className="course-enrollment-state" role="status">Already Enrolled</div> : free ?
                <button className="course-purchase" onClick={onEnroll} disabled={enrolling}>{enrolling ? 'Enrolling...' : 'Enroll Now'}</button> :
                url ? <a className="course-purchase" href={url} target="_blank" rel="noopener noreferrer"><img src="/assets/courses/payment.svg" alt="" />Purchase Now</a> :
                <button className="course-purchase" disabled>Payment unavailable</button>}
            {!free && !enrolled && !isOwner && <p className="course-payment-note">{url ? 'Continue to the instructor’s payment page. Payment does not automatically enroll you yet.' : 'The instructor has not added a payment link yet.'}</p>}
            <dl className="course-enrollment-facts">
                {course.level && <div><dt>Level</dt><dd>{course.level}</dd></div>}
                <div><dt>Units</dt><dd>{course.units?.length || 0}</dd></div>
                <div><dt>Lessons</dt><dd>{lessons}</dd></div>
                {course.startDate && <div><dt>Starts</dt><dd>{course.startDate}</dd></div>}
            </dl>
        </div>
    </section>;
}
