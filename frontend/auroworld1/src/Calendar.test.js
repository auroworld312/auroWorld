import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Calendar from './Calendar';
import { quizRequest } from './quizApi';
jest.mock('./quizApi', () => ({ quizRequest: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ state: { selectedDate: '2026-10-19T12:00:00' } }) }), { virtual: true });
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'student' } } }) } }) }));
jest.mock('./components/Sidebar', () => () => null);
jest.mock('./components/Header', () => () => null);
jest.mock('./QuizCalendar', () => ({ useQuizDeadlines: () => ({ quizzes: [], error: '' }), QuizDeadlineBlocks: () => null, QuizDeadlineList: () => null }));

test('course details appear on hover and focus, and schedule cards keep course navigation', async () => {
  const previousFetch = global.fetch;
  quizRequest.mockResolvedValue( [{ courseId: 7, title: 'French', instructor: 'Teacher', thumbnail: '/cover.jpg', times: '2:00 PM - 3:00 PM', daysOfWeek: '1' }]);
  try {
    render(<Calendar />);
    await waitFor(() => expect(screen.getAllByText('French')).toHaveLength(2));
    expect(quizRequest).toHaveBeenCalledWith('/calendar-courses');
    const event = screen.getAllByRole('button', { name: /French/ })[0];
    fireEvent.mouseEnter(event);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Instructor: Teacher');
    expect(screen.getByRole('tooltip').querySelector('img')).toHaveAttribute('src', '/cover.jpg');
    fireEvent.mouseLeave(event);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.focus(event);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(event, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getAllByRole('button', { name: /French/ })[1], { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/courses/7', { state: { activeTab: 'course' } });
  } finally {
    global.fetch = previousFetch;
  }
});

test('teacher sees all owned courses even when not scheduled on the selected day', async () => {
  quizRequest.mockResolvedValue([
    { courseId: 1, title: 'Tuesday class', calendarOwner: true, daysOfWeek: '2', times: '2:00 PM - 3:00 PM' },
    { courseId: 2, title: 'Unscheduled class', calendarOwner: true }
  ]);
  render(<Calendar />);
  expect(await screen.findByText('My Courses')).toBeInTheDocument();
  expect(screen.getByText('Unscheduled class')).toBeInTheDocument();
  expect(screen.getByText('Schedule not set')).toBeInTheDocument();
  expect(screen.getAllByText('Tuesday class')).toHaveLength(2);
});

test('failed course requests show an error and can be retried', async () => {
  quizRequest.mockRejectedValueOnce(new Error('Backend unavailable')).mockResolvedValueOnce([]);
  render(<Calendar />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Backend unavailable');
  expect(screen.queryByText('No classes on this day.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No classes on this day.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
