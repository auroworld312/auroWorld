import { render, screen, fireEvent } from '@testing-library/react';
import LessonLiveLinks from './LessonLiveLinks';
import { quizRequest } from './quizApi';
jest.mock('./quizApi', () => ({ quizRequest: jest.fn() }));
test('adds a lesson live link and loads the saved link on reopening', async () => {
 const saved = [];
 quizRequest.mockImplementation(async (path, options) => {
   if (options?.method === 'POST') { const row = { id: 1, ...JSON.parse(options.body) }; saved.push(row); return row; }
   return [...saved];
 });
 const view = render(<LessonLiveLinks lessonId={10} editing />);
 fireEvent.click(screen.getByRole('button', { name: 'Add Live Link' }));
 fireEvent.change(screen.getByLabelText('Link title'), { target: { value: 'Office hours' } });
 fireEvent.change(screen.getByLabelText('Live link URL'), { target: { value: 'https://zoom.us/j/123' } });
 fireEvent.click(screen.getByRole('button', { name: 'Save Link' }));
 expect(await screen.findByRole('link', { name: 'Open Live Link' })).toHaveAttribute('href', 'https://zoom.us/j/123');
 view.unmount();
 render(<LessonLiveLinks lessonId={10} editing={false} />);
 expect(await screen.findByText('Office hours')).toBeVisible();
 expect(screen.queryByRole('button', { name: 'Add Live Link' })).not.toBeInTheDocument();
});
