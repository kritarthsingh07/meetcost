import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Layout.css';

const NAV = [
  { to: '/',         icon: '⬡',  label: 'Dashboard' },
  { to: '/live',     icon: '◉',  label: 'Live' },
  { to: '/history',  icon: '▦',  label: 'History' },
  { to: '/schedule', icon: '◷',  label: 'Schedule' },
  { to: '/settings', icon: '◈',  label: 'Settings' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
    navigate('/auth');
  };

  return (
    <div className="layout">
      <motion.aside
        className={`sidebar ${collapsed ? 'collapsed' : ''}`}
        animate={{ width: collapsed ? 68 : 220 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">₿</div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="logo-text"
              >
                <span className="logo-name">MeetCost</span>
                <span className="logo-sub">Cost Tracker</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="nav-label"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="user-info"
                >
                  <span className="user-name">{user?.name}</span>
                  <span className="user-email">{user?.email}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⇥</button>
        </div>

        {/* Collapse toggle */}
        <button className="collapse-btn" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? '›' : '‹'}
        </button>
      </motion.aside>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{ height: '100%' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
