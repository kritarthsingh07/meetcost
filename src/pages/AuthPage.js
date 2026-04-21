import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './AuthPage.css';

export default function AuthPage() {
  const [mode, setMode]       = useState('login');
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { login, register }   = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        await register(form.name, form.email, form.password);
        toast.success('Account created!');
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      {/* Background blobs */}
      <div className="auth-blob blob-1" />
      <div className="auth-blob blob-2" />
      <div className="auth-blob blob-3" />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">₿</div>
          <div>
            <div className="auth-logo-name">MeetCost</div>
            <div className="auth-logo-sub">Know the true cost of every meeting</div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="auth-toggle">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign In</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); }}>Sign Up</button>
        </div>

        <form onSubmit={submit}>
          <AnimatePresence>
            {mode === 'signup' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="auth-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="John Smith"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    required={mode === 'signup'}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="auth-field">
            <label>Email</label>
            <input type="email" placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="auth-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                ⚠ {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : mode === 'login' ? '→ Sign In' : '→ Create Account'}
          </button>
        </form>

        <p className="auth-hint">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
