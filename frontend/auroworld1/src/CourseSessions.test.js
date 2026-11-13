import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CourseSessions from './CourseSessions';
import { quizRequest } from './quizApi';
jest.mock('./quizApi',()=>({quizRequest:jest.fn(),displayDate:v=>v,localZone:'America/New_York'}));
const base={can_access:true,can_manage:false,username:'student',teachers:[{username:'owner'},{username:'teacherB'}],available_teachers:[{username:'teacherC'}],lessons:[{lesson_id:1,title:'Lesson 1',unit_title:'Unit 1'}],offerings:[{id:1,title:'Evening',teacher:'owner',timezone:'America/New_York',live_url:'https://example.com/a'},{id:2,title:'Morning',teacher:'teacherB',timezone:'America/New_York'}],sessions:[{id:10,offering_id:1,offering_title:'Evening',lesson_id:1,lesson_title:'Lesson 1',teacher:'owner',starts_at:'2099-01-01T18:00:00Z',ends_at:'2099-01-01T19:00:00Z',live_url:'https://example.com/a'},{id:11,offering_id:2,offering_title:'Morning',lesson_id:1,lesson_title:'Lesson 1',teacher:'teacherB',starts_at:'2099-01-02T10:00:00Z',ends_at:'2099-01-02T11:00:00Z',live_url:'https://example.com/b'}],choices:[]};
afterEach(()=>jest.resetAllMocks());

test('student can see all teachers upcoming sessions without manually adding calendar entries',async()=>{
 quizRequest.mockResolvedValue(base);render(<CourseSessions course={{courseId:7,instructor:'owner'}}/>);
 await screen.findByRole('heading',{name:'teacherB'});
 const links=screen.getAllByRole('link',{name:/Open live link/});expect(links[1]).toHaveAttribute('href','https://example.com/b');
 expect(screen.queryByRole('button',{name:'Add to my calendar'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Edit teaching schedule'})).not.toBeInTheDocument();
});
test('new instructor joins with their own link and shared lesson schedule',async()=>{
 quizRequest.mockResolvedValue({...base,can_teach:true,joined:false,username:'teacherC'});render(<CourseSessions teaching course={{courseId:7,instructor:'owner',liveUrl:'https://owner.example'}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Become an instructor'}));
 expect(screen.getByLabelText('Live link')).toHaveValue('');
 expect(screen.queryByLabelText('Teacher')).not.toBeInTheDocument();
 expect(screen.queryByLabelText('Teaching plan name')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Live link'),{target:{value:'https://teacher.example/room'}});
 fireEvent.click(screen.getByLabelText('Tuesday'));
 fireEvent.click(screen.getByLabelText('Thursday'));
 fireEvent.change(screen.getByLabelText('Tuesday starts'),{target:{value:'10:00'}});
 expect(screen.queryByLabelText('Tuesday ends')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Start date'),{target:{value:'2099-01-06'}});
 fireEvent.click(screen.getByRole('button',{name:'Save'}));
 await waitFor(()=>expect(quizRequest).toHaveBeenCalledWith('/courses/7/join-teaching',expect.objectContaining({method:'POST',body:expect.stringContaining('"weekly_slots":[{"day":2,"start":"10:00"},{"day":4')})));
});
test('assigned teacher manages only their own plans and sessions',async()=>{
 quizRequest.mockResolvedValue({...base,can_teach:true,joined:true,username:'teacherB'});render(<CourseSessions teaching course={{courseId:7,instructor:'owner'}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'Edit teaching schedule'}));
 expect(screen.getAllByRole('button',{name:'Edit live link'})).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Edit live link'}));expect(screen.queryByLabelText('Teacher')).not.toBeInTheDocument();
 expect(screen.queryByText('Evening')).not.toBeInTheDocument();
});

test('saved instructor remains visible after remount without reopening management',async()=>{
 quizRequest.mockResolvedValue({...base,can_teach:true,joined:true,username:'teacherB'});
 const first=render(<CourseSessions teaching course={{courseId:7,instructor:'owner'}}/>);
 expect(await screen.findByRole('heading',{name:'teacherB'})).toBeVisible();first.unmount();
 render(<CourseSessions teaching course={{courseId:7,instructor:'owner'}}/>);
 expect(await screen.findByRole('heading',{name:'teacherB'})).toBeVisible();
 expect(screen.queryByText('Upcoming')).not.toBeInTheDocument();
});
