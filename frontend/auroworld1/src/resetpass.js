import { useNavigate } from "react-router-dom";
import { createClient } from '@supabase/supabase-js'
import Button from './components/Button';
import '@fortawesome/fontawesome-free/css/all.min.css';

function ResetPassword(){
    const navigate = useNavigate();
    const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')

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

    async function changePassword(){
        const pass = document.getElementById("password").value
        const hasSpace = /\s/.test(pass);

        if(hasSpace){
            window.alert("Password may not contain any spaces")
            return
        }
        else if(pass===""){
            window.alert("Password cannot be empty")
            return
        }
        else if(pass.length<5){
            window.alert("Password needs to be at least 5 characters")
            return
        }
        else{
            const { data, error } = await supabase.auth.updateUser({ password: pass })
            if(error){
                console.log("auth.updateUser error: "+error)
                window.alert(error.message)
                return
            }
            else{
                console.log("auth.updateUser data: "+data)
                window.alert("You have successfully reset your password.")
                navigate("/posts")
            }
        }
    }

    return(
        <div>
            <label>Enter a new password:</label>
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
            <Button onClick={changePassword}>Enter</Button>
        </div>
    )
}

export default ResetPassword