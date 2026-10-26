import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Settings from './Settings';
import Profile from './profile';
import Sidebar from './components/Sidebar';
import { AccessibilityProvider } from './AccessibilityContext';

const mockNavigate = jest.fn();
const mockSetName = jest.fn();
const mockSetAvatar = jest.fn();
let mockRole = 'instructor';
let mockAvatar = '';
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => ({ pathname: '/settings' }) }), { virtual: true });
jest.mock('./UserContext', () => ({ useUser: () => ({ displayName: 'Alex Teacher', email: 'alex@example.com', avatarUrl: mockAvatar, setDisplayName: mockSetName, setAvatarUrl: mockSetAvatar }) }));
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'alex', email: 'alex@example.com' } } }) },
  from: table => ({ select: () => ({ eq: async () => ({ data: table === 'users' ? [{ firstname: 'Alex', lastname: 'Teacher', username: 'alex', role: mockRole }] : [] }) }) })
}) }));
beforeEach(() => { localStorage.clear(); mockAvatar = ''; mockNavigate.mockClear(); });
afterEach(() => { delete document.documentElement.dataset.theme; delete document.documentElement.dataset.boldText; });

test('settings changes theme, bold and text size and persists preferences', async () => {
  const view = render(<AccessibilityProvider><Settings /></AccessibilityProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Dark/ }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  fireEvent.click(screen.getByRole('button', { name: 'On' }));
  expect(document.documentElement).toHaveAttribute('data-bold-text', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Off' }));
  expect(document.documentElement).toHaveAttribute('data-bold-text', 'false');
  fireEvent.change(screen.getByRole('slider', { name: 'Text Size' }), { target: { value: '5' } });
  await waitFor(() => expect(JSON.parse(localStorage.getItem('auroworld:accessibility')).textSize).toBe(5));
  expect(document.body.style.zoom).toBe('');
  view.unmount();
  render(<AccessibilityProvider><Settings /></AccessibilityProvider>);
  expect(screen.getByRole('slider')).toHaveValue('5');
  expect(screen.getByRole('button', { name: /Dark/ })).toHaveAttribute('aria-pressed', 'true');
});

test.each([['instructor', 'Teacher'], ['user', 'Student']])('account displays %s identity and retains edit form', async (role, badge) => {
  mockRole = role;
  render(<Profile />);
  expect(await screen.findByText(badge, { selector: '.account-role' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Edit Profile/ }));
  expect(screen.getByPlaceholderText('Enter first name')).toHaveValue('Alex');
  expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
});

test('sidebar has separate settings and account links with avatar fallback', () => {
  const view = render(<Sidebar />);
  expect(screen.getByRole('button', { name: 'Account' })).toHaveTextContent('Alex Teacher');
  expect(screen.getByRole('button', { name: 'Account' })).toHaveTextContent('AT');
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  expect(mockNavigate).toHaveBeenCalledWith('/settings');
  fireEvent.click(screen.getByRole('button', { name: 'Account' }));
  expect(mockNavigate).toHaveBeenCalledWith('/profile');
  mockAvatar = '/avatar.png';
  view.rerender(<Sidebar />);
  const avatar = screen.getByRole('button', { name: 'Account' }).querySelector('img');
  expect(avatar).toHaveAttribute('src', '/avatar.png');
  fireEvent.error(avatar);
  expect(screen.getByRole('button', { name: 'Account' })).toHaveTextContent('AT');
});
