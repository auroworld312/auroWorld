import { isCourseTime, getCourseTimeValues } from './courseSchedule';

const course = { startDate: '2026-10-12', daysOfWeek: '1,5', times: '2:00 AM - 3:00 AM' };

test('scheduled status includes start and excludes end, only on scheduled days after start date', () => {
    expect(isCourseTime(course, new Date(2026, 9, 16, 1, 59))).toBe(false);
    expect(isCourseTime(course, new Date(2026, 9, 16, 2, 0))).toBe(true);
    expect(isCourseTime(course, new Date(2026, 9, 16, 2, 9))).toBe(true);
    expect(isCourseTime(course, new Date(2026, 9, 16, 3, 0))).toBe(false);
    expect(isCourseTime(course, new Date(2026, 9, 15, 2, 9))).toBe(false);
    expect(isCourseTime(course, new Date(2026, 9, 9, 2, 9))).toBe(false);
});

test('midnight and noon are parsed correctly and invalid legacy schedules stay offline', () => {
    expect(getCourseTimeValues('12:00 AM - 12:30 PM')).toEqual(['00:00', '12:30']);
    expect(isCourseTime({ ...course, times: '3:00' }, new Date(2026, 9, 16, 2, 9))).toBe(false);
    expect(isCourseTime({ ...course, startDate: '3:00' }, new Date(2026, 9, 16, 2, 9))).toBe(false);
});
