import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Courses from './courses';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'teacher' } } }) } }) }));
jest.mock('./components/Header', () => () => <div>Header</div>);
jest.mock('./components/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('react-ga4', () => ({ event: jest.fn() }));

test('creating a course sends the selected initial unit count', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async (url, options) => ({ json: async () => ({ mStatus: 'ok', mData:
    url.includes('/userdata/') ? { role: 'instructor', username: 'liamtest' }
      : url.includes('/all/instructors') ? [{ username: 'liamtest', unique_id: 'teacher' }]
      : options?.method === 'POST' ? 10 : [] }) }));
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    render(<Courses />);
    fireEvent.click(await screen.findByText('Create Course'));
    const form = screen.getByText('Add a New Course').parentElement;
    const count = within(form).getByLabelText('Initial Number of Units');
    expect(count).toHaveValue('1');
    fireEvent.change(count, { target: { value: '3' } });
    const texts = form.querySelectorAll('input[type="text"]');
    fireEvent.change(texts[0], { target: { value: 'New course' } });
    fireEvent.change(texts[1], { target: { value: 'https://example.com/meeting' } });
    fireEvent.change(form.querySelector('input[type="date"]'), { target: { value: '2026-10-05' } });
    fireEvent.change(within(form).getByLabelText('Start Time'), { target: { value: '12:00' } });
    fireEvent.change(within(form).getByLabelText('End Time'), { target: { value: '13:00' } });
    fireEvent.change(form.querySelector('textarea'), { target: { value: 'Description' } });
    fireEvent.click(within(form).getByLabelText('Monday'));
    fireEvent.click(within(form).getByText('Create'));
    await waitFor(() => expect(global.fetch.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(true));
    const [, request] = global.fetch.mock.calls.find(([, options]) => options?.method === 'POST');
    expect(JSON.parse(request.body).unitCount).toBe(3);
    await waitFor(() => expect(screen.queryByText('Add a New Course')).not.toBeInTheDocument());
  } finally { global.fetch = originalFetch; log.mockRestore(); }
});
