const COURSE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => ({ value: `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 === 0 ? '00' : '30'}` }));

export function getCourseTimeValues(times) {
    const matches = [...(times || '').matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi)];
    if (matches.length !== 2) return ['', ''];
    return matches.map(([, hour, minute = '00', period]) => {
        if (Number(hour) < 1 || Number(hour) > 12) return '';
        const value = `${String(Number(hour) % 12 + (period.toUpperCase() === 'PM' ? 12 : 0)).padStart(2, '0')}:${minute}`;
        return COURSE_TIME_OPTIONS.some(option => option.value === value) ? value : '';
    });
}

export function isCourseTime(course, now = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(course.startDate || '')) return false;
    const startDate = new Date(`${course.startDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime()) || now < startDate) return false;
    const days = (course.daysOfWeek || '').split(',').filter(day => /^[0-6]$/.test(day)).map(Number);
    if (!days.includes(now.getDay())) return false;
    const [start, end] = getCourseTimeValues(course.times);
    if (!start || !end || end <= start) return false;
    const toMinutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes >= toMinutes(start) && minutes < toMinutes(end);
}
