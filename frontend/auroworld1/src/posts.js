import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js'
import Button from './components/Button';
import Card from './components/Card';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { useUser } from './UserContext';

const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')

//const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld.onrender.com';
const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COURSE_COLORS = ['#6C63FF', '#0f9d58', '#f4511e', '#8430ce', '#e91e63', '#00bcd4'];

function parseDays(timesStr) {
    if (!timesStr) return [];
    const s = timesStr.toUpperCase();
    const days = new Set();

    if (s.includes('MWF')) { days.add(1); days.add(3); days.add(5); }
    else if (s.includes('M/W') || s.includes('MW')) { days.add(1); days.add(3); }
    else if (s.includes('T/TH') || s.includes('TTH') || s.includes('TUTH')) { days.add(2); days.add(4); }
    else {
        if (s.includes('SU') || s.includes('SUN')) days.add(0);
        if (s.includes('TH') || s.includes('R')) days.add(4);
        if (s.includes('TU')) days.add(2);
        if (s.includes('SA') || s.includes('SAT')) days.add(6);
        if (s.includes('M') && !days.has(1)) days.add(1);
        if (s.includes('W') && !days.has(3)) days.add(3);
        if (s.includes('F') && !days.has(5)) days.add(5);
    }

    return [...days];
}

function TodaySchedule({ enrolledCourses, navigate }) {
    const now = new Date();
    const todayDow = now.getDay();
    const dayName = DAY_NAMES[todayDow];
    const monthName = MONTH_NAMES[now.getMonth()];
    const dateNum = now.getDate();
    const year = now.getFullYear();

    const todayCourses = enrolledCourses.filter(course => {
        const days = parseDays(course.times);
        return days.includes(todayDow);
    });

    return (
        <div style={{ width: '280px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>Today is</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>{dayName}</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#111', lineHeight: 1.1, marginTop: '2px' }}>{monthName}</div>
                <div style={{ fontSize: '52px', fontWeight: '900', color: '#111', lineHeight: 1 }}>{dateNum}</div>
                <div style={{ fontSize: '16px', color: '#555', marginTop: '2px' }}>{year}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                {todayCourses.length === 0 && (
                    <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', color: '#aaa', fontSize: '14px', textAlign: 'center' }}>
                        No classes today.
                    </div>
                )}
                {todayCourses.map((course, idx) => {
                    const color = COURSE_COLORS[idx % COURSE_COLORS.length];
                    return (
                        <div key={course.courseId} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: course.inSession ? `1.5px solid ${color}` : '1px solid #e5e5e5' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '10px', backgroundColor: '#e8e8e8', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                                    📚
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#111', marginBottom: '2px' }}>{course.title}</div>
                                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>Instructor: {course.instructor}</div>
                                    <div style={{ fontSize: '12px', color: '#888' }}>Times: {course.times}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                                <button
                                    onClick={() => navigate(`/courses/${course.courseId}`)}
                                    style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', backgroundColor: color, color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    Join Class
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: course.inSession ? '#e53935' : '#aaa' }}>
                                    {course.inSession ? 'Live' : 'Not Live'}
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: course.inSession ? '#e53935' : '#ccc' }}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Posts(){
    const navigate=useNavigate();
    const { displayName, email, avatarUrl } = useUser();

    function getInitials() {
        const name = displayName || email || '';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name[0]?.toUpperCase() || '?';
    }

    function getAvatarColor() {
        const colors = ['#6C63FF', '#FF6584', '#43B89C', '#F6B93B', '#E55039', '#2E86AB'];
        const str = email || '';
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    }

    async function getCurrentUserId(){
        const { data: { user } ,error} = await supabase.auth.getUser()
        if(error){ return }
        else if(user){ return user.id }
    }
    // async function getUsername(uuid){
    //     try{
    //         const usernameResponse = await fetch(`${API}/username/${uuid}`)
    //         const usernameData = await usernameResponse.json()
    //         if (usernameData.mStatus!=="ok"){ alert("Problem grabbing username") }
    //         return usernameData.mData
    //     }catch(error){ console.log(error.message) }
    //     return
    // }

    const [userAttributes,setUserAttributes]=useState(null)
    useEffect(()=>{
        async function getUserAtts(){
            try{
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { return; }
                const uuidString = user.id
                const res= await fetch(`${API}/userdata/${uuidString}`)
                const data = await res.json()
                //console.log("getUserAtts mData: "+data.mData.role)
                setUserAttributes(data.mData)
            }catch(error){
                console.log(error.message)
            }
            return
        }
        getUserAtts()
    },[])

    function mainpageButton(){ navigate("/posts") }
    function coursesButton(){ navigate("/courses") }
    function adminButton(){ navigate("/admin") }

    async function signoutButton(){
        const { error } = await supabase.auth.signOut();
        if (!error) { navigate("/login") }
        else { console.error('Error signing out:', error.message); }
    }

    async function postButton(){
        document.getElementById("addPost").style.display="block";
    }

    async function addPostButton(username){
        //console.log("username: "+username)
        if(!document.getElementById("newTitle").value || !document.getElementById("newPost").value){
            alert("Title or caption aren't filled out")
            return
        }
        //console.log("prevUrl: "+prevUrl)
        try{
            const current_uuid = await getCurrentUserId()
            // const username = await getUsername(current_uuid)
            const postBody = {
                subject: document.getElementById("newTitle").value,
                message: document.getElementById("newPost").value,
                user_uuid: current_uuid
            };
            const response = await fetch(`${API}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(postBody)
            });
            const data = await response.json();
            if(data.mStatus!=="ok"){ alert("Message Post failed some fields are empty"); return; }
            if(fileUpload) { addFileToTable(data.mData.msgId) }
            testDomButton(
                document.getElementById("newTitle").value, document.getElementById("newPost").value,
                0, username, data.mData.msgId, current_uuid, []
            )

        } catch(error){ console.error(error.message) }
        cancelPostButton();
    }

    function testDomButton(title, message, upvote, username, msg_id, uuid,comments){
        const newPost=[{ msgId:msg_id, subject:title, message:message, upvote:upvote, username:username, uuid:uuid,commentdata:comments }]
        setPosts((prevPosts)=>{ return [...prevPosts,...newPost] })
    }

    function cancelPostButton(){
        document.getElementById("addPost").style.display="none";
    }

    async function addFileToTable(msg_id){
        try{
            const current_uuid = await getCurrentUserId()
            const fileBody={ filename:fileUpload.name, msgId:msg_id, user_uuid:current_uuid }
            const response=await fetch(`${API}/files`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(fileBody) });
            const fileData = await response.json()
            if (fileData.mStatus!=="ok"){ alert("File Post failed: "+fileData.mMessage); return }
            const {data,error} = await supabase.storage.from('community_feed_file_upload').upload('posts/'+msg_id+'/'+fileUpload.name, fileUpload)
            if(data){ 
                console.log("data.path: "+data.path)
                photoDom(msg_id,data.path) 
                //console.log(data) 
            } 
            else { 
                console.log(error.message) 
            }
        }catch (error){ console.error(error.message) }
    }
    function photoDom(msgId,path) {
        const { data } = supabase
            .storage
            .from('community_feed_file_upload')
            .getPublicUrl(path)
        if(data){
            //console.log("publicUrl data: "+data.publicUrl)
            setImageUrls(prev => ({
                ...prev,
                [msgId]: data.publicUrl
            }));
        }
    }

    function editCommentButton(com_id){
        document.getElementById(`editComment-${com_id}`).style.display="block"
    }

    async function sendEditCommentButton(msg_id,com_id){
        try{
            const comBody={ comment:document.getElementById(`editCommentText-${com_id}`).value }
            const response = await fetch(`${API}/put/comment/${com_id}`,{ method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(comBody) })
            const editCommentData = await response.json()
            if(editCommentData.mStatus!=="ok"){ alert("Editing comment failed. Try again later"); return }
            editCommentDom(msg_id,com_id,document.getElementById(`editCommentText-${com_id}`).value)
            cancelEditCommentButton(com_id)
        }catch(error){ console.log(error.message) }
    }

    function editCommentDom(msgId, comId, text){
        const updatedPosts = posts.map((post)=>{
            if(post.msgId===msgId){
                const editedComment=post.commentdata.map((c)=>{
                    if(c.commentId===comId){ return{ ...c, comment:text } }
                    return c
                })
                return{ ...post, commentdata:editedComment }
            }
            return post
        })
        setPosts(updatedPosts)
    }

    function cancelEditCommentButton(com_id){
        document.getElementById(`editComment-${com_id}`).style.display="none"
    }

    function editPostButton(msg_id){
        document.getElementById(`editPost-${msg_id}`).style.display="block";
    }

    async function sendEditPostButton(msg_id){
        if(!document.getElementById(`editTitle-${msg_id}`).value || !document.getElementById(`editMessage-${msg_id}`).value ){
            alert("Title or caption empty")
            return
        }
        try{
            const putBody={
                subject:document.getElementById(`editTitle-${msg_id}`).value,
                message:document.getElementById(`editMessage-${msg_id}`).value,
            };
            const response = await fetch(`${API}/messages/${msg_id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(putBody) });
            const data = await response.json()
            if (data.mStatus!=="ok"){ alert("Edit post failed: "+data.mMessage); return }
            //if(fileUpload){ editFileInTable(msg_id) }
            editDomButton(msg_id,document.getElementById(`editTitle-${msg_id}`).value,document.getElementById(`editMessage-${msg_id}`).value)
        }catch(error){ console.error(error.message) }
        cancelEditPostButton(msg_id);
    }
    // function photoDom(msgId,path) {
    //     const { data } = supabase
    //         .storage
    //         .from('community_feed_file_upload')
    //         .getPublicUrl(path)
    //     if(data){
    //         console.log("publicUrl data: "+data.publicUrl)
    //         setImageUrls(prev => ({
    //             ...prev,
    //             [msgId]: data.publicUrl
    //         }));
    //     }
    // }

    function editDomButton(msgId,sub,msg){
        const updatedPost=posts.map((post)=>{
            if(post.msgId===msgId){ return{ ...post, subject:sub, message:msg } }
            return post
        })
        setPosts(updatedPost)

        // const updatedUrl = imageUrls.map((url,)=>{
        //     if(url[msgId]===){}
        //     return url
        // })
        // setImageUrls(updatedUrl)
    }

    function cancelEditPostButton(msg_id){
        document.getElementById(`editPost-${msg_id}`).style.display="none";
    }

    // async function editFileInTable(msg_id){
    //     try{
    //         const editFileBody={ filename:fileUpload.name }
    //         const response=await fetch(`${API}/files/${msg_id}`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(editFileBody) });
    //         const fileData = await response.json()
    //         if (fileData.mStatus!=="ok"){ alert("File Post failed: "+fileData.mMessage); return }
    //     }catch (error){ console.error(error.message) }
    // }

    function commentButton(msg_id){
        const p = posts.find((item) => item.msgId === msg_id);
        if(p.commentdata && p.commentdata.length>0 && document.getElementById(`commentList-${msg_id}`).style.display==="none"){
            document.getElementById(`commentList-${msg_id}`).style.display="block"
        }
        else if(p.commentdata && p.commentdata.length>0 && document.getElementById(`commentList-${msg_id}`).style.display==="block"){
            document.getElementById(`commentList-${msg_id}`).style.display="none"
        }
        if(document.getElementById(`addComment-${msg_id}`).style.display==="none"){
            document.getElementById(`addComment-${msg_id}`).style.display="block";
        }
        else if(document.getElementById(`addComment-${msg_id}`).style.display==="block"){
            document.getElementById(`addComment-${msg_id}`).style.display="none";
        }
    }

    async function addCommentButton(msg_id,username){
        try{
            const current_uuid = await getCurrentUserId()
            //const username = await getUsername(current_uuid)
            const commBody={ user_uuid:current_uuid, comment:document.getElementById(`newComment-${msg_id}`).value }
            const res = await fetch(`${API}/messages/${msg_id}/comments`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(commBody) })
            const data = await res.json()
            if(data.mStatus!=="ok"){ alert("Comment failed: "+data.mMessage); return }
            commentDomButton(document.getElementById(`newComment-${msg_id}`).value,msg_id,data.mData,username,current_uuid)
        }catch(error){ console.error(error.message) }
    }

    function commentDomButton(comment_text, msg_id,c_id,username,uuid){
        const updatedPosts = posts.map((post)=>{
            if (post.msgId===msg_id){
                return { ...post, commentdata:[...post.commentdata, { comment:comment_text, commentId:c_id, username:username, upvote:0, uuid:uuid }] }
            }
            return post
        })
        setPosts(updatedPosts)
    }

    async function upvoteButton(msg_id){
        try{
            const current_uuid = await getCurrentUserId()
            const res = await fetch(`${API}/vote_messages/${msg_id}`,{ method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ user_uuid:current_uuid }) })
            const data=await res.json()
            if(data.mStatus!=="ok"){ return }
            if(data.mData===0){ messageUpvoteDom(msg_id,-1) } else { messageUpvoteDom(msg_id,1) }
        }catch(error){ console.error(error.message) }
    }

    function messageUpvoteDom(msg_id,change){
        const newPosts = posts.map((post)=>{
            if (post.msgId===msg_id){ return { ...post, upvote:post.upvote+change } }
            else { return post }
        })
        setPosts(newPosts)
        const num = likedPosts.find((item) => item===msg_id);
        if(num===msg_id){ setLikedPosts(likedPosts.filter(p=> p!==msg_id)); return }
        else { setLikedPosts((prevPosts)=>{ return [...prevPosts,msg_id] }) }
    }

    async function upvoteCommentButton(comment_id, msg_id){
        try{
            const current_uuid = await getCurrentUserId()
            const res=await fetch(`${API}/vote_comments/comment/${comment_id}/msg/${msg_id}`,{ method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ user_uuid:current_uuid }) })
            const data = await res.json()
            if(data.mStatus!=="ok"){ alert("Upvoting comment failed. Try again later"); return }
            if(data.mData===0){ commentUpvoteDom(msg_id,comment_id,-1) } else { commentUpvoteDom(msg_id,comment_id,1) }
        }catch(error){ console.error(error.message) }
    }

    function commentUpvoteDom(msg_id,com_id,change){
        const updatedPosts = posts.map((post)=>{
            if (post.msgId===msg_id){
                const upvotedComment=post.commentdata.map((c)=>{
                    if(c.commentId===com_id){ return{ ...c, upvote:c.upvote+change } }
                    return c
                })
                return { ...post, commentdata:upvotedComment }
            }
            return post
        })
        setPosts(updatedPosts)
        const num = likedComments.find((item) => item===com_id);
        if(num===com_id){ setLikedComments(likedComments.filter(com=> com!==com_id)); return }
        else { setLikedComments((prevComments)=>{ return [...prevComments,com_id] }) }
    }

    function cancelCommentButton(msg_id){
        document.getElementById(`commentList-${msg_id}`).style.display="none"
        document.getElementById(`addComment-${msg_id}`).style.display="none";
    }

    async function downloadFile(msg_id){
        const downloadFilename = imageUrls[msg_id].split('/').pop()
        const { data, error } = await supabase.storage.from('community_feed_file_upload').download('posts/'+msg_id+'/'+downloadFilename)
        if(error){ console.log("downloadFile: "+error); alert("Problem downloading file, try again later"); return }
        else if(data){
            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = downloadFilename;
            link.click();
        }
    }

    async function deleteCommentButton(msgId,commentId){
        try{
            const deleteCommentResponse = await fetch(`${API}/delete/comment/${commentId}`,{ method:"DELETE", headers:{"Content-Type":"application/json"} })
            const deleteCommentData = await deleteCommentResponse.json()
            if(deleteCommentData.mStatus!=="ok"){ alert("Deleting comment failed. Try again later"); return }
            alert("Comment deleted")
            deleteCommentDom(msgId,commentId)
        }catch(error){ console.log(error.message) }
    }

    function deleteCommentDom(msgId,commentId){
        setPosts(prevPosts =>
            prevPosts.map(post => {
                if (post.msgId === msgId) {
                    return { ...post, commentdata: post.commentdata.filter(cItem => cItem.commentId !== commentId) }
                }
                return post;
            })
        )
    }

    async function deletePostButton(msgId, uuid){
        try{
            const deleteBody={ userUuid:uuid }
            const deleteMessageResponse = await fetch(`${API}/delete/message/${msgId}`,{ method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify(deleteBody) })
            const deleteMessageData = await deleteMessageResponse.json()
            if (deleteMessageData.mStatus!=="ok"){ alert("Deleting post failed"); return }
            else if(deleteMessageData.mData!==null){
                const { data, error } = await supabase.storage.from('community_feed_file_upload').remove([deleteMessageData.mData])
                if(data){ console.log(data) } else if(error){ console.log(error.message) }
            }
            testDeleteDom(msgId)
            alert("Post deleted")
        }catch(error){ console.log(error.message) }
    }

    function testDeleteDom(msg_id){
        setPosts(posts.filter(p=> p.msgId!==msg_id))
    }

    const [likedPosts,setLikedPosts]=useState([])
    useEffect(()=>{
        async function getLikedPosts(){
            const userId = await getCurrentUserId()
            fetch(`${API}/likedmessages/${userId}`)
            .then(res=>res.json())
            .then(data=>{ setLikedPosts(data.mData) })
            .catch(err=>console.error("fetch error for liked posts: ",err))
        }
        getLikedPosts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    const [likedComments,setLikedComments]=useState([])
    useEffect(()=>{
        async function getLikedComments(){
            const userId = await getCurrentUserId()
            fetch(`${API}/likedcomments/${userId}`)
            .then(res=>res.json())
            .then(data=>{ setLikedComments(data.mData) })
            .catch(err=>console.error("fetch error for liked comments: ",err))
        }
        getLikedComments()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    const [posts, setPosts] = useState([])

    useEffect(() => {
        async function gatherMyPosts(){
            //const userId = await getCurrentUserId()
            //console.log("userId is: "+userId)
            fetch(`${API}/messages`)
            .then(res => res.json())
            .then(data => { setPosts(data.mData); })
            .catch(err => console.error("FETCH ERROR for getting posts:", err))
        }
        gatherMyPosts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    const [imageUrls, setImageUrls] = useState({});

    useEffect(() =>{
        async function loadImages(){
            if(!posts) return
            const newUrls=[]
            for (const post of posts) {
                try{
                    const { data } = supabase.storage.from('community_feed_file_upload').getPublicUrl(post.filepath);
                    newUrls[post.msgId] = data.publicUrl;
                }catch(error){ 
                    //console.log(error.message); 
                    newUrls[post.msgId]=null 
                }
            }
            //console.log("newUrls: "+newUrls)
            setImageUrls(newUrls);
        }
        loadImages()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[posts])

    // for (const u of imageUrls){
    //     console.log("u: "+u)
    // }

    const [fileUpload,setFileUpload]=useState()
    const [previewUrl, setPreviewUrl] = useState();
    const [fileName, setFileName] = useState("No file chosen");

    function uploadImageHandler(e){
        const file = e.target.files[0];
        if (file) { setFileUpload(file); setPreviewUrl(URL.createObjectURL(file)); setFileName(file.name); }
        else { setFileName("No file chosen"); }
    }

    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserName, setCurrentUserName] = useState("Loading...");

    useEffect(() => {
        async function fetchUserData() {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
                try {
                    const { data: profileData, error: profileError } = await supabase
                        .from('users').select('firstname, lastname, username').eq('email', user.email).single();
                    if (profileData) { setCurrentUserName(`${profileData.firstname} ${profileData.lastname}`); }
                    else if(profileError){ setCurrentUserName(user.email?.split('@')[0] || "User"); }
                } catch (err) { setCurrentUserName(user.email?.split('@')[0] || "User"); }
            } else if(authError){ setCurrentUserName("Guest"); }
        }
        fetchUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [data, setData] = useState([]);
    const [sortType, setSortType] = useState('sortByNewest');

    useEffect(() => {
        const sortArray = type =>{
            const types ={ sortByNewest:'msgId', sortByUpvotes:'upvote' }
            const sortProperty=types[type]
            const sorted = [...posts].sort((a,b) => b[sortProperty]-a[sortProperty])
            setData(sorted)
        }
        sortArray(sortType)
    }, [sortType, posts])

    const [postUsernameQuery,setPostUsernameQuery] = useState("")

    const [enrolledCourses, setEnrolledCourses] = useState([]);

    useEffect(() => {
        async function loadEnrolled() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            try {
                const res = await fetch(`${API}/courses/enrolled/${user.id}`);
                const data = await res.json();
                setEnrolledCourses(data.mData || []);
            } catch(e) { console.error(e); }
        }
        loadEnrolled();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // console.log("userAttributes.role: "+userAttributes?.role)
    // console.log("userAttributes.username: "+userAttributes?.username)

    return(
        <div style={{ display:'flex', height:'100vh', width:'100vw', margin:'0', overflow:'hidden', backgroundColor:'#E3C7E6', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontSize:'16px', color:'#111' }}>
            
            <Sidebar onMainpage={mainpageButton} onCourses={coursesButton} onSignout={signoutButton} onAdmin={adminButton} />

            <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
                
                <Header username={currentUserName} />

                <div style={{ flex:1, overflow:'hidden', padding:'20px', display:'flex', gap:'20px' }}>

                    <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'16px' }}>

                        {/* Post composer */}
                        <div style={{ backgroundColor:'#fff', borderRadius:'12px', padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:'12px' }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="avatar" style={{ width:'42px', height:'42px', borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                            ) : (
                                <div style={{ width:'42px', height:'42px', borderRadius:'50%', backgroundColor:getAvatarColor(), display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#fff', flexShrink:0 }}>
                                    {getInitials()}
                                </div>
                            )}
                            <div onClick={postButton} style={{ flex:1, padding:'10px 16px', borderRadius:'24px', backgroundColor:'#f0f2f5', color:'#888', fontSize:'15px', cursor:'pointer' }}>
                                What's on your mind?
                            </div>
                            <Button onClick={postButton}>Post</Button>
                        </div>

                        <div id="addPost" style={{display:"none"}}>
                            <Card>
                                <h3 style={{ marginTop:0 }}>Add a New Entry</h3>
                                <label style={{ fontWeight:'bold' }}>Title</label>
                                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                                    <input type="file" id="hiddenAddFileInput" onChange={uploadImageHandler} style={{ display:'none' }}></input>
                                    <Button variant="secondary" onClick={() => document.getElementById("hiddenAddFileInput").click()}>Upload File</Button>
                                    <span style={{ fontSize:'14px', color:'#666', fontWeight:'normal' }}>{fileName}</span>
                                </div>
                                <img src={previewUrl} alt="" style={{ maxWidth:'100%', borderRadius:'8px' }}></img>
                                {fileUpload &&(
                                    <div style={{ margin:'10px 0', fontSize:'14px', color:'#666' }}>
                                        <p>Selected File: {fileUpload.name}</p>
                                        <p>Size: {fileUpload.size} bytes</p>
                                        <p>Type: {fileUpload.type}</p>
                                    </div>
                                )}
                                <input type="text" id="newTitle" style={{ padding:'8px', border:'1px solid #ccc', borderRadius:'4px', marginBottom:'10px', width:'100%', boxSizing:'border-box' }} />
                                <textarea id="newPost" style={{ padding:'8px', border:'1px solid #ccc', borderRadius:'4px', marginBottom:'10px', width:'100%', minHeight:'80px', boxSizing:'border-box' }}></textarea>
                                <div style={{ display:'flex', gap:'10px' }}>
                                    <Button onClick={()=> addPostButton(userAttributes.username)}>Send</Button>
                                    <Button variant="secondary" onClick={cancelPostButton}>Cancel</Button>
                                </div>
                            </Card>
                        </div>

                        <div style={{ display:'flex', gap:'10px' }}>
                            <select onChange={(e) => setSortType(e.target.value)} style={{ flex:1, padding:'8px 12px', borderRadius:'8px', border:'1px solid #e0e0e0', backgroundColor:'#fff', fontSize:'14px' }}>
                                <option value="sortByNewest">Sort Posts By New</option>
                                <option value="sortByUpvotes">Sort Posts By Upvotes</option>
                            </select>
                            <input type="text" placeholder="Search by username..." onChange={(e) => setPostUsernameQuery(e.target.value)} style={{ flex:2, padding:'8px 12px', borderRadius:'8px', border:'1px solid #e0e0e0', fontSize:'14px' }} />
                        </div>

                        <div id="messageList" style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                            {data.filter((post)=>post.username?.toLowerCase().includes(postUsernameQuery))?.map((post) => (
                            
                            <div key={post.msgId} style={{ backgroundColor:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>

                                {/* Post header */}
                                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                                    <div style={{ width:'42px', height:'42px', borderRadius:'50%', backgroundColor:'#6C63FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:'700', color:'#fff', flexShrink:0 }}>
                                        {post.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight:'700', fontSize:'15px', color:'#111' }}>{post.username}</div>
                                        <div style={{ fontSize:'12px', color:'#aaa' }}>#{post.msgId}</div>
                                    </div>
                                    { (userAttributes.role==="admin" || (currentUserId && post.uuid === currentUserId)) && (
                                        <button onClick={() => editPostButton(post.msgId)} style={{ float:"right", marginLeft:'auto', background:'none', border:'1px solid #e0e0e0', borderRadius:'8px', fontSize:'20px', cursor:'pointer', color:'#555' }}>
                                            Edit <i className="fas fa-edit"></i>
                                        </button>
                                    )}
                                    {(userAttributes.role==="admin" || (currentUserId && post.uuid === currentUserId)) && (
                                        <button onClick={() => deletePostButton(post.msgId,currentUserId)} style={{ float:"right", background:'none', border:'1px solid #e0e0e0', borderRadius:'8px', fontSize:'20px', cursor:'pointer', color:'#555' }}>
                                            Delete <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    )}
                                </div>

                                {/* Post content */}
                                <div style={{ fontSize:'25px', fontWeight:'700', marginBottom:'8px', color:'#111' }}>{post.subject}</div>
                                <div style={{ fontSize:'20px', color:'#333', lineHeight:'1.5', marginBottom:'14px' }}>{post.message}</div>

                                {imageUrls[post.msgId] && (
                                    <img src={imageUrls[post.msgId]} alt="Post attachment" style={{ maxWidth:'100%', borderRadius:'10px', marginBottom:'14px' }} />
                                )}

                                <p style={{ fontSize:'20px', fontWeight:'bold' }}>{post.upvote} Upvotes</p>

                                {imageUrls[post.msgId] && (
                                    <div style={{ display:'flex', gap:'10px', marginTop:'10px', flexWrap:'wrap' }}>
                                        <Button variant="secondary" onClick={()=> downloadFile(post.msgId)}>
                                            Download <i className="fa-solid fa-download"></i>
                                        </Button>
                                    </div>
                                )}

                                {/* Action bar */}
                                <div style={{ display:'flex', alignItems:'center', gap:'16px', paddingTop:'12px', borderTop:'1px solid #f0f0f0' }}>
                                    {likedPosts.find((item) => item===post.msgId) && (
                                        <button onClick={() => upvoteButton(post.msgId)} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', fontSize:'40px', color:'#555', fontWeight:'600' }}>
                                            <i className="fa-solid fa-thumbs-up" style={{color:" rgb(177, 151, 252)"}}></i>
                                        </button>
                                    )}
                                    {!(likedPosts.find((item) => item===post.msgId)) && (
                                        <button onClick={() => upvoteButton(post.msgId)} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', fontSize:'40px', color:'#555', fontWeight:'600' }}>
                                           <i className="fa-regular fa-thumbs-up"></i>
                                        </button>
                                    )}
                                    <button onClick={() => commentButton(post.msgId)} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', fontSize:'35px', color:'#555', fontWeight:'600' }}>
                                        💬 Comment
                                    </button>
                                </div>

                                <div id={`editPost-${post.msgId}`} style={{display:"none", marginTop:'15px'}}>
                                    <Card variant="dark">
                                        <h3 style={{ marginTop:0 }}>Edit Entry</h3>
                                        <label style={{ fontWeight:'bold' }}>Title</label>
                                        <img src={fileUpload} alt="" style={{ maxWidth:'100%', borderRadius:'8px' }}></img>
                                        <input type="text" defaultValue={post.subject} id={`editTitle-${post.msgId}`} style={{ padding:'8px', border:'1px solid #ccc', borderRadius:'4px', marginBottom:'10px', width:'100%', boxSizing:'border-box' }} />
                                        <textarea id={`editMessage-${post.msgId}`} defaultValue={post.message} style={{ padding:'8px', border:'1px solid #ccc', borderRadius:'4px', marginBottom:'10px', width:'100%', minHeight:'80px', boxSizing:'border-box' }}></textarea>
                                        <div style={{ display:'flex', gap:'10px' }}>
                                            <Button onClick={() => sendEditPostButton(post.msgId)}>Send</Button>
                                            <Button variant="secondary" onClick={() => cancelEditPostButton(post.msgId)}>Cancel</Button>
                                        </div>
                                    </Card>
                                </div>

                                <div id={`addComment-${post.msgId}`} style={{display:"none", marginTop:'15px'}}>
                                    <Card variant="dark">
                                        <h3 style={{ marginTop:0 }}>Make a Comment</h3>
                                        <label style={{ fontWeight:'bold' }}>Message</label>
                                        <textarea id={`newComment-${post.msgId}`} style={{ padding:'8px', border:'1px solid #ccc', borderRadius:'4px', marginBottom:'10px', width:'100%', minHeight:'60px', boxSizing:'border-box' }}></textarea>
                                        <div style={{ display:'flex', gap:'10px' }}>
                                            <Button onClick={() => addCommentButton(post.msgId,userAttributes.username)}>Send</Button>
                                            <Button variant="secondary" onClick={() => cancelCommentButton(post.msgId)}>Cancel</Button>
                                        </div>
                                    </Card>
                                </div>

                                {/* Comments */}
                                {post.commentdata && post.commentdata.length > 0 && (
                                    <div id={`commentList-${post.msgId}`} style={{display:"none"}}>
                                        <div style={{ marginTop:'15px', paddingTop:'15px', borderTop:'1px solid #f0f0f0', display:'flex', flexDirection:'column', gap:'10px' }}>
                                            {[...post.commentdata]?.reverse().map((comment)=>(
                                                <div key={comment.commentId} style={{ backgroundColor:'#f7f7f7', padding:'12px 14px', borderRadius:'10px' }}>
                                                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                                                        <div style={{ width:'28px', height:'28px', borderRadius:'50%', backgroundColor:'#43B89C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:'#fff' }}>
                                                            {comment.username?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <span style={{ fontSize:'20px', fontWeight:'700', color:'#333' }}>{comment.username}</span>
                                                    </div>
                                                    <div style={{ fontSize:'25px', color:'#333', marginBottom:'8px' }}>{comment.comment}</div>
                                                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                                        {likedComments.find((item) => item===comment.commentId) && (
                                                            <button onClick={() => upvoteCommentButton(comment.commentId,post.msgId)} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', fontSize:'30px', color:'#555', fontWeight:'600' }}>
                                                                <i className="fa-solid fa-thumbs-up" style={{color:" rgb(177, 151, 252)"}}></i>
                                                            </button>
                                                        )}
                                                        {!(likedComments.find((item) => item===comment.commentId)) && (
                                                            <button onClick={() => upvoteCommentButton(comment.commentId,post.msgId)} style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none', cursor:'pointer', fontSize:'30px', color:'#555', fontWeight:'600' }}>
                                                                <i className="fa-regular fa-thumbs-up"></i>
                                                            </button>
                                                        )}
                                                        {(userAttributes.role==="admin" || (currentUserId && post.uuid === currentUserId)) && (
                                                            <button onClick={()=>editCommentButton(comment.commentId)}>
                                                                Edit <i className="fas fa-edit"></i>
                                                            </button>
                                                        )}
                                                        {(userAttributes.role==="admin" || (currentUserId && post.uuid === currentUserId)) &&(
                                                            <button onClick={()=>deleteCommentButton(post.msgId, comment.commentId)}>
                                                                Delete <i className="fa-solid fa-trash-can"></i>
                                                            </button>
                                                        )}
                                                        <div id={`editComment-${comment.commentId}`} style={{display:"none", marginTop:'15px'}}>
                                                            <Card variant="dark">
                                                                <h3 style={{ marginTop:0 }}>Edit Comment</h3>
                                                                <label style={{ fontWeight:'bold' }}>Message</label>
                                                                <textarea id={`editCommentText-${comment.commentId}`} style={{ padding:'8px', border:'1px solid #ccc', borderRadius:'4px', marginBottom:'10px', width:'100%', minHeight:'80px', boxSizing:'border-box' }}></textarea>
                                                                <div style={{ display:'flex', gap:'10px' }}>
                                                                    <Button onClick={() => sendEditCommentButton(post.msgId,comment.commentId)}>Send</Button>
                                                                    <Button variant="secondary" onClick={() => cancelEditCommentButton(comment.commentId)}>Cancel</Button>
                                                                </div>
                                                            </Card>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            ))}
                        </div>
                    </div>

                    {/* Right panel: Today's Schedule */}
                    <TodaySchedule enrolledCourses={enrolledCourses} navigate={navigate} />

                </div>
            </div>
        </div>
    );
}
export default Posts;
