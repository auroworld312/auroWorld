import UserAvatar from './UserAvatar';
import { useUser } from '../UserContext';
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar() {
    const navigate = useNavigate();
    const { displayName, email } = useUser();
    const { pathname } = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const {state } = useLocation()
    const {passedUserId} = state || {}

    // console.log('sidebar passedUserId = ',passedUserId)

    return (
        <aside className={`app-sidebar${isCollapsed ? ' app-sidebar-collapsed' : ''}`} aria-label="Sidebar">
            <div className="app-sidebar-top">
                <div className="app-sidebar-brand-row">
                    {!isCollapsed && (
                        <button className="app-sidebar-brand" onClick={() => navigate('/posts')}>
                            <img src="/assets/sidebar/language.svg" alt="" />
                            <span>auroworld</span>
                        </button>
                    )}
                    <button className="app-sidebar-toggle" onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!isCollapsed} title={isCollapsed ? 'Expand' : 'Collapse'}>
                        <span><img src="/assets/sidebar/collapse.svg" alt="" /></span>
                    </button>
                </div>
                <nav className="app-sidebar-navigation" aria-label="Main navigation">
                    <NavItem isCollapsed={isCollapsed} icon="posts" label="Posts" active={pathname === '/posts'} onClick={() => navigate('/posts',{state:{passedUserId}})} />
                    <NavItem isCollapsed={isCollapsed} icon="courses" label="Courses" active={pathname.startsWith('/courses') || pathname.startsWith('/quizzes/')} onClick={() => navigate('/courses',{state:{passedUserId}})} />
                    <NavItem isCollapsed={isCollapsed} icon="calendar" label="Calendar" active={pathname === '/calendar'} onClick={() => navigate('/calendar')} />
                </nav>
            </div>
            <nav className="app-sidebar-account" aria-label="Account">
                <button className="app-sidebar-item app-sidebar-user" aria-label="Account" aria-current={pathname === '/profile' ? 'page' : undefined} onClick={() => navigate('/profile')} title={displayName || email || 'Account'}>
                    <UserAvatar size={30} />{!isCollapsed && <span>{displayName || email || 'Account'}</span>}
                </button>
                <NavItem isCollapsed={isCollapsed} icon="settings" label="Settings" active={pathname === '/settings'} onClick={() => navigate('/settings')} />
                <NavItem isCollapsed={isCollapsed} icon="sign-out" label="Sign Out" onClick={() => navigate('/login')} />
            </nav>
        </aside>
    );
}

function NavItem({ isCollapsed, icon, label, onClick, active = false }) {
    return (
        <button className="app-sidebar-item" onClick={onClick} title={isCollapsed ? label : undefined} aria-label={label} aria-current={active ? 'page' : undefined}>
            <img src={`/assets/sidebar/${icon}.svg`} alt="" />
            {!isCollapsed && <span>{label}</span>}
        </button>
    );
}

export default Sidebar;
