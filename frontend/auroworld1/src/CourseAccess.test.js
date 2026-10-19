import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CourseDetail from './CourseDetail';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useParams: () => ({ courseId: '7' }), useLocation: () => ({ state: { activeTab: 'materials' } }), useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'student' } } }) } }) }));
jest.mock('./components/Sidebar', () => () => null);
jest.mock('./components/Header', () => () => null);
jest.mock('react-ga4', () => ({ event: jest.fn() }));
jest.mock('./QuizComponents', () => ({ UnitQuizzes: () => null }));
jest.mock('./UnitResources', () => () => null);

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const course = { courseId: 7, title: 'French', instructor: 'teacher', price: 'Free', units: [] };

test('unenrolled students stay on Course, then enrollment unlocks Materials', async () => {
  global.fetch = jest.fn(async url => ({ json: async () => ({ mStatus: 'ok', mData: url.includes('/courses/enrolled/') ? [] : url.includes('/userdata/') ? { role: 'user', username: 'student' } : course }) }));
  render(<CourseDetail />);
  const materials = await screen.findByRole('button', { name: 'Materials' });
  expect(screen.getByRole('button', { name: 'Course', pressed: true })).toBeInTheDocument();
  fireEvent.click(materials);
  fireEvent.click(screen.getByRole('button', { name: 'Video' }));
  expect(screen.getByRole('button', { name: 'Course', pressed: true })).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Search units' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Enroll Now' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Materials', pressed: true })).toBeInTheDocument());
  expect(screen.getByRole('textbox', { name: 'Search units' })).toBeInTheDocument();
});

test('course owner can access Materials without enrollment', async () => {
  global.fetch = jest.fn(async url => ({ json: async () => ({ mStatus: 'ok', mData: url.includes('/courses/enrolled/') ? [] : url.includes('/userdata/') ? { role: 'instructor', username: 'teacher' } : course }) }));
  render(<CourseDetail />);
  expect(await screen.findByRole('button', { name: 'Materials', pressed: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add Unit' })).toBeInTheDocument();
});
