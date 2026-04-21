import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Section = ({ title, children }) => (
  <motion.div className="card" style={{ marginBottom:16 }}
    initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
    <div className="section-title" style={{ marginBottom:16 }}>{title}</div>
    {children}
  </motion.div>
);

const Row = ({ label, sub, children }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
    <div>
      <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{sub}</div>}
    </div>
    {children}
  </div>
);

export default function SettingsPage() {
  const { user, logout }           = useAuth();
  const { currency, setCurrency }  = useCurrency();
  const navigate = useNavigate();

  const [pwForm, setPwForm] = useState({ current:'', next:'', confirm:'' });
  const [pwLoading, setPwLoading] = useState(false);

  const handleLogout = () => { logout(); navigate('/auth'); toast.success('Signed out'); };

  const changePassword = async () => {
    if (!pwForm.current || !pwForm.next) { toast.error('Fill all password fields'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.next.length < 6) { toast.error('Min 6 characters'); return; }
    setPwLoading(true);
    try {
      await axios.post('/api/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password updated');
      setPwForm({ current:'', next:'', confirm:'' });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update password');
    } finally { setPwLoading(false); }
  };

  return (
    <div style={{ maxWidth:600 }}>
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-sub">Manage your account and preferences</div>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <Row label="Name" sub="Your display name">
          <span style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--accent)' }}>{user?.name}</span>
        </Row>
        <Row label="Email" sub="Your account email">
          <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--muted)' }}>{user?.email}</span>
        </Row>
      </Section>

      {/* Currency */}
      <Section title="Preferences">
        <Row label="Currency" sub="Default display currency for all costs">
          <select className="input" style={{ width:'auto', minWidth:160 }} value={currency} onChange={e => { setCurrency(e.target.value); toast.success(`Currency changed to ${CURRENCIES[e.target.value]?.name}`); }}>
            {Object.entries(CURRENCIES).map(([k,v]) => (
              <option key={k} value={k}>{v.flag} {k} — {v.name}</option>
            ))}
          </select>
        </Row>
        <Row label="Currency Symbol" sub="Preview of selected currency">
          <span style={{ fontFamily:'var(--font-mono)', fontSize:20, color:'var(--accent)' }}>
            {CURRENCIES[currency]?.symbol}
          </span>
        </Row>
      </Section>

      {/* Change password */}
      <Section title="Security">
        <div className="field">
          <label className="label">Current Password</label>
          <input className="input" type="password" placeholder="••••••••" value={pwForm.current} onChange={e => setPwForm(f=>({...f,current:e.target.value}))} />
        </div>
        <div className="field">
          <label className="label">New Password</label>
          <input className="input" type="password" placeholder="••••••••" value={pwForm.next} onChange={e => setPwForm(f=>({...f,next:e.target.value}))} />
        </div>
        <div className="field">
          <label className="label">Confirm New Password</label>
          <input className="input" type="password" placeholder="••••••••" value={pwForm.confirm} onChange={e => setPwForm(f=>({...f,confirm:e.target.value}))} />
        </div>
        <button className="btn btn-primary" onClick={changePassword} disabled={pwLoading}>
          {pwLoading ? <span className="spinner-sm" /> : '🔐 Update Password'}
        </button>
        <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>
          Note: Add a <code style={{ color:'var(--accent)' }}>/api/auth/change-password</code> route to your backend to enable this.
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Account">
        <Row label="Sign Out" sub="Sign out of your account on this device">
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign Out ⇥</button>
        </Row>
      </Section>

      {/* App info */}
      <div style={{ textAlign:'center', color:'var(--muted)', fontSize:11, marginTop:10, fontFamily:'var(--font-mono)' }}>
        MeetCost v2.0 · React Edition
      </div>
    </div>
  );
}
