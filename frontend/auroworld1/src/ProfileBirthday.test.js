import { render, screen, fireEvent } from '@testing-library/react';
import Profile from './profile';
const mockNavigate = jest.fn();
const mockSetAvatar = jest.fn();
const mockSetName = jest.fn();
let mockBirthday = '2004-10-31';
let mockNoUpdate = false;
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('./components/Sidebar', () => () => null);
jest.mock('./components/Header', () => () => null);
jest.mock('./UserContext', () => ({ useUser: () => ({ setDisplayName: mockSetName, setAvatarUrl: mockSetAvatar, avatarUrl: '' }) }));
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'student', email: 'student@example.com' } } }) },
  from: table => ({
    select: () => ({ eq: async () => ({ data: table === 'users' ? [{ firstname: 'Student', username: 'student', role: 'user' }] : [{ birthday: mockBirthday }] }) }),
    update: values => ({ eq: () => table === 'users' ? Promise.resolve({ error: null }) : ({ select: async () => {
      if (mockNoUpdate) return { data: [], error: null };
      mockBirthday = values.birthday;
      return { data: [{ birthday: mockBirthday }], error: null };
    } }) })
  })
}) }));
beforeEach(() => { mockBirthday = '2004-10-31'; mockNoUpdate = false; });
test('saved birthday updates the displayed date and survives reload', async () => {
  const view = render(<Profile />);
  fireEvent.click(await screen.findByRole('button', { name: /Edit Profile/ }));
  fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '2005-02-14' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByText('February 14, 2005')).toBeInTheDocument();
  expect(mockBirthday).toBe('2005-02-14');
  view.unmount();
  render(<Profile />);
  expect(await screen.findByText('February 14, 2005')).toBeInTheDocument();
});
test('zero updated rows do not report a successful birthday save', async () => {
  mockNoUpdate = true;
  const alert = jest.spyOn(window, 'alert').mockImplementation(() => {});
  render(<Profile />);
  fireEvent.click(await screen.findByRole('button', { name: /Edit Profile/ }));
  fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value: '2005-02-14' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await screen.findByRole('button', { name: 'Save Changes' });
  const { waitFor } = require('@testing-library/react');
  await waitFor(() => expect(alert).toHaveBeenCalled());
  expect(screen.queryByText('Profile updated successfully!')).not.toBeInTheDocument();
  alert.mockRestore();
});
