//import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin} from "@react-oauth/google";
//import { googleLogout } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { createClient } from '@supabase/supabase-js'
import Button from './components/Button';
import Card from './components/Card';
import { useUser } from './UserContext.js';
import '@fortawesome/fontawesome-free/css/all.min.css';

// import 'csb312-auroworld\backend\src\main\java\auroworld\backend\Appmain.js'

//const API = window.location.hostname === "localhost" ? "http://localhost:8080" : "https://auroworld.onrender.com";
const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';

function Login(){
    const navigate = useNavigate();
    const { refreshUser } = useUser();
    const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')

    // function handleLogout(){
    //     googleLogout()
    // }
    function signup(){
        navigate("/signup")
    }

    async function showPassword(){
        // console.log(document.getElementById("password").type)
        if (document.getElementById("password").type==="password"){
            document.getElementById("password").type="text"
            document.getElementById("toggleIcon").classList.remove('fa-eye');
            document.getElementById("toggleIcon").classList.add('fa-eye-slash');
        }
        else{
            document.getElementById("password").type="password"
            document.getElementById("toggleIcon").classList.remove('fa-eye-slash');
            document.getElementById("toggleIcon").classList.add('fa-eye');
        }
        return
    }

    async function resetPasswordButton(){
        const email = window.prompt("Please enter your email for your account: ")

        console.log("resetPasswordButton email: "+email)

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            //redirectTo: `https://csb-312-auroworld.vercel.app/resetpass`,
            redirectTo: `https://auro-world.vercel.app/resetpass`,
        })
        if(error){
            alert("Problem sending reset password to your email. Try again")
            return
        }
        else{
            window.alert("Check your email to reset your password.")
            console.log(data)
            return
        }
    }

    async function userpassLoginButton(){
        var email=document.getElementById("email").value
        var pass = document.getElementById("password").value
        if (!(email && pass)){
            alert("Email and Password fields must not be empty.")
            return null
        }
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: pass,
        });
        if(data){

        }
        if(error){
            console.log(error.message)
            if (error.message==="Invalid login credentials"){
                alert("Wrong email/password. Try again")
            }
            return null
        }
        //console.log(data)
        await refreshUser();
        navigate("/posts")

    }
    async function googleLoginButton(credentialResponse) {
        try{
            const creds=credentialResponse.credential
            const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: creds,
            })
            console.log(error, data)

            const googleAccountInfo = jwtDecode(creds)
            const checkEmail = await fetch(`${API}/user_email/${googleAccountInfo.email}`)
            const checkEmailRes = await checkEmail.json()

            if(checkEmailRes.mData!==true){
                const { data: { user } ,error} = await supabase.auth.getUser()
                if(error){
                    console.log("problem grabbing uuid" +error.message)
                    return
                }

                var userInput=null

                while (true){
                    userInput= window.prompt("Please enter a username:");

                    const hasSpace = /\s/.test(userInput);

                    if(hasSpace!==false){
                        window.alert("Usernames may not contain spaces. Please pick another")
                    }
                    else if(userInput===null){
                        window.alert("Cannot enter an empty username. Try again")
                    }
                    else if(userInput.length<5 || userInput.length>15){
                        window.alert("Usernames must be between 5 and 15 characters inclusive. Please pick another")
                    }
                    else{
                        const user_res =await fetch(`${API}/user_username/${userInput}`)
                        const user_data = await user_res.json();

                        if(user_data.mData!==false){
                            window.alert("Username is taken. Please pick another")
                        }
                        else{
                            break
                        }
                    }
                }

                const accountInfo={
                    username:userInput,
                    email:googleAccountInfo.email,
                    user_uuid:user.id,
                    lastname:googleAccountInfo.family_name,
                    firstname:googleAccountInfo.given_name
                }

                console.log("accountInfo: ",accountInfo)

                const response = await fetch(`${API}/auth/newuser`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(accountInfo)
                });

                const data = await response.json();
                console.log("Signup response:",data)

                if(data.mStatus!=="ok"){
                    alert("Signup failed: "+data.mMessage);
                    console.log(data.mData)
                    return;
                }
            }

        } catch(error){
            console.error(error.message)
        }
        await refreshUser();
        navigate("/posts");
    }
    return(
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
            <Card style={{ width: '100%', maxWidth: '400px' }}>
                <GoogleLogin onSuccess={(credentialResponse)=>{
                    console.log(credentialResponse)
                    console.log(jwtDecode(credentialResponse.credential))
                    googleLoginButton(credentialResponse)
                }} onError={()=>console.log("Login Failed")}></GoogleLogin>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '15px' }}>
                    <label>Email</label>
                    <input type="text" id="email" style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}/>
                </div>
                
                {/* <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                    <label>Password</label>
                    <div className = "password-container" style={{position:"relative"}}>
                        <input type="password" id="password" style={{display: 'flex', width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box'}}/>
                        <button className="showPassword" onClick={showPassword} style={{position: "absolute", right: "10px", top: "38px", background: "none", border: "none", cursor: "pointer"}}>
                            <i id="toggleIcon" className="fas fa-eye"></i>
                        </button>
                    </div>
                </div> */}
                <div className = "password-container" style={{position:"relative"}}>
                    <label>Password</label>
                    <input type="password" id="password" style={{display: 'flex', width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box'}}/>
                    <button className="showPassword" onClick={showPassword} style={{position: "absolute", right: "10px", top: "38px", background: "none", border: "none", cursor: "pointer"}}>
                        <i id="toggleIcon" className="fas fa-eye"></i>
                    </button>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <Button onClick={userpassLoginButton}>Login</Button>
                    <Button variant="secondary" onClick={signup}>Sign Up</Button>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <Button onClick={resetPasswordButton}>Reset Password</Button>
                </div>

            </Card>
        </div>
    );
}
export default Login;
