import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MaterialsTab, UnitSection } from './CourseDetail';
import { getB2Url, uploadToB2 } from './b2Storage';

jest.mock('react-router-dom', () => ({ useLocation: () => ({ state: null }), useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }));
jest.mock('./components/Sidebar', () => () => null);
jest.mock('./components/Header', () => () => null);
jest.mock('react-ga4', () => ({ event: jest.fn() }));
jest.mock('./b2Storage', () => ({ ...jest.requireActual('./b2Storage'), uploadToB2: jest.fn(async () => {}), getB2Url: jest.fn(async () => 'https://example.com/video.mp4') }));
jest.mock('./QuizComponents', () => ({ UnitQuizzes: () => <div>Quiz content</div> }));
jest.mock('./UnitResources', () => () => <div>Resource content</div>);

const course = { courseId: 7, instructor: 'teacher', units: [
    { unitId: 1, title: 'Introduction', sortOrder: 0, lessons: [] },
    { unitId: 2, title: 'Conversation', sortOrder: 1, lessons: [] },
] };
const teacher = { role: 'instructor', username: 'teacher' };
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(async () => ({ json: async () => ({ mStatus: 'ok', mData: 3 }) })); });
afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

test('search filters units while student management stays hidden', () => {
    render(<MaterialsTab course={course} userData={{ role: 'student', username: 'student' }} />);
    expect(screen.queryByRole('button', { name: 'Manage units' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Unit' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search units' }), { target: { value: 'CONVER' } });
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    expect(screen.queryByText('Introduction')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search units' }), { target: { value: 'missing' } });
    expect(screen.getByText('No units match your search.')).toBeInTheDocument();
});

test('management toggle exposes editing and saves a renamed unit', async () => {
    render(<MaterialsTab course={course} userData={teacher} />);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage units' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const name = screen.getByRole('textbox', { name: /Unit name/ });
    expect(name).toHaveValue('Introduction');
    fireEvent.change(name, { target: { value: 'Getting started' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await screen.findByText('Getting started');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/edit/unit/1'), expect.objectContaining({ method: 'PUT', body: JSON.stringify({ unitName: 'Getting started' }) }));
    expect(screen.queryByRole('textbox', { name: /Unit name/ })).not.toBeInTheDocument();
});

test('bottom create form adds a unit and delete removes only the selected unit', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MaterialsTab course={course} userData={teacher} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Unit' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Unit name/ }), { target: { value: '  Practice  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByText('Practice');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/course_units/7'), expect.objectContaining({ body: JSON.stringify({ unitName: 'Practice', sortOrder: 2 }) }));
    fireEvent.click(screen.getByRole('button', { name: 'Manage units' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Practice' }));
    await waitFor(() => expect(screen.queryByText('Practice')).not.toBeInTheDocument());
    expect(screen.getByText('Introduction')).toBeInTheDocument();
});

test('failed creation retains the form and entered title', async () => {
    global.fetch.mockRejectedValue(new Error('Network unavailable'));
    render(<MaterialsTab course={{ ...course, units: [] }} userData={teacher} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Unit' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Unit name/ }), { target: { value: 'Practice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable');
    expect(screen.getByRole('textbox', { name: /Unit name/ })).toHaveValue('Practice');
});

test('lessons can be created in bulk, searched and edited with the existing upload form', async () => {
    let id = 10;
    global.fetch.mockImplementation(async () => ({ json: async () => ({ mStatus: 'ok', mData: id++ }) }));
    render(<UnitSection embedded unit={{ unitId: 1, title: 'Unit 1', lessons: [] }} unitId={1} courseId={7} role="instructor" username="teacher" instructor="teacher" />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Lesson' }));
    fireEvent.change(screen.getByLabelText('Number of lessons'), { target: { value: '3' } });
    expect(screen.getByLabelText('Lesson 3 name')).toBeInTheDocument();
    expect(screen.queryByText('Description (optional)')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Lesson 1 name'), { target: { value: 'Introduction' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Lessons' }));
    await screen.findByText('Lesson 3');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).lessonTitle).toBe('Introduction');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search lessons' }), { target: { value: 'Lesson 2' } });
    expect(screen.queryByText('Lesson 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage lessons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));
    expect(screen.getByRole('button', { name: 'Choose File' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
});

test('successful video upload opens an inline player immediately', async () => {
    getB2Url.mockResolvedValue('https://example.com/video.mp4');
    uploadToB2.mockResolvedValue(undefined);
    global.fetch.mockImplementation(async (url, options) => ({ json: async () => ({ mStatus: 'ok', mData: options?.method === 'POST' ? 22 : false }) }));
    const unit = { unitId: 1, title: 'Unit 1', lessons: [{ lessonId: 10, lessonTitle: 'Intro', lessonDescription: '', videos: [] }] };
    const { container } = render(<UnitSection embedded unit={unit} unitId={1} courseId={7} role="instructor" username="teacher" instructor="teacher" />);
    fireEvent.click(screen.getByRole('button', { name: 'Manage lessons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.queryByText('Lesson Description')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reorder Videos' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));
    fireEvent.change(screen.getByLabelText('Choose lesson video'), { target: { files: [new File(['video'], 'Intro.mp4', { type: 'video/mp4' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload', exact: true }));
    await waitFor(() => expect(container.querySelector('video')).toHaveAttribute('src', 'https://example.com/video.mp4'));
    expect(container.querySelector('video')).toHaveAttribute('controls');
    fireEvent.error(container.querySelector('video'));
    expect(screen.getByRole('status')).toHaveTextContent('This video could not be played');
});

test('new lessons remain after closing and reopening their unit', async () => {
    render(<MaterialsTab course={course} userData={teacher} />);
    fireEvent.click(screen.getByRole('button', { name: /Introduction 0 lessons/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Lesson' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Lessons' }));
    await screen.findByText('Lesson 1');
    fireEvent.click(await screen.findByRole('button', { name: /Introduction 1 lesson/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Introduction 1 lesson/ }));
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
});
