import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UnitResources from './UnitResources';
import { quizRequest } from './quizApi';

jest.mock('./quizApi', () => ({ quizRequest: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());
const resource = { id: 4, title: 'Reading', url: 'https://example.com/file.pdf', description: 'Chapter one' };

test('student can open external resources but cannot edit', async () => {
  quizRequest.mockResolvedValue({ resources: [resource], can_manage: false });
  render(<UnitResources unitId={1} />);
  const link = await screen.findByRole('link', { name: /Open Resource/ });
  expect(link).toHaveAttribute('href', resource.url);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.queryByText('Add Resource')).not.toBeInTheDocument();
  expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  expect(screen.queryByText('Delete')).not.toBeInTheDocument();
});

test('teacher validates and adds a resource', async () => {
  quizRequest.mockResolvedValue({ resources: [], can_manage: true });
  render(<UnitResources unitId={1} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add Resource' }));
  fireEvent.change(screen.getByLabelText('Resource Title'), { target: { value: 'Video' } });
  fireEvent.change(screen.getByLabelText('Resource Link'), { target: { value: 'javascript:alert(1)' } });
  fireEvent.click(screen.getByText('Save Resource'));
  expect(await screen.findByRole('alert')).toHaveTextContent('http:// or https://');
  expect(quizRequest).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('Resource Link'), { target: { value: 'https://youtube.com/watch?v=test' } });
  fireEvent.change(screen.getByLabelText('Description (optional)'), { target: { value: 'Watch this' } });
  fireEvent.click(screen.getByText('Save Resource'));
  await waitFor(() => expect(quizRequest).toHaveBeenCalledWith('/units/1/resources', expect.objectContaining({ method: 'POST' })));
  expect(JSON.parse(quizRequest.mock.calls[1][1].body)).toEqual({ title: 'Video', url: 'https://youtube.com/watch?v=test', description: 'Watch this' });
});

test('teacher edits and confirms deletion', async () => {
  quizRequest.mockResolvedValue({ resources: [resource], can_manage: true });
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<UnitResources unitId={1} />);
  fireEvent.click(await screen.findByText('Edit'));
  expect(screen.getByLabelText('Resource Title')).toHaveValue('Reading');
  fireEvent.change(screen.getByLabelText('Resource Title'), { target: { value: 'Updated reading' } });
  fireEvent.click(screen.getByText('Save Resource'));
  await waitFor(() => expect(quizRequest).toHaveBeenCalledWith('/resources/4', expect.objectContaining({ method: 'PUT' })));
  await waitFor(() => expect(screen.queryByText('Save Resource')).not.toBeInTheDocument());
  fireEvent.click(screen.getByText('Delete'));
  expect(quizRequest).not.toHaveBeenCalledWith('/resources/4', { method: 'DELETE' });
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByText('Delete'));
  await waitFor(() => expect(quizRequest).toHaveBeenCalledWith('/resources/4', { method: 'DELETE' }));
});
