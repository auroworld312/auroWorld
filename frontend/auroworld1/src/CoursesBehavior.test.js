import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Courses, { courseTimeGroup } from './courses';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'bookmark-user' } } }) } }) }));
jest.mock('./components/Header', () => () => <div>Header</div>);
jest.mock('./components/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('react-ga4', () => ({ event: jest.fn() }));

const course = { courseId: 7, title: 'French', instructor: 'Teacher', description: 'French lessons', daysOfWeek: '1,5', times: '2:00 AM - 3:00 AM', startDate: '2026-10-12', level: 'Beginner', price: 'Free' };
let originalFetch;
beforeEach(() => {
    originalFetch = global.fetch;
    localStorage.clear();
    mockNavigate.mockClear();
    global.fetch = jest.fn(async url => ({ json: async () => ({ mStatus: 'ok', mData: url.endsWith('/courses') ? [course] : url.includes('/userdata/') ? { role: 'user' } : [] }) }));
});
afterEach(() => { global.fetch = originalFetch; localStorage.clear(); });

test('enrolled courses load after the user ID arrives and combine with filters', async () => {
    const other = { ...course, courseId: 8, title: 'Spanish', level: 'Advanced', times: '6:00 PM - 7:00 PM' };
    global.fetch = jest.fn(async url => ({ json: async () => ({ mStatus: 'ok', mData:
        url.endsWith('/courses') ? [course, other] : url.includes('/userdata/') ? { role: 'user' } : url.includes('/courses/enrolled/') ? [{ courseId: '7' }] : []
    }) }));
    render(<Courses />);
    await screen.findByRole('heading', { name: 'Spanish' });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/courses/enrolled/bookmark-user')));
    fireEvent.click(screen.getByRole('button', { name: 'Enrolled Courses' }));
    await waitFor(() => expect(screen.queryByText('Loading enrolled courses...')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'French' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Spanish' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Evening' }));
    expect(screen.getByText('No courses match your filters.')).toBeVisible();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Evening' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Morning' }));
    expect(screen.getByRole('heading', { name: 'French' })).toBeVisible();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Advanced' }));
    expect(screen.getByText('No courses match your filters.')).toBeVisible();
});

test('enrollment request errors show retry rather than a false empty list', async () => {
    const normal = global.fetch;
    global.fetch = jest.fn(url => url.includes('/courses/enrolled/') ? Promise.reject(new Error('Network unavailable')) : normal(url));
    render(<Courses />);
    await screen.findByRole('heading', { name: 'French' });
    fireEvent.click(screen.getByRole('button', { name: 'Enrolled Courses' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible();
    expect(screen.queryByText("You're not enrolled in any courses yet.")).not.toBeInTheDocument();
});

test('class time groups use start times and explicit asynchronous schedules', () => {
    expect(courseTimeGroup('11:30 AM - 12:30 PM')).toBe('Morning');
    expect(courseTimeGroup('12:00 PM - 1:00 PM')).toBe('Afternoon');
    expect(courseTimeGroup('5:00 PM - 6:00 PM')).toBe('Evening');
    expect(courseTimeGroup('Asynchronous')).toBe('Asynchronous');
    expect(courseTimeGroup('')).toBe('');
});

test('bookmarks persist across remounts and can be removed without enrolling', async () => {
    const first = render(<Courses />);
    const bookmark = await screen.findByRole('button', { name: 'Bookmark French' });
    await waitFor(() => expect(bookmark).toBeEnabled());
    expect(bookmark).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(bookmark);
    expect(localStorage.getItem('auroworld:bookmarks:bookmark-user')).toBe('["7"]');
    first.unmount();
    render(<Courses />);
    const saved = await screen.findByRole('button', { name: 'Remove bookmark for French' });
    expect(saved).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(saved);
    expect(localStorage.getItem('auroworld:bookmarks:bookmark-user')).toBe('[]');
    expect(global.fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true);
});

test('cards show creation fields and only the requested action buttons', async () => {
    render(<Courses />);
    expect(await screen.findByRole('heading', { name: 'French' })).toBeInTheDocument();
    expect(screen.getByText('Mon, Fri')).toBeInTheDocument();
    expect(screen.getByText('2:00 AM - 3:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Start Date: 2026-10-12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More Info' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'French' }));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/7');
    expect(screen.queryByRole('button', { name: 'Enroll' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Join Class' })).not.toBeInTheDocument();
});


test('live status changes automatically at the scheduled end time', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 16, 2, 59, 59));
    try {
        render(<Courses />);
        expect(await screen.findByRole('status')).toHaveTextContent('Live');
        expect(screen.getByRole('status').querySelector('img')).toHaveAttribute('src', '/assets/courses/live.svg');
        act(() => jest.advanceTimersByTime(1000));
        expect(screen.getByRole('status')).toHaveTextContent('Not Live');
        expect(screen.getByRole('status').querySelector('img')).toHaveAttribute('src', '/assets/courses/not-live.svg');
    } finally { jest.useRealTimers(); }
});


test.each(['instructor', 'user', 'admin'])('%s sees the appropriate course list', async role => {
    const otherCourse = { ...course, courseId: 8, title: 'Spanish', instructor: 'Another teacher' };
    global.fetch = jest.fn(async url => ({ json: async () => ({ mStatus: 'ok', mData:
        url.endsWith('/courses') ? [course, otherCourse] :
        url.includes('/userdata/') ? { role, username: 'Teacher', unique_id: 'teacher-id' } : []
    }) }));
    render(<Courses />);
    expect(await screen.findByRole('heading', { name: 'French' })).toBeInTheDocument();
    if (role === 'instructor') {
        expect(screen.queryByRole('heading', { name: 'Spanish' })).not.toBeInTheDocument();
    } else {
        expect(screen.getByRole('heading', { name: 'Spanish' })).toBeInTheDocument();
    }
    expect(global.fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true);
});


test.each([
    ['0,1,2,3,4,5,6', 'Every day'], ['1,2,3,4,5', 'Weekdays'], ['0,6', 'Weekend'], ['1,2,3,4', 'Mon, Tue, Wed, Thu']
])('teacher cards compact %s and omit enrollment controls', async (daysOfWeek, label) => {
    global.fetch = jest.fn(async url => ({ json: async () => ({ mStatus: 'ok', mData:
        url.endsWith('/courses') ? [{ ...course, daysOfWeek }] :
        url.includes('/userdata/') ? { role: 'instructor', username: 'Teacher' } : []
    }) }));
    render(<Courses />);
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'French' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More Info' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enroll' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Course list' })).not.toBeInTheDocument();
});


test('teacher can open a card and edit without navigating from its menu', async () => {
    global.fetch = jest.fn(async (url, options) => ({ json: async () => ({ mStatus: 'ok', mData:
        url.endsWith('/courses') ? [course] : url.endsWith('/courses/7') ? course :
        url.includes('/userdata/') ? { role: 'instructor', username: 'Teacher' } : []
    }) }));
    render(<Courses />);
    const heading = await screen.findByRole('heading', { name: 'French' });
    fireEvent.click(heading.closest('article').querySelector('.courses-thumbnail'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/7');
    mockNavigate.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Course options for French' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Course' }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('French lessons')).toBeInTheDocument();
    expect(screen.getByDisplayValue('French')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Initial Number of Units/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('French'), { target: { value: 'Updated French' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(global.fetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(true));
    const [url, request] = global.fetch.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(url).toMatch(/courses\/edit\/7$/);
    expect(JSON.parse(request.body)).toMatchObject({ title: 'Updated French', daysOfWeek: '1,5', liveUrl: '', updateThumbnail: true });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument());
});

test('canceling course deletion sends no mutation and does not open the course', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
    global.fetch = jest.fn(async url => ({ json: async () => ({ mStatus: 'ok', mData:
        url.endsWith('/courses') ? [course] : url.includes('/userdata/') ? { role: 'instructor', username: 'Teacher' } : []
    }) }));
    try {
        render(<Courses />);
        fireEvent.click(await screen.findByRole('button', { name: 'Course options for French' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete Course' }));
        expect(confirm).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(global.fetch.mock.calls.every(([, options]) => !options?.method)).toBe(true);
    } finally { confirm.mockRestore(); }
});


test('image persistence failure keeps the editor and preview open', async () => {
    const cover = 'data:image/jpeg;base64,/9j/2Q==';
    const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
    global.fetch = jest.fn(async url => ({ json: async () => ({ mStatus: 'ok', mData:
        url.endsWith('/courses') ? [{ ...course, thumbnail: cover }] :
        url.endsWith('/courses/7') ? { ...course, thumbnail: null } :
        url.includes('/userdata/') ? { role: 'instructor', username: 'Teacher' } : 1
    }) }));
    try {
        render(<Courses />);
        fireEvent.click(await screen.findByRole('button', { name: 'Course options for French' }));
        fireEvent.click(screen.getByRole('button', { name: 'Edit Course' }));
        expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1);
        expect(screen.queryByRole('button', { name: 'Delete Course' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
        await waitFor(() => expect(alert).toHaveBeenCalledWith(expect.stringContaining('image was not saved')));
        expect(screen.getByAltText('Course cover preview')).toHaveAttribute('src', cover);
        expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
    } finally { alert.mockRestore(); }
});
