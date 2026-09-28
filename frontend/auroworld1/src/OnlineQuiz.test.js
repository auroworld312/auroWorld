import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnlineQuiz, { OnlineResult } from './OnlineQuiz';
import { QuizEditor } from './QuizComponents';
import QuizPage from './QuizPage';
import { quizRequest } from './quizApi';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useParams: () => ({ quizId: '7' }) }), { virtual: true });
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('./quizApi', () => ({ ...jest.requireActual('./quizApi'), quizRequest: jest.fn() }));
jest.mock('./components/Header', () => () => <div>Header</div>);
jest.mock('./components/Sidebar', () => () => <div>Sidebar</div>);

const questions = [{ prompt: 'Choose one', options: ['One', 'Two'] }, { prompt: 'Choose four', options: ['Three', 'Four'] }];
const quiz = { id: 7, mode: 'online', question_version: 2, questions, submissions: [] };
const result = { correct: 1, total: 2, score: 50, questions: [{ ...questions[0], selected: 0, answer: 0, correct: true, explanation: 'One is first.' }, { ...questions[1], selected: 0, answer: 1, correct: false, explanation: 'Four is fourth.' }] };

beforeEach(() => { jest.clearAllMocks(); });
afterEach(() => { jest.restoreAllMocks(); });

test('student navigation retains choices and saves an answer-only draft', async () => {
  quizRequest.mockResolvedValue({ submitted: false });
  render(<OnlineQuiz quiz={quiz} canSubmit onSaved={jest.fn()} />);
  expect(screen.getByText('Question 1 of 2')).toBeVisible();
  fireEvent.click(screen.getByRole('radio', { name: /One/ }));
  expect(screen.getByRole('button', { name: 'Question 1, answered' })).toHaveClass('answered');
  fireEvent.click(screen.getByText('Next Question'));
  expect(screen.getByText('Question 2 of 2')).toBeVisible();
  fireEvent.click(screen.getByRole('radio', { name: /Four/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Question 1, answered' }));
  expect(screen.getByRole('radio', { name: /One/ })).toBeChecked();
  expect(screen.queryByText('Explanation')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Save Draft'));
  expect(await screen.findByRole('status')).toHaveTextContent('Draft saved');
  expect(JSON.parse(quizRequest.mock.calls[0][1].body)).toEqual({ answers: [0, 1], submit: false, question_version: 2 });
});

test('student confirms unanswered questions before submitting', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  const saved = jest.fn();
  quizRequest.mockResolvedValue({ submitted: true });
  render(<OnlineQuiz quiz={quiz} canSubmit onSaved={saved} />);
  fireEvent.click(screen.getByText('Submit Quiz'));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2 question(s) are unanswered'));
  expect(quizRequest).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByText('Submit Quiz'));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(JSON.parse(quizRequest.mock.calls[0][1].body)).toEqual({ answers: [null, null], submit: true, question_version: 2 });
});

test('results show score chart and reuse question navigation for explanations', () => {
  render(<OnlineResult result={result} />);
  expect(screen.getByText('50 / 100')).toBeVisible();
  expect(screen.getByRole('img')).toHaveAccessibleName('1 correct, 1 incorrect or unanswered');
  fireEvent.click(screen.getByText('View Explanations'));
  expect(screen.getByText('One is first.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Question 2, incorrect' }));
  expect(screen.getByText('Four is fourth.')).toBeVisible();
  expect(screen.getByText('Incorrect')).toBeVisible();
  screen.getAllByRole('radio').forEach(radio => expect(radio).toBeDisabled());
  fireEvent.click(screen.getByText('Back to Results'));
  expect(screen.getByText('50 / 100')).toBeVisible();
});

test('saved draft is restored and expired quiz cannot be submitted', () => {
  render(<OnlineQuiz quiz={{ ...quiz, submissions: [{ id: 1, question_version: 2, answers: [1, null] }] }} canSubmit={false} />);
  expect(screen.getByRole('radio', { name: /Two/ })).toBeChecked();
  expect(screen.getByText('Submit Quiz')).toBeDisabled();
  expect(screen.getByText('Save Draft')).toBeDisabled();
});

test('completed online quiz opens results rather than another attempt', () => {
  render(<OnlineQuiz quiz={{ ...quiz, submissions: [{ submitted_at: '2026-09-28T12:00:00Z', result }] }} canSubmit />);
  expect(screen.getByText('50 / 100')).toBeVisible();
  expect(screen.queryByText('Submit Quiz')).not.toBeInTheDocument();
});

test('teacher chooses question mode and enters structured question fields', async () => {
  quizRequest.mockResolvedValue({ id: 7 });
  const saved = jest.fn();
  render(<QuizEditor unitId={1} onSaved={saved} />);
  fireEvent.change(screen.getByLabelText('Quiz Method'), { target: { value: 'online' } });
  expect(screen.queryByLabelText('Files')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Quiz Title'), { target: { value: 'Online assessment' } });
  fireEvent.change(screen.getByLabelText('Question 1 text'), { target: { value: 'Which number?' } });
  for (const [index, letter] of ['A', 'B', 'C', 'D'].entries()) fireEvent.change(screen.getByLabelText(`Option ${letter}`), { target: { value: String(index + 1) } });
  fireEvent.change(screen.getByLabelText('Correct answer for question 1'), { target: { value: '0' } });
  for (const [label, date] of [['Release', '2026-10-01'], ['Due', '2026-10-02']]) {
    fireEvent.change(screen.getByLabelText(`${label} date`), { target: { value: date } });
    fireEvent.change(screen.getByLabelText(`${label} time`), { target: { value: '12:00' } });
  }
  fireEvent.click(screen.getByText('Schedule / Publish'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Add an explanation');
  expect(quizRequest).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Explanation for question 1'), { target: { value: 'One is correct.' } });
  fireEvent.click(screen.getByText('Schedule / Publish'));
  await waitFor(() => expect(saved).toHaveBeenCalled());
  const metadata = JSON.parse(quizRequest.mock.calls[0][1].body.get('metadata'));
  expect(metadata.mode).toBe('online');
  expect(metadata.questions).toEqual([{ prompt: 'Which number?', options: ['1', '2', '3', '4'], answer: 0, explanation: 'One is correct.' }]);
});

test('open online quiz routes into the answer area instead of file upload', async () => {
  const now = Date.now();
  quizRequest.mockResolvedValue({ ...quiz, files: [], published: true, can_manage: false, title: 'Online assessment', server_now: new Date(now).toISOString(), release_at: new Date(now - 60000).toISOString(), due_at: new Date(now + 60000).toISOString() });
  render(<QuizPage />);
  expect(await screen.findByText('Question 1 of 2')).toBeVisible();
  expect(screen.queryByText('Upload Your Answer')).not.toBeInTheDocument();
  expect(screen.queryByText('Question Files')).not.toBeInTheDocument();
});
