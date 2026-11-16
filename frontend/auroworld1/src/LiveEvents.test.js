import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import LiveEvents from './LiveEvents';
import {quizRequest} from './quizApi';
jest.mock('./quizApi',()=>({...jest.requireActual('./quizApi'),quizRequest:jest.fn()}));
jest.mock('./utils/supabaseClient.js',()=>({supabase:{}}));
const event={id:10,title:'Conversation',description:'Practice together',host_name:'',live_url:'https://example.com/live',starts_at:'2099-11-20T15:00:00Z',ends_at:'2099-11-20T16:00:00Z',can_edit:false,registered:true};
beforeEach(()=>jest.clearAllMocks());
test('enrolled viewer sees dated events and links but no editing controls',async()=>{
  quizRequest.mockResolvedValue({can_create:false,events:[event]});
  render(<LiveEvents course={{courseId:1,title:'French'}}/>);
  expect(await screen.findByText('Conversation')).toBeVisible();
  expect(screen.getByRole('link',{name:'Join event'})).toHaveAttribute('href',event.live_url);
  expect(screen.queryByRole('button',{name:'Edit'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Add event/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Details'));
  expect(screen.getByText('Practice together')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Search events'),{target:{value:'missing'}});
  expect(screen.getByText('No matching events.')).toBeVisible();
});
test('teacher creates an event without a lesson or teaching plan and sees it after remount',async()=>{
  let events=[];
  quizRequest.mockImplementation(async(path,options)=>{
    if(options?.method==='POST'){events=[{...JSON.parse(options.body),id:10,can_edit:true}];return events[0];}
    return {can_create:true,events};
  });
  const view=render(<LiveEvents course={{courseId:1}}/>);
  fireEvent.click(await screen.findByText('+ Add event'));
  fireEvent.change(screen.getByLabelText('Event title'),{target:{value:'Conversation'}});
  fireEvent.change(screen.getByLabelText('Live link'),{target:{value:event.live_url}});
  fireEvent.change(screen.getByLabelText('Starts'),{target:{value:'2099-11-20T10:00'}});
  fireEvent.change(screen.getByLabelText('Ends'),{target:{value:'2099-11-20T11:00'}});
  fireEvent.click(screen.getByText('Save event'));
  expect(await screen.findByText('Conversation')).toBeVisible();
  const payload=JSON.parse(quizRequest.mock.calls.find(([,o])=>o?.method==='POST')[1].body);
  expect(payload.lesson_id).toBeUndefined();expect(payload.teacher).toBeUndefined();
  view.unmount();render(<LiveEvents course={{courseId:1}}/>);
  expect(await screen.findByText('Conversation')).toBeVisible();
});
test('creator edits and deletes, while a failed save keeps the form',async()=>{
  let events=[{...event,can_edit:true}];let fail=true;
  quizRequest.mockImplementation(async(path,options)=>{
    if(options?.method==='PUT'){if(fail)throw new Error('Save unavailable');events=[{...events[0],...JSON.parse(options.body)}];}
    if(options?.method==='DELETE')events=[];
    return {can_create:true,events};
  });
  render(<LiveEvents course={{courseId:1}}/>);
  fireEvent.click(await screen.findByText('Edit'));
  fireEvent.change(screen.getByLabelText('Event title'),{target:{value:'Updated'}});
  fireEvent.click(screen.getByText('Save event'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save unavailable');
  expect(screen.getByLabelText('Event title')).toHaveValue('Updated');
  fail=false;fireEvent.click(screen.getByText('Save event'));
  expect(await screen.findByText('Updated')).toBeVisible();
  const confirm=jest.spyOn(window,'confirm').mockReturnValue(true);
  fireEvent.click(screen.getByText('Delete'));
  await waitFor(()=>expect(screen.getByText('No upcoming events yet.')).toBeVisible());
  confirm.mockRestore();
});


test('registration unlocks details and cancellation hides the link again',async()=>{
  let registered=false;
  quizRequest.mockImplementation(async(path,options)=>{
    if(path.endsWith('/register'))registered=options.method==='POST';
    const row={...event,registered};if(!registered){delete row.live_url;delete row.description;}
    return {can_create:false,events:[row]};
  });
  render(<LiveEvents/>);
  fireEvent.click(await screen.findByText('Register'));
  expect(await screen.findByRole('link',{name:'Join event'})).toHaveAttribute('href',event.live_url);
  expect(screen.getByText('Registered')).toBeVisible();
  fireEvent.click(screen.getByText('Cancel registration'));
  await screen.findByText('Register');
  expect(screen.queryByRole('link',{name:'Join event'})).not.toBeInTheDocument();
  expect(screen.queryByText('Details')).not.toBeInTheDocument();
});

test('cancelled events have no registration or join action',async()=>{
  quizRequest.mockResolvedValue({can_create:false,events:[{...event,cancelled:true,registered:false,live_url:undefined}]});
  render(<LiveEvents/>);
  expect(await screen.findByText('Cancelled')).toBeVisible();
  expect(screen.queryByText('Register')).not.toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Join event'})).not.toBeInTheDocument();
});


test('two-month duration shows an error next to Save without submitting',async()=>{
  quizRequest.mockResolvedValue({can_create:true,events:[]});
  render(<LiveEvents/>);
  fireEvent.click(await screen.findByText('+ Add event'));
  fireEvent.change(screen.getByLabelText('Event title'),{target:{value:'Test'}});
  fireEvent.change(screen.getByLabelText('Live link'),{target:{value:event.live_url}});
  fireEvent.change(screen.getByLabelText('Starts'),{target:{value:'2099-11-13T15:13'}});
  fireEvent.change(screen.getByLabelText('Ends'),{target:{value:'2100-01-13T15:13'}});
  fireEvent.click(screen.getByText('Save event'));
  expect(screen.getByRole('alert')).toHaveTextContent('up to 24 hours');
  expect(screen.getByRole('alert').closest('form')).not.toBeNull();
  expect(quizRequest.mock.calls.some(([,o])=>o?.method==='POST')).toBe(false);
});

test('confirmed save returns to list even when the subsequent reload fails',async()=>{
  let saved=false;
  quizRequest.mockImplementation(async(path,options)=>{
    if(options?.method==='POST'){saved=true;return {...JSON.parse(options.body),id:101};}
    if(saved)throw new Error('Refresh failed');
    return {can_create:true,events:[]};
  });
  render(<LiveEvents/>);
  fireEvent.click(await screen.findByText('+ Add event'));
  fireEvent.change(screen.getByLabelText('Event title'),{target:{value:'Saved event'}});
  fireEvent.change(screen.getByLabelText('Live link'),{target:{value:event.live_url}});
  fireEvent.change(screen.getByLabelText('Starts'),{target:{value:'2099-11-13T15:13'}});
  fireEvent.change(screen.getByLabelText('Ends'),{target:{value:'2099-11-13T16:13'}});
  fireEvent.click(screen.getByText('Save event'));
  expect(await screen.findByText('Saved event')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Save event'})).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Saved successfully');
});

test('course entry level is a removable filter, not an access restriction',async()=>{
  quizRequest.mockResolvedValue({can_create:false,events:[{...event,level:'Beginner'},{...event,id:11,title:'Advanced practice',level:'Advanced'}]});
  render(<LiveEvents initialLevel="Beginner" fromCourse="French"/>);
  expect(await screen.findByText('Conversation')).toBeVisible();
  expect(screen.queryByText('Advanced practice')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Show all categories and levels'));
  expect(screen.getByText('Advanced practice')).toBeVisible();
});
