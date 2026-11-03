import { render, screen, fireEvent, waitFor } from '@testing-library/react';
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), Link: ({children,to}) => <a href={to}>{children}</a> }), { virtual: true });
import AuthPage from './AuthPage';
import { supabase } from './utils/supabaseClient';
import { quizRequest } from './quizApi';
jest.mock('./utils/supabaseClient', () => ({ supabase: { auth: { signInWithPassword: jest.fn(), signUp: jest.fn(), signInWithIdToken: jest.fn(), resetPasswordForEmail: jest.fn() } } }));
jest.mock('./quizApi', () => ({ quizRequest: jest.fn() }));
jest.mock('./UserContext', () => ({ useUser: () => ({ refreshUser: jest.fn() }) }));
jest.mock('@react-oauth/google', () => ({ GoogleLogin: ({onSuccess}) => <button onClick={() => onSuccess({credential:'test'})}>Google</button> }));
beforeEach(() => jest.clearAllMocks());
function mount(signup=false){render(<AuthPage signup={signup}/>);}
test('failed password login shows an error and allows retry',async()=>{
 supabase.auth.signInWithPassword.mockResolvedValue({error:new Error('Invalid login credentials')});mount();
 fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'test@example.test'}});
 fireEvent.change(screen.getByLabelText('Password'),{target:{value:'password'}});
 fireEvent.click(screen.getByRole('button',{name:'Sign in'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials');
 expect(screen.getByRole('button',{name:'Sign in'})).not.toBeDisabled();
 expect(quizRequest).not.toHaveBeenCalled();
});
test('new Google login asks for a role and never offers admin',async()=>{
 supabase.auth.signInWithIdToken.mockResolvedValue({error:null});quizRequest.mockResolvedValue({ready:false});mount();
 fireEvent.click(screen.getByText('Google'));
 expect(await screen.findByRole('button',{name:'Complete account'})).toBeInTheDocument();
 expect(screen.getAllByRole('radio')).toHaveLength(2);
 fireEvent.change(screen.getByLabelText('Username'),{target:{value:'new_teacher'}});
 fireEvent.click(screen.getByRole('radio',{name:/Teacher/}));
 fireEvent.click(screen.getByRole('button',{name:'Complete account'}));
 await waitFor(()=>expect(quizRequest).toHaveBeenLastCalledWith('/account/setup',expect.objectContaining({body:JSON.stringify({username:'new_teacher',role:'instructor'})})));
});
test('email confirmation does not call an unauthenticated account creation endpoint',async()=>{
 supabase.auth.signUp.mockResolvedValue({data:{session:null},error:null});mount(true);
 fireEvent.change(screen.getByLabelText('Username'),{target:{value:'student_one'}});
 fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'test@example.test'}});
 fireEvent.change(screen.getByLabelText('Password'),{target:{value:'password'}});
 fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'password'}});
 fireEvent.click(screen.getByRole('button',{name:'Create account'}));
 expect(await screen.findByRole('status')).toHaveTextContent('Check your email');
 expect(quizRequest).not.toHaveBeenCalled();
});
