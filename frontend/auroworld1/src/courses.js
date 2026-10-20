import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { deleteFromB2, isB2, toKey } from './b2Storage';
import "./CoursesPage.css";
import { paymentLink } from "./CourseEnrollment";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { getCourseTimeValues, isCourseTime } from "./courseSchedule";

const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')

//const API = window.location.hostname === "localhost" ? "http://localhost:8080" : "https://auroworld.onrender.com";
const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';


const PURPLE = '#4A2B6B';
const COURSE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? '00' : '30';
    return {
        value: `${String(hour).padStart(2, '0')}:${minute}`,
        label: `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`,
    };
});
//const PURPLE_LIGHT = '#EDE9FF';


function Courses() {
    const navigate = useNavigate();
    const [loadingChanges, setLoadingChanges] = useState(false)
    const [currentUserId, setCurrentUserId] = useState(null);
    const [tab, setTab] = useState('all');
    const [allCourses, setAllCourses] = useState([]);
    const [enrolledIds, setEnrolledIds] = useState(new Set());
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ level: [], time: [] });
    const [showAddCourse, setShowAddCourse] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseMenu, setCourseMenu] = useState(null);
    const [selectedDays, setSelectedDays] = useState([]);
    const[instructorList, setInstructorList]=useState([])
    const [userAttributes, setUserAttributes] = useState(null);

    const isTeacher = userAttributes?.role === 'instructor';
    const [thumbnail, setThumbnail] = useState('');
    const [imageLoading, setImageLoading] = useState(false);

    const [now, setNow] = useState(() => new Date());
    const [bookmarks, setBookmarks] = useState(new Set());
    const [bookmarkOwner, setBookmarkOwner] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setBookmarks(new Set());
        setBookmarkOwner(null);
        if (!currentUserId) return;
        try {
            const saved = JSON.parse(localStorage.getItem(`auroworld:bookmarks:${currentUserId}`) || '[]');
            setBookmarks(new Set(Array.isArray(saved) ? saved.map(String) : []));
            setBookmarkOwner(currentUserId);
        } catch {
            setBookmarkOwner(currentUserId);
        }
    }, [currentUserId]);

    function toggleBookmark(courseId) {
        if (!currentUserId || bookmarkOwner !== currentUserId) return;
        const next = new Set(bookmarks);
        const id = String(courseId);
        if (next.has(id)) next.delete(id); else next.add(id);
        try {
            localStorage.setItem(`auroworld:bookmarks:${currentUserId}`, JSON.stringify([...next]));
            setBookmarks(next);
        } catch {
            alert('Unable to save this bookmark. Please allow browser storage and try again.');
        }
    }

    function displayCourseTimes(times) {
        const values = getCourseTimeValues(times);
        return values.every(Boolean)
            ? values.map(value => COURSE_TIME_OPTIONS.find(option => option.value === value).label).join(' - ')
            : times || 'Not specified';
    }

    const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    function toggleDay(idx) {
        setSelectedDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]);
    }  

    const userAttsGrabbed = useRef(false)
    useEffect(() => {
        if(userAttsGrabbed.current===false){
            async function getUserAtts() {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const res = await fetch(`${API}/userdata/${user.id}`);
                    const data = await res.json();
                    setUserAttributes(data.mData);
                } catch (error) {
                    console.log(error.message);
                }
            }
            getUserAtts();
        }
        return ()=>{
            userAttsGrabbed.current=true
        }
    }, []);
    
    const instructorsGrabbed = useRef(false)
    useEffect(()=>{
        if(instructorsGrabbed.current===false){
            async function getInstructors(){
                fetch(`${API}/all/instructors`)
                .then(res => res.json())
                .then(data => {
                    //console.log("FULL RESPONSE:", data)
                    //console.log("Instructor list mData:", data.mData)
                    setInstructorList(data.mData);
                })
                .catch(err => console.error("FETCH ERROR for getting instructors:", err))
            }
            getInstructors()
        }
        return ()=>{
            instructorsGrabbed.current=true
        }
    },[])

    const [newCourse, setNewCourse] = useState({
        title: '', description: '', instructor: 'liamtest', startTime: '', endTime: '',
        start_date: '', level: 'Beginner', price: 'Free', live_url: '', paymentUrl: '', unitCount: 1
    });

    const uuidGrabbed = useRef(false)
    useEffect(() => {
        if(uuidGrabbed.current===false){
            async function fetchUser() {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                setCurrentUserId(user.id);
            }
            fetchUser();
        }
        return ()=>{
            uuidGrabbed.current=true
        }
    }, []);

    const loadCourses = useCallback(async () => {
        try {
            const res = await fetch(`${API}/courses`);
            const data = await res.json();
            // console.log('courses = ',data.mData)
            setAllCourses(data.mData || []);
        } catch (e) { console.error('loadCourses:', e); }
    }, []);

    const loadEnrolled = useCallback(async (uuid) => {
        if (!uuid) return;
        try {
            const res = await fetch(`${API}/courses/enrolled/${uuid}`);
            const data = await res.json();
            setEnrolledIds(new Set((data.mData || []).map(c => c.courseId)));
        } catch (e) { console.error('loadEnrolled:', e); }
    }, []);

    const coursesGrabbed = useRef(false)
    useEffect(() => { 
        if(coursesGrabbed.current===false){
            loadCourses();
        } 
        return ()=>{
            coursesGrabbed.current=true
        }
    }, [loadCourses]);

    const enrolledGrabbed = useRef(false)
    useEffect(() => { 
        if(enrolledGrabbed.current===false){
            if (currentUserId){ 
                loadEnrolled(currentUserId);
            } 
        }
        return ()=>{
            enrolledGrabbed.current=true
        }
    }, [currentUserId, loadEnrolled]);

    function openCourseForm(course = null) {
        setEditingCourse(course);
        setCourseMenu(null);
        const times = getCourseTimeValues(course?.times);
        setNewCourse({ title: course?.title || '', description: course?.description || '', instructor: course?.instructor || userAttributes?.username || '', startTime: times[0] || '', endTime: times[1] || '', start_date: course?.startDate || '', level: course?.level || 'Beginner', price: course?.price || 'Free', live_url: course?.liveUrl || '', paymentUrl: course?.paymentUrl || '', unitCount: 1 });
        setSelectedDays((course?.daysOfWeek || '').split(',').filter(day => /^[0-6]$/.test(day)).map(Number));
        setThumbnail(course?.thumbnail || '');
        setShowAddCourse(true);
        requestAnimationFrame(() => document.getElementById('create-course-form')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }));
    }

    async function deleteCourse(course) {
        if (loadingChanges || !window.confirm(`Delete "${course.title}" and its contents? This cannot be undone.`)) return;
        setLoadingChanges(true);
        setCourseMenu(null);
        try {
            const pathsResponse = await fetch(`${API}/filepaths/course/${course.courseId}`);
            const pathsData = await pathsResponse.json();
            if (pathsData.mStatus !== 'ok') throw new Error(pathsData.mMessage || 'Could not load course files.');
            const paths = (pathsData.mData || []).filter(path => path && path !== 'empty' && !/^https?:\/\//i.test(path));
            await deleteFromB2(paths.filter(isB2).map(toKey), async () => {
                const { data: { session } } = await supabase.auth.getSession();
                return session?.access_token;
            });
            const legacyPaths = paths.filter(path => !isB2(path));
            if (legacyPaths.length) {
                const { error } = await supabase.storage.from('course_videos').remove(legacyPaths);
                if (error) throw error;
            }
            const response = await fetch(`${API}/courses/${course.courseId}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.mStatus !== 'ok') throw new Error(data.mMessage || 'Could not delete course.');
            setAllCourses(previous => previous.filter(item => item.courseId !== course.courseId));
            if (editingCourse?.courseId === course.courseId) { setShowAddCourse(false); setEditingCourse(null); }
        } catch (error) { alert(error.message); }
        finally { setLoadingChanges(false); }
    }

    async function chooseThumbnail(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
            alert('Choose a JPG, PNG or WebP image up to 10 MB.'); return;
        }
        setImageLoading(true);
        const url = URL.createObjectURL(file);
        try {
            const image = new Image();
            image.src = url;
            await image.decode();
            const scale = Math.min(1, 800 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const result = canvas.toDataURL('image/jpeg', 0.75);
            if (result.length > 400000) throw new Error('Please choose a smaller image.');
            setThumbnail(result);
        } catch (error) { alert(error.message || 'Could not read this image.'); }
        finally { URL.revokeObjectURL(url); setImageLoading(false); }
    }

    function compactDays(value) {
        const days = [...new Set((value || '').split(',').filter(day => /^[0-6]$/.test(day)))].sort();
        const key = days.join(',');
        if (key === '0,1,2,3,4,5,6') return 'Every day';
        if (key === '1,2,3,4,5') return 'Weekdays';
        if (key === '0,6') return 'Weekend';
        return days.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][Number(day)]).join(', ') || 'Not specified';
    }

    async function submitNewCourse() {
        if (loadingChanges || imageLoading) return;
        const { title, description, startTime, endTime,
            start_date,  level, price, live_url, paymentUrl
        } = newCourse;
        if (paymentUrl.trim() && (!paymentLink(paymentUrl.trim()) || paymentUrl.length > 2048)) {
            alert('Please enter a valid HTTP or HTTPS payment link.');
            return;
        }
        const startOption = COURSE_TIME_OPTIONS.find(option => option.value === startTime);
        const endOption = COURSE_TIME_OPTIONS.find(option => option.value === endTime);
        if (!startOption || !endOption || endTime <= startTime) {
            alert('Please select a start time and a later end time on the same day.');
            return;
        }
        if (selectedDays.length === 0) {
            alert('Please select at least one day of the week.');
            return;
        }
        const times = `${startOption.label} - ${endOption.label}`;
        // console.log("title: "+title)
        // console.log("description: "+description)
        const instructor = userAttributes?.role === 'instructor' ? userAttributes.username : newCourse.instructor;
        // console.log("instructor: "+instructor)
        // console.log("times: "+times)
        // console.log("start_date: "+start_date)
        // console.log("level: "+level)
        // console.log("price: "+price)
        // console.log("newCourse: "+newCourse)
        if (!title || !description || !instructor || !times || !start_date || !level || !price) {
            alert('Please fill out all fields'); return;
        }
        try {
            setLoadingChanges(true)
            const response = await fetch(editingCourse ? `${API}/courses/edit/${editingCourse.courseId}` : `${API}/courses`, {
                method: editingCourse ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title:title, description: description, instructor:instructor, times:times, startDate: start_date, level:level, price:price, paymentUrl:paymentUrl.trim(), live_url:live_url.trim(), thumbnail: thumbnail || null, updateThumbnail: !!editingCourse, liveUrl: live_url.trim(), unitCount: newCourse.unitCount, daysOfWeek: [...selectedDays].sort((a, b) => a - b).join(',') })
            });
            const data = await response.json();
            if (data.mStatus !== 'ok') { setLoadingChanges(false); alert('Saving course failed: ' + data.mMessage); return; }
            const savedId = editingCourse?.courseId || data.mData;
            if (editingCourse || thumbnail || paymentUrl.trim()) {
                const savedResponse = await fetch(`${API}/courses/${savedId}`);
                const savedData = await savedResponse.json();
                if (savedData.mStatus !== 'ok' || (savedData.mData?.thumbnail || '') !== thumbnail) {
                    throw new Error('The course image was not saved. Your selection is still here. Restart the updated backend and try again.');
                }
                if ((savedData.mData?.paymentUrl || '') !== paymentUrl.trim()) {
                    throw new Error('The payment link was not saved. Restart the updated backend and try again.');
                }
            }
            setLoadingChanges(false)
            setShowAddCourse(false)
            setEditingCourse(null)
            setNewCourse({ title: '', description: '', instructor: '', startTime: '', endTime: '', start_date: '', level: 'Beginner', price: 'Free', live_url: '', paymentUrl: '', unitCount: 1 });
            setSelectedDays([]);
            setThumbnail('');
            loadCourses();
        } catch (error) { setLoadingChanges(false); alert('Could not save course: ' + error.message); }
    }

    function toggleFilter(type, value) {
        setFilters(prev => {
            const arr = prev[type];
            return { ...prev, [type]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
        });
    }


    const levelOptions = ['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Advanced', 'Proficient'];
    const timeOptions = ['Morning', 'Afternoon', 'Evening', 'Asynchronous'];

    const visibleCourses = !userAttributes ? [] : userAttributes.role === 'instructor'
        ? allCourses.filter(course => !!userAttributes.username && course.instructor === userAttributes.username)
        : allCourses;
    const enrolledCourses = visibleCourses.filter(c => enrolledIds.has(c.courseId));
    const displayList = (tab === 'enrolled' ? enrolledCourses : visibleCourses)
        .filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.instructor?.toLowerCase().includes(search.toLowerCase()))
        .filter(c => filters.level.length === 0 || filters.level.includes(c.level))

    return (
        <div className={`courses-page${isTeacher ? ' courses-teacher' : ''}`} style={{ opacity:loadingChanges? 0.5 : 1 }}>
            <div className = 'loader' style={{display:loadingChanges?'flex':'none'}}></div>
            <Sidebar />
            <div className="courses-workspace">
                <Header />
                <div className="courses-layout">

                    {/* Main content */}
                    <main className="courses-main">

                        {/* Header row */}
                        <div className="courses-heading">
                            <h1>Courses</h1>
                        </div>

                        {/* Add Course Form */}
                        {showAddCourse && (userAttributes?.role === 'admin' || userAttributes?.role === 'instructor') && (
                            <div id="create-course-form" style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{editingCourse ? 'Edit Course' : 'Add a New Course'}</h3>
                                {!editingCourse && <div style={{ marginBottom: '12px' }}>
                                    <label htmlFor="course-unit-count" style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Initial Number of Units <span className="courses-required" aria-hidden="true">*</span></label>
                                    <select id="course-unit-count" value={newCourse.unitCount} onChange={e => setNewCourse(p => ({ ...p, unitCount: Number(e.target.value) }))} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', backgroundColor: '#fff' }}>
                                        {Array.from({ length: 51 }, (_, i) => <option key={i} value={i}>{i === 0 ? '0 — Add units later' : `${i} unit${i === 1 ? '' : 's'}`}</option>)}
                                    </select>
                                    <p style={{ color: '#666', fontSize: '13px' }}>Units will be named Unit 1, Unit 2, and so on. You can rename or add units later.</p>
                                </div>}
                                {[
                                    { label: 'Course Title', key: 'title', type: 'text' },
                                    // { label: 'Instructor', key: 'instructor', type: 'text' },
                                    { label: 'Start Date', key: 'start_date', type: 'date' },
                                    { label: 'Zoom Link', key: 'live_url', type: 'text' },
                                ].map(f => (
                                    <div key={f.key} style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>{f.label}{f.key === 'live_url' ? ' (optional)' : <span className="courses-required" aria-hidden="true"> *</span>}</label>
                                        <input aria-required={f.key !== 'live_url'} type={f.type} value={newCourse[f.key]} onChange={e => setNewCourse(p => ({ ...p, [f.key]: e.target.value }))}
                                            onClick={f.type === 'date' ? e => e.currentTarget.showPicker?.() : undefined}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', boxSizing: 'border-box' }} />
                                    </div>
                                ))}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
                                    {[
                                        { label: 'Start Time', key: 'startTime' },
                                        { label: 'End Time', key: 'endTime' },
                                    ].map(field => (
                                        <div key={field.key} style={{ flex: '1 1 180px' }}>
                                            <label htmlFor={`course-${field.key}`} style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>{field.label}<span className="courses-required" aria-hidden="true"> *</span></label>
                                            <select
                                                id={`course-${field.key}`}
                                                value={newCourse[field.key]}
                                                onChange={e => {
                                                    const value = e.target.value;
                                                    setNewCourse(previous => ({
                                                        ...previous,
                                                        [field.key]: value,
                                                        ...(field.key === 'startTime' && previous.endTime && previous.endTime <= value ? { endTime: '' } : {}),
                                                    }));
                                                }}
                                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', backgroundColor: '#fff' }}
                                            >
                                                <option value="">Select {field.label.toLowerCase()}</option>
                                                {COURSE_TIME_OPTIONS.map(option => (
                                                    <option key={option.value} value={option.value} disabled={field.key === 'endTime' && !!newCourse.startTime && option.value <= newCourse.startTime}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Instructor<span className="courses-required" aria-hidden="true"> *</span></label>
                                    <select id="instructor" disabled={userAttributes?.role === 'instructor'} value={userAttributes?.role === 'instructor' ? userAttributes.username : newCourse.instructor} onChange={e => setNewCourse(p => ({ ...p, instructor: e.target.value }))} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
                                        {(userAttributes?.role === 'instructor' ? [userAttributes] : instructorList).map(instructor => (
                                            <option key={instructor.unique_id || instructor.username || 'current-instructor'} value={instructor.username}>{instructor.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Course Description<span className="courses-required" aria-hidden="true"> *</span></label>
                                    <textarea value={newCourse.description} onChange={e => setNewCourse(p => ({ ...p, description: e.target.value }))}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', minHeight: '80px', boxSizing: 'border-box', resize: 'vertical' }} />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Days of the Week<span className="courses-required" aria-hidden="true"> *</span></label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {DAY_LABELS.map((day, idx) => (
                                            <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                                                <input type="checkbox" checked={selectedDays.includes(idx)} onChange={() => toggleDay(idx)} />
                                                {day}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Level<span className="courses-required" aria-hidden="true"> *</span></label>
                                        <select value={newCourse.level} onChange={e => setNewCourse(p => ({ ...p, level: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px' }}>
                                            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Price<span className="courses-required" aria-hidden="true"> *</span></label>
                                        <select value={newCourse.price} onChange={e => setNewCourse(p => ({ ...p, price: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px' }}>
                                            <option>Free</option><option>Priced</option>
                                        </select>
                                    </div>
                                </div>
                                {newCourse.price !== 'Free' && <div className="courses-payment-field">
                                    <label htmlFor="course-payment-url">Payment link (optional)</label>
                                    <input id="course-payment-url" type="url" maxLength={2048} placeholder="https://" value={newCourse.paymentUrl} onChange={e => setNewCourse(p => ({ ...p, paymentUrl: e.target.value }))} />
                                    <small>Students will open this page to pay. Automatic payment confirmation is not available yet.</small>
                                </div>}
                                <div className="courses-image-upload">
                                    <label htmlFor="course-cover">Course image (optional)</label>
                                    <input id="course-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseThumbnail} disabled={imageLoading || loadingChanges} />
                                    <small>JPG, PNG or WebP, up to 10 MB.</small>
                                    {imageLoading && <span role="status">Preparing image...</span>}
                                    {thumbnail && <div><img src={thumbnail} alt="Course cover preview" /><button onClick={() => setThumbnail('')}>Remove image</button></div>}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button disabled={imageLoading || loadingChanges} onClick={submitNewCourse} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>{editingCourse ? 'Save Changes' : 'Create'}</button>
                                    <button onClick={() => setShowAddCourse(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #e0e0e0', backgroundColor: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {/* Search bar */}
                        <div className="courses-search">
                            <input
                                type="search"
                                aria-label="Search courses"
                                placeholder="Search for a course..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <img src="/assets/courses/search.svg" alt="" />
                        </div>

                        {/* Course list */}
                        <div className="courses-list">
                            {displayList.length === 0 ? (userAttributes?.role === 'instructor' || userAttributes?.role === 'admin' ? null : (
                                <div className="courses-empty">
                                    {tab === 'enrolled' ? 'You\'re not enrolled in any courses yet.' : 'No courses found.'}
                                </div>
                            )) : displayList.map(course => (
                                <article key={course.courseId} className="courses-card" onClick={event => {
                                    if (!event.target.closest('button, a, input, [data-course-menu]')) navigate(`/courses/${course.courseId}`);
                                }}>

                                    {/* Thumbnail */}
                                    <div className="courses-thumbnail">
                                        {course.thumbnail
                                            ? <img src={course.thumbnail} alt={course.title} />
                                            : <span aria-label="No course image"><i className="fa-regular fa-image" aria-hidden="true" /></span>}
                                    </div>

                                    {/* Info */}
                                    <div className="courses-card-info">
                                        <h2>{<button className="courses-title-link" onClick={() => navigate(`/courses/${course.courseId}`)}>{course.title}</button>}</h2>
                                        <p>{course.description}</p>
                                    </div>
                                    {isTeacher && <div className="courses-menu" data-course-menu onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') setCourseMenu(null); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setCourseMenu(null); }}>
                                        <button className="courses-menu-trigger" aria-label={`Course options for ${course.title}`} aria-expanded={courseMenu === course.courseId} onClick={() => setCourseMenu(courseMenu === course.courseId ? null : course.courseId)}>&#8943;</button>
                                        {courseMenu === course.courseId && <div className="courses-menu-options">
                                            <button onClick={() => openCourseForm(course)}>Edit Course</button>
                                            <button className="courses-delete" disabled={loadingChanges} onClick={() => deleteCourse(course)}>Delete Course</button>
                                        </div>}
                                    </div>}
                                    <button className="courses-bookmark" aria-label={`${bookmarks.has(String(course.courseId)) ? 'Remove bookmark for' : 'Bookmark'} ${course.title}`} aria-pressed={bookmarks.has(String(course.courseId))} disabled={!currentUserId || bookmarkOwner !== currentUserId} onClick={() => toggleBookmark(course.courseId)}>
                                        <i className={`${bookmarks.has(String(course.courseId)) ? 'fa-solid' : 'fa-regular'} fa-bookmark`} aria-hidden="true" />
                                    </button>
                                    <div className="courses-card-details">
                                        <p>Instructor: {course.instructor}</p>
                                        <p>Days: <strong>{compactDays(course.daysOfWeek) || 'Not specified'}</strong></p>
                                        <p>Times: <strong>{displayCourseTimes(course.times)}</strong></p>
                                        <p>Start Date: {course.startDate || 'Not specified'}</p>
                                        <p className="courses-extra-details">Level: {course.level || 'Not specified'} &middot; Price: {course.price || 'Not specified'}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="courses-card-footer">
                                        <span className="courses-live-status" role="status">
                                            {isCourseTime(course, now) ? 'Live' : 'Not Live'}
                                            <img src={`/assets/courses/${isCourseTime(course, now) ? 'live' : 'not-live'}.svg`} alt="" />
                                        </span>
                                    </div>
                                </article>
                            ))}
                            {!showAddCourse && (userAttributes?.role === 'instructor' || userAttributes?.role === 'admin') && (
                                <button className="courses-create-card" onClick={() => {
                                    openCourseForm();
                                }}>
                                    <span className="courses-create-plus" aria-hidden="true">+</span>
                                    <span>Create Course</span>
                                </button>
                            )}
                        </div>
                    </main>

                    {/* Right sidebar */}
                    <aside className="courses-right-sidebar" aria-label="Course browsing">

                        {/* Tab switcher */}
                        {!isTeacher && <div className="courses-tab-switcher" role="group" aria-label="Course list">
                            {['all', 'enrolled'].map(t => (
                                <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}>
                                    {t === 'enrolled' ? 'Enrolled Courses' : 'All Courses'}
                                </button>
                            ))}
                        </div>}

                        {/* Filters */}
                        <div className="courses-filters">
                            <div className="courses-filters-title">
                                <h2>Filters</h2>
                                <img src="/assets/courses/filter.svg" alt="" />
                            </div>
                            <img className="courses-filter-divider" src="/assets/courses/divider.svg" alt="" />
                            <div className="courses-filter-group">
                                <h3>Level <img src="/assets/courses/expand.svg" alt="" /></h3>
                                {levelOptions.map(opt => (
                                    <label key={opt} className="courses-filter-option">
                                        <input type="checkbox" checked={filters.level.includes(opt)} onChange={() => toggleFilter('level', opt)} />
                                        <img src="/assets/courses/checkbox.svg" alt="" />
                                        <span>{opt}</span>
                                    </label>
                                ))}
                            </div>
                            <img className="courses-filter-divider" src="/assets/courses/divider.svg" alt="" />
                            <div className="courses-filter-group" aria-label="Class Time filters (coming soon)">
                                <h3>Class Time <img src="/assets/courses/expand.svg" alt="" /></h3>
                                {timeOptions.map(opt => (
                                    <div key={opt} className="courses-filter-option" aria-disabled="true" title="Class time filtering is not available yet">
                                        <img src="/assets/courses/checkbox.svg" alt="" />
                                        <span>{opt}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>

                </div>
            </div>
        </div>
    );
}

export default Courses;
