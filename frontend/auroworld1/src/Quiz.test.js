import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuizEditor } from './QuizComponents';
import UnitMaterials from './UnitMaterials';
import { QuizDeadlineList } from './QuizCalendar';
import QuizPage from './QuizPage';
import { quizRequest, dateInstant } from './quizApi';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useParams: () => ({ quizId: '7' }) }), { virtual: true });
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('./quizApi', () => ({ ...jest.requireActual('./quizApi'), quizRequest: jest.fn() }));
jest.mock('./components/Header', () => () => <div>Header</div>);
jest.mock('./components/Sidebar', () => () => <div>Sidebar</div>);

beforeEach(() => { jest.clearAllMocks(); });

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
