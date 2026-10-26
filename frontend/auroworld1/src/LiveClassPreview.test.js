import { render, screen, fireEvent, act } from '@testing-library/react';
import LiveClassPreview from './LiveClassPreview';

const course = { title: 'French', instructor: 'Teacher', times: '2:00 AM - 3:00 AM', startDate: '2026-10-12', daysOfWeek: '1', liveUrl: 'https://example.com/meeting' };
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 9, 19, 2, 30)); });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
test('meeting button opens the saved link and disables at the end time', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => {});
    render(<LiveClassPreview course={course} />);
    fireEvent.click(screen.getByRole('button', { name: 'Join Class' }));
    expect(open).toHaveBeenCalledWith(course.liveUrl, '_blank', 'noopener,noreferrer');
    jest.setSystemTime(new Date(2026, 9, 19, 3, 0));
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: 'Join Class' })).toBeDisabled();
});
test.each(['', 'empty', 'javascript:alert(1)'])('invalid meeting link %s stays disabled', liveUrl => {
    render(<LiveClassPreview course={{ ...course, liveUrl }} />);
    expect(screen.getByRole('button', { name: 'Join Class' })).toBeDisabled();
});
