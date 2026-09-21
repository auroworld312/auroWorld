import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuizEditor } from './QuizComponents';
import UnitMaterials from './UnitMaterials';
import { QuizDeadlineList } from './QuizCalendar';
import QuizPage from './QuizPage';
import SubmissionGrade from './SubmissionGrade';
import { quizRequest, dateInstant } from './quizApi';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useParams: () => ({ quizId: '7' }) }), { virtual: true });
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('./quizApi', () => ({ ...jest.requireActual('./quizApi'), quizRequest: jest.fn() }));
jest.mock('./components/Header', () => () => <div>Header</div>);
jest.mock('./components/Sidebar', () => () => <div>Sidebar</div>);

beforeEach(() => { jest.clearAllMocks(); });
afterEach(() => { jest.restoreAllMocks(); });

test('delete requires confirmation and returns to materials only after success', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  const deleted = jest.fn();
  quizRequest.mockResolvedValue({ deleted: true });
  render(<QuizEditor quiz={{ id: 7, title: 'Assessment' }} onDeleted={deleted} />);
  fireEvent.click(screen.getByText('Delete Quiz'));
  expect(quizRequest).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByText('Delete Quiz'));
  await waitFor(() => expect(deleted).toHaveBeenCalledTimes(1));
  expect(quizRequest).toHaveBeenCalledWith('/quizzes/7', { method: 'DELETE' });
});

test('teacher grades with score, comments and a marked file', async () => {
  quizRequest.mockResolvedValue({ graded: true });
  const saved = jest.fn();
  render(<SubmissionGrade quizId={7} submission={{ id: 3 }} canManage onSaved={saved} />);
  fireEvent.click(screen.getByText('Grade Submission'));
  fireEvent.click(screen.getByText('Save Grade'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Enter a score');
  expect(quizRequest).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Score (out of 100)'), { target: { value: '87.5' } });
  fireEvent.change(screen.getByLabelText('Feedback (optional)'), { target: { value: 'Good work' } });
  fireEvent.change(screen.getByLabelText('Files'), { target: { files: [new File(['marked'], 'marked.pdf')] } });
  fireEvent.click(screen.getByText('Save Grade'));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  const [path, request] = quizRequest.mock.calls[0];
  expect(path).toBe('/quizzes/7/submissions/3/grade');
  expect(JSON.parse(request.body.get('metadata'))).toEqual({ score: 87.5, feedback: 'Good work', keep_file_ids: [] });
  expect(request.body.getAll('files')[0].name).toBe('marked.pdf');
});

test('student sees grade, feedback and marked work without edit controls', () => {
  render(<SubmissionGrade quizId={7} submission={{ id: 3, score: 0, feedback: 'Try again', graded_at: '2026-09-21T12:00:00Z', feedback_files: [{ id: 8, filename: 'marked.docx', size: 20 }] }} canManage={false} />);
  expect(screen.getByText('Grade: 0 / 100')).toBeVisible();
  expect(screen.getByText('Try again')).toBeVisible();
  expect(screen.getByText('marked.docx')).toBeVisible();
  expect(screen.getByText('Download')).toBeVisible();
  expect(screen.queryByText('Edit Grade')).not.toBeInTheDocument();
  expect(screen.queryByText('Save Grade')).not.toBeInTheDocument();
});

test('unit tabs preserve video access and hide teacher controls from students', async () => {
  quizRequest.mockResolvedValue({ quizzes: [], can_manage: false });
  render(<UnitMaterials unit={{ unitId: 1, title: 'Unit 1', videos: [{}] }}><div>Existing video player</div></UnitMaterials>);
  fireEvent.click(screen.getByRole('button', { name: /Unit 1/ }));
  expect(screen.getByText('Existing video player')).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Quizzes' }));
  expect(await screen.findByText('No quizzes available yet.')).toBeVisible();
  expect(screen.queryByText('Create Quiz')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: /Videos/ }));
  expect(screen.getByText('Existing video player')).toBeVisible();
});

test('teacher picks schedule, enables late deadline and publishes attachments', async () => {
  quizRequest.mockResolvedValue({ id: 7 });
  const saved = jest.fn();
  render(<QuizEditor unitId={1} onSaved={saved} onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Quiz Title'), { target: { value: 'Unit assessment' } });
  expect(screen.getByLabelText('Release time').options).toHaveLength(49);
  expect(screen.queryByLabelText('Late Submission Deadline date')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Allow late submissions'));
  for (const [label, date, time] of [['Release', '2026-10-01', '12:00'], ['Due', '2026-10-02', '12:30'], ['Late Submission Deadline', '2026-10-03', '13:00']]) {
    fireEvent.change(screen.getByLabelText(`${label} date`), { target: { value: date } });
    fireEvent.change(screen.getByLabelText(`${label} time`), { target: { value: time } });
  }
  fireEvent.change(screen.getByLabelText('Files'), { target: { files: [new File(['questions'], 'quiz.pdf', { type: 'application/pdf' })] } });
  fireEvent.click(screen.getByText('Schedule / Publish'));
  await waitFor(() => expect(saved).toHaveBeenCalledWith({ id: 7 }));
  const [path, request] = quizRequest.mock.calls[0];
  const metadata = JSON.parse(request.body.get('metadata'));
  expect(path).toBe('/units/1');
  expect(metadata.published).toBe(true);
  expect(metadata.due_at).toBe(dateInstant({ date: '2026-10-02', time: '12:30' }));
  expect(metadata.late_until).toBeTruthy();
  expect(request.body.getAll('files')).toHaveLength(1);
});

test('calendar deadline opens the quiz, not a meeting', () => {
  render(<QuizDeadlineList quizzes={[{ id: 7, title: 'Unit assessment', due_at: '2026-10-02T12:00:00Z' }]} selectedDate={new Date('2026-10-02T12:00:00Z')} />);
  fireEvent.click(screen.getByRole('button', { name: /Unit assessment/ }));
  expect(mockNavigate).toHaveBeenCalledWith('/quizzes/7');
});

test('student uploads an answer and submits it', async () => {
  const now = Date.now();
  const quiz = { id: 7, title: 'Assessment', published: true, can_manage: false, files: [], submissions: [], server_now: new Date(now).toISOString(), release_at: new Date(now - 60000).toISOString(), due_at: new Date(now + 60000).toISOString() };
  quizRequest.mockImplementation(path => Promise.resolve(path.endsWith('/answers') ? { id: 1 } : quiz));
  render(<QuizPage />);
  fireEvent.change(await screen.findByLabelText('Files'), { target: { files: [new File(['answer'], 'answer.txt')] } });
  fireEvent.click(screen.getByText('Submit Answer'));
  expect(await screen.findByRole('status')).toHaveTextContent('Your answer was submitted successfully.');
  const [, request] = quizRequest.mock.calls.find(([path]) => path.endsWith('/answers'));
  expect(JSON.parse(request.body.get('metadata')).submit).toBe(true);
  expect(request.body.getAll('files')[0].name).toBe('answer.txt');
  expect(screen.queryByText('Edit Quiz')).not.toBeInTheDocument();
});
