import { render, screen, fireEvent } from '@testing-library/react';
import NextClass, { nextClass } from './NextClass';
import { quizRequest } from './quizApi';

jest.mock('./quizApi', () => ({ quizRequest: jest.fn() }));
const course = { courseId: 1, title: 'French', instructor: 'Teacher', startDate: '2026-10-01', daysOfWeek: '1,2,3,4,5', times: '9:00 AM - 10:00 AM', liveUrl: 'https://zoom.us/j/123' };
afterEach(() => { jest.useRealTimers(); jest.resetAllMocks(); });

test('prefers a class in progress across enrollments, then the nearest upcoming class', () => {
    const later = { ...course, courseId: 2, times: '11:00 AM - 12:00 PM' };
    expect(nextClass([later, course], new Date('2026-10-23T09:30:00')).course.courseId).toBe(1);
    expect(nextClass([later, course], new Date('2026-10-23T10:00:00')).course.courseId).toBe(2);
});

test('respects course start dates and rolls recurring sessions to the next week', () => {
    expect(nextClass([course], new Date('2026-10-23T17:00:00')).start.getDay()).toBe(1);
    const future = nextClass([{ ...course, startDate: '2027-01-04' }], new Date('2026-10-23T09:30:00'));
    expect(future.start.getFullYear()).toBe(2027);
    expect(future.live).toBe(false);
});

test('handles overnight sessions and excludes missing schedules and unsafe meeting links', () => {
    const overnight = nextClass([{ ...course, daysOfWeek: '4', times: '11:00 PM - 1:00 AM' }], new Date('2026-10-23T00:30:00'));
    expect(overnight.live).toBe(true);
    expect(nextClass([{ ...course, times: '' }])).toBeNull();
    expect(nextClass([{ ...course, liveUrl: 'javascript:alert(1)' }], new Date('2026-10-23T09:30:00')).url).toBe('');
});

test('loads authenticated enrollments and links to the selected class without price details', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-23T09:30:00'));
    quizRequest.mockResolvedValue([course]);
    render(<NextClass />);
    const link = await screen.findByRole('link', { name: /Join Class/ });
    expect(quizRequest).toHaveBeenCalledWith('/calendar-courses');
    expect(link).toHaveAttribute('href', course.liveUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.queryByText('Free')).not.toBeInTheDocument();
});

test('shows a retry instead of an active link when schedule loading fails', async () => {
    quizRequest.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue([]);
    render(<NextClass />);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/No upcoming scheduled classes/)).toBeVisible();
});
