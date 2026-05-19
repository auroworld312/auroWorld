import { useNavigate } from "react-router-dom";
import { createClient } from '@supabase/supabase-js'
import Button from './components/Button';
import Card from './components/Card';
import '@fortawesome/fontawesome-free/css/all.min.css';

function Signup(){
    const navigate = useNavigate();
    const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')

    // const API =
    //     window.location.hostname === "localhost"
    //         ? "http://localhost:8080"
    //         : "https://auroworld.onrender.com";
    const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';
    async function revealPassword(){
        console.log(document.getElementById("password").type)
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

    async function revealPasswordConf(){
        console.log(document.getElementById("passwordConf").type)
        if (document.getElementById("passwordConf").type==="password"){
            document.getElementById("passwordConf").type="text"
            document.getElementById("toggleIconConf").classList.remove('fa-eye');
            document.getElementById("toggleIconConf").classList.add('fa-eye-slash');
        }
        else{
            document.getElementById("passwordConf").type="password"
            document.getElementById("toggleIconConf").classList.remove('fa-eye-slash');
            document.getElementById("toggleIconConf").classList.add('fa-eye');
        }
        return
    }

    async function createAccount( ){
        console.log("hit create account button");
        try{
            console.log("checking username valid")

            const user_res =await fetch(`${API}/user_username/${document.getElementById("username").value}`)
            const user_data = await user_res.json();
            console.log("Check user response:",user_data)

            if(user_data.mData!==false){
                alert("Account with that username already exists. Pick a new one");
                return;
            }

            console.log("checking email validity")
            const email_res =await fetch(`${API}/user_email/${document.getElementById("email").value}`)
            const email_data = await email_res.json();
            console.log("Check email response:",email_data)

            if(email_data.mData!==false){
                alert("Account with that email already exists. Pick a new one");
                return;
            }
            console.log("username and email valid")

            if(document.getElementById("password").value !== document.getElementById("passwordConf").value){
                alert("Passwords must match.")
                return
            }

            const { data, error } = await supabase.auth.signUp({
                email: document.getElementById("email").value,
                password: document.getElementById("password").value,
            })
            if(error){
                console.log("error signing up: "+error.message)
                alert("Problem with signing up.")
                return
            }

            const account_vals={
                email:document.getElementById("email").value,
                username:document.getElementById("username").value,
                user_uuid:data.user.id
            }

            const create_res=await fetch(`${API}/newuser`,{
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(account_vals)
            })
            const create_data=await create_res.json()

            console.log("create_data response "+create_data)

            if(create_data.mStatus!=="ok"){
                alert("Adding new username and email to users table failed: "+data.mMessage);
                return;
            }

            console.log("account created.")
            alert("Thank you for registering! Check your email for a confirmation.")

            supabase.auth.onAuthStateChange(
                async (event, session) => {
                    if (event === 'USER_UPDATED') {
                        const user = session?.user;

                        if (user?.email_confirmed_at) {
                            console.log('Email confirmed!');
                        }
                    }
                }
            );

            const { data: { user } ,err} = await supabase.auth.getUser()
            if(err){
                console.log("problem grabbing uuid" +err.message)
                return
            }
            else if(user){
                console.log("current user's unique id: "+user.id)
                const profVals={
                    email:document.getElementById("email").value,
                    username:document.getElementById("username").value,
                    user_uuid:user.id,
                }
                const res = await fetch(`${API}/profile_attributes`,{
                    method:"POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(profVals)
                })
                const insertProfileRes=await res.json()
                console.log("insertProfileRes: "+insertProfileRes)
                if(insertProfileRes.mStatus!=="ok"){
                    console.log("inserting profile failed: "+insertProfileRes.mMessage)
                }
                console.log("inserting profile good: "+insertProfileRes.mData)
            }

            navigate('/posts');

        } catch(error){
            console.error(error.message)
        }
    }

    return(
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
            <head><link
                rel="stylesheet"
                href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
                />
            </head>
            <Card style={{ width: '400px' }}>
                <h2 style={{ marginTop: 0, textAlign: 'center' }}>Welcome to Auroworld!</h2>
                <p style={{ color: '#666', textAlign: 'center', marginBottom: '20px' }}>Sign up here.</p>
                
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email</label>
                    <input type="text" id="email" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}/>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Username</label>
                    <input type="text" id="username" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}/>
                </div>
                
                <div style={{ marginBottom: '25px' }}>

                    <div className = "password-container" style={{position:"relative"}}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password</label>
                        <input type="password" id="password" style={{display: 'flex', width: '100%', padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box'}}/>
                        <button className="showPassword" onClick={revealPassword} style={{position: "absolute", right: "10px", top: "38px", background: "none", border: "none", cursor: "pointer"}}>
                            <i id="toggleIcon" className="fas fa-eye"></i>
                        </button>
                    </div>

                    <div className = "password-conf-container" style={{position:"relative"}}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Confirm Your Password</label>
                        <input type="password" id="passwordConf" style={{display: 'flex', width: '100%', padding: '10px', paddingRight: '40px',borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}/>
                        <button className="showPassword" onClick={revealPasswordConf} style={{position: "absolute", right: "10px", top: "38px", background: "none", border: "none", cursor: "pointer"}}>
                            <i id="toggleIconConf" className="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                
                <Button style={{ width: '100%' }} onClick={createAccount}>Create my Account</Button>
            </Card>
        </div>
    );
}

export default Signup;
