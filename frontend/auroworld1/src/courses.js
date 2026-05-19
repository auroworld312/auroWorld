import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const supabase = createClient('https://rduempiojxizkwwbzaml.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkdWVtcGlvanhpemt3d2J6YW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjA5NjIsImV4cCI6MjA4NTYzNjk2Mn0.owcc0cRZ1EhLvY7nIpqHN5tPWG81LgMLaH9dOyc6Ymo')

//const API = window.location.hostname === "localhost" ? "http://localhost:8080" : "https://auroworld.onrender.com";
const API = window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'https://auroworld-rtpx.onrender.com';

const PURPLE = '#6C63FF';
//const PURPLE_LIGHT = '#EDE9FF';


function Courses() {
    const navigate = useNavigate();
    const [currentUserId, setCurrentUserId] = useState(null);
    const [tab, setTab] = useState('all');
    const [allCourses, setAllCourses] = useState([]);
    const [enrolledIds, setEnrolledIds] = useState(new Set());
    const [enrolling, setEnrolling] = useState({});
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ level: [], time: [] });
    const [showAddCourse, setShowAddCourse] = useState(false);

    const[instructorList, setInstructorList]=useState([])

    useEffect(()=>{
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

    },[])

    const [newCourse, setNewCourse] = useState({
        title: '', description: '', instructor: 'liamtest', times: '',
        start_date: '', level: 'Beginner', price: 'Free', live_url: ''
    });

    useEffect(() => {
        async function fetchUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);
        }
        fetchUser();
    }, []);

    const loadCourses = useCallback(async () => {
        try {
            const res = await fetch(`${API}/courses`);
            const data = await res.json();
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

    useEffect(() => { loadCourses(); }, [loadCourses]);
    useEffect(() => { if (currentUserId) loadEnrolled(currentUserId); }, [currentUserId, loadEnrolled]);

    async function handleEnroll(courseId) {
        if (!currentUserId) { alert('Please log in to enroll.'); return; }
        setEnrolling(prev => ({ ...prev, [courseId]: true }));
        try {
            const res = await fetch(`${API}/courses/${courseId}/enroll`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_uuid: currentUserId }),
            });
            const data = await res.json();
            if (data.mStatus === 'ok') setEnrolledIds(prev => new Set([...prev, courseId]));
            else alert('Enroll failed: ' + data.mMessage);
        } catch (e) { console.error(e); }
        finally { setEnrolling(prev => ({ ...prev, [courseId]: false })); }
    }

    async function handleUnenroll(courseId) {
        if (!window.confirm('Unenroll from this course?')) return;
        setEnrolling(prev => ({ ...prev, [courseId]: true }));
        try {
            const res = await fetch(`${API}/courses/${courseId}/enroll`, {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_uuid: currentUserId }),
            });
            const data = await res.json();
            if (data.mStatus === 'ok') {
                setEnrolledIds(prev => { const n = new Set(prev); n.delete(courseId); return n; });
            } else alert('Unenroll failed: ' + data.mMessage);
        } catch (e) { console.error(e); }
        finally { setEnrolling(prev => ({ ...prev, [courseId]: false })); }
    }

    async function submitNewCourse() {
        const { title, description, instructor, times, 
            start_date,  level, price, live_url 
        } = newCourse;
        console.log("title: "+title)
        console.log("description: "+description)
        console.log("instructor: "+instructor)
        console.log("times: "+times)
        console.log("start_date: "+start_date)
        console.log("level: "+level)
        console.log("price: "+price)
        console.log("newCourse: "+newCourse)
        // console.log("title: "+newCourse.title)
        // console.log("description: "+newCourse.description)
        // console.log("instructor: "+newCourse.instructor)
        // console.log("times: "+newCourse.times)
        // console.log("start_date: "+newCourse.start_date)
        // console.log("level: "+newCourse.level)
        // console.log("price: "+newCourse.price)
        // console.log("live_url: "+newCourse.live_url)
        if (!title || !description || !instructor || !times || !start_date || !level || !price || !live_url) {
            alert('Please fill out all fields'); return;
        }
        try {
            const response = await fetch(`${API}/courses`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title:title, description: description, instructor:instructor, times:times, startDate: start_date, level:level, price:price, live_url:live_url })
            });
            const data = await response.json();
            if (data.mStatus !== 'ok') { alert('Adding course failed: ' + data.mMessage); return; }
            setShowAddCourse(false);
            setNewCourse({ title: '', description: '', instructor: '', times: '', start_date: '', level: 'Beginner', price: 'Free', live_url: '' });
            loadCourses();
        } catch (error) { console.log(error.message); }
    }

    function toggleFilter(type, value) {
        setFilters(prev => {
            const arr = prev[type];
            return { ...prev, [type]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
        });
    }

    const levelOptions = ['Beginner', 'Intermediate', 'Advanced'];
    const timeOptions = ['Morning', 'Afternoon', 'Evening', 'Asynchronous'];

    const enrolledCourses = allCourses.filter(c => enrolledIds.has(c.courseId));
    const displayList = (tab === 'enrolled' ? enrolledCourses : allCourses)
        .filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.instructor?.toLowerCase().includes(search.toLowerCase()))
        .filter(c => filters.level.length === 0 || filters.level.includes(c.level))

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Header />
                <div style={{ flex: 1, overflowY: 'auto', padding: '30px', display: 'flex', gap: '24px' }}>

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: '#111' }}>Courses</h1>
                            <button
                                onClick={() => setShowAddCourse(v => !v)}
                                style={{ padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #ccc', backgroundColor: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                            >
                                {showAddCourse ? 'Cancel' : 'Create Course'}
                            </button>
                        </div>

                        {/* Add Course Form */}
                        {showAddCourse && (
                            <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Add a New Course</h3>
                                {[
                                    { label: 'Course Title', key: 'title', type: 'text' },
                                    // { label: 'Instructor', key: 'instructor', type: 'text' },
                                    { label: 'Times', key: 'times', type: 'text' },
                                    { label: 'Start Date', key: 'start_date', type: 'text' },
                                    { label: 'Link to Meeting', key: 'live_url', type: 'text' },
                                ].map(f => (
                                    <div key={f.key} style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>{f.label}</label>
                                        <input type={f.type} value={newCourse[f.key]} onChange={e => setNewCourse(p => ({ ...p, [f.key]: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', boxSizing: 'border-box' }} />
                                    </div>
                                ))}
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Instructor</label>
                                    <select id="instructor" value={newCourse.instructor} onChange={e => setNewCourse(p => ({ ...p, instructor: e.target.value }))} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
                                        {instructorList.map(instructor => (
                                            <option key={instructor.unique_id} value={instructor.username}>{instructor.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Course Description</label>
                                    <textarea value={newCourse.description} onChange={e => setNewCourse(p => ({ ...p, description: e.target.value }))}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', minHeight: '80px', boxSizing: 'border-box', resize: 'vertical' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Level</label>
                                        <select value={newCourse.level} onChange={e => setNewCourse(p => ({ ...p, level: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px' }}>
                                            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Price</label>
                                        <select value={newCourse.price} onChange={e => setNewCourse(p => ({ ...p, price: e.target.value }))}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px' }}>
                                            <option>Free</option><option>Priced</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={submitNewCourse} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: PURPLE, color: '#fff', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Create</button>
                                    <button onClick={() => setShowAddCourse(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #e0e0e0', backgroundColor: '#fff', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {/* Search bar */}
                        <div style={{ position: 'relative', marginBottom: '20px' }}>
                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#aaa' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search for a course..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '15px', backgroundColor: '#fff', boxSizing: 'border-box', outline: 'none' }}
                            />
                        </div>

                        {/* Course list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {displayList.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#aaa', marginTop: '60px', fontSize: '15px' }}>
                                    {tab === 'enrolled' ? 'You\'re not enrolled in any courses yet.' : 'No courses found.'}
                                </div>
                            ) : displayList.map(course => (
                                <div key={course.courseId} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: '18px', alignItems: 'flex-start' }}>

                                    {/* Thumbnail */}
                                    <div style={{ width: '120px', height: '90px', borderRadius: '10px', flexShrink: 0, backgroundColor: '#e8e8e8', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {course.thumbnail
                                            ? <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <span style={{ fontSize: '32px' }}>📚</span>}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '17px', fontWeight: '700', color: '#111' }}>{course.title}</span>
                                            <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', backgroundColor: course.inSession ? '#d4f5e9' : '#f0f0f0', color: course.inSession ? '#1a7a50' : '#888' }}>
                                                {course.inSession ? '● In Session' : '○ Not in Session'}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#666', lineHeight: 1.5 }}>{course.description}</p>
                                        <div style={{ fontSize: '13px', color: '#777' }}>
                                            <span style={{ marginRight: '16px' }}>👤 {course.instructor}</span>
                                            <span style={{ fontWeight: '700', color: '#333', marginRight: '16px' }}>Times: {course.times}</span>
                                            {course.level && <span style={{ marginRight: '16px' }}>📊 {course.level}</span>}
                                            {course.price && <span>💰 {course.price}</span>}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => navigate(`/courses/${course.courseId}`)}
                                                style={{ padding: '8px 16px', borderRadius: '8px', border: `1.5px solid ${PURPLE}`, backgroundColor: '#fff', color: PURPLE, fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                More Info
                                            </button>
                                            <button
                                                onClick={() => enrolledIds.has(course.courseId) ? handleUnenroll(course.courseId) : handleEnroll(course.courseId)}
                                                disabled={!!enrolling[course.courseId]}
                                                style={{
                                                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                                                    backgroundColor: enrolledIds.has(course.courseId) ? '#f0f0f0' : PURPLE,
                                                    color: enrolledIds.has(course.courseId) ? '#888' : '#fff',
                                                    fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                                                    opacity: enrolling[course.courseId] ? 0.6 : 1
                                                }}
                                            >
                                                {enrolling[course.courseId] ? '...' : enrolledIds.has(course.courseId) ? 'Enrolled ✓' : 'Enroll'}
                                            </button>
                                        </div>
                                        {course.inSession && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: '#e53935' }}>
                                                Live <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e53935' }}></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div style={{ width: '260px', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Tab switcher */}
                        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '6px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: '4px' }}>
                            {['all', 'enrolled'].map(t => (
                                <button key={t} onClick={() => setTab(t)} style={{
                                    flex: 1, padding: '9px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    fontWeight: '700', fontSize: '13px',
                                    backgroundColor: tab === t ? PURPLE : 'transparent',
                                    color: tab === t ? '#fff' : '#666',
                                    transition: 'all 0.18s',
                                }}>
                                    {t === 'enrolled' ? `Enrolled Courses` : 'All Courses'}
                                </button>
                            ))}
                        </div>

                        {/* Filters */}
                        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ fontWeight: '700', fontSize: '16px', color: '#111' }}>Filters</span>
                                <span style={{ fontSize: '18px', color: '#888' }}>≡</span>
                            </div>

                            <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '16px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>Level</span>
                                    <span style={{ fontSize: '12px', color: '#888' }}>∧</span>
                                </div>
                                {levelOptions.map(opt => (
                                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#444' }}>
                                        <input type="checkbox" checked={filters.level.includes(opt)} onChange={() => toggleFilter('level', opt)}
                                            style={{ accentColor: PURPLE, width: '15px', height: '15px' }} />
                                        {opt}
                                    </label>
                                ))}
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>Class Time</span>
                                    <span style={{ fontSize: '12px', color: '#888' }}>∧</span>
                                </div>
                                {timeOptions.map(opt => (
                                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#444' }}>
                                        <input type="checkbox" checked={filters.time.includes(opt)} onChange={() => toggleFilter('time', opt)}
                                            style={{ accentColor: PURPLE, width: '15px', height: '15px' }} />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Courses;
