import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import './LivePage.css';

const COLORS = ['#a78bfa','#f472b6','#34d399','#fbbf24','#f87171','#60a5fa'];
const ini = (n) => n.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0,2);
const clk = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; return [h>0?pad(h):null,pad(m),pad(sc)].filter(Boolean).join(':'); };
const pad = (n) => String(n).padStart(2,'0');

export default function LivePage() {
  const { fmt, toUSD, currency } = useCurrency();
  const [phase,    setPhase]   = useState('setup'); // setup | running | ended
  const [title,    setTitle]   = useState('');
  const [members,  setMembers] = useState([]);
  const [newName,  setNewName] = useState('');
  const [newRate,  setNewRate] = useState('');
  const [elapsed,  setElapsed] = useState(0);
  const [costUSD,  setCostUSD] = useState(0);
  const [startTs,  setStartTs] = useState(null);
  const [saving,   setSaving]  = useState(false);
  const timerRef = useRef(null);

  const sym = CURRENCIES[currency]?.symbol || '$';

  // Clean up on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  const addMember = () => {
    if (!newName.trim() || !newRate) return;
    setMembers(ms => [...ms, { id: Date.now(), name: newName.trim(), rateUSD: toUSD(parseFloat(newRate)), on: true }]);
    setNewName(''); setNewRate('');
  };

  const toggleMember = (id) => setMembers(ms => ms.map(m => m.id === id ? { ...m, on: !m.on } : m));
  const removeMember = (id) => setMembers(ms => ms.filter(m => m.id !== id));

  const startMeeting = () => {
    const att = members.filter(m => m.on);
    if (!title.trim() || !att.length) return;
    setPhase('running'); setElapsed(0); setCostUSD(0);
    const ts = Date.now(); setStartTs(ts);
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1);
      setCostUSD(c => c + att.reduce((s, m) => s + m.rateUSD / 60, 0));
    }, 1000);
    toast.success(`"${title}" started!`);
  };

  const endMeeting = useCallback(async () => {
    clearInterval(timerRef.current);
    setPhase('ended'); setSaving(true);
    try {
      const att = members.filter(m => m.on);
      await axios.post('/api/meetings', {
        title, members: att.map(m => ({ name: m.name, ratePerMin: m.rateUSD })),
        duration: elapsed, totalCost: costUSD,
        startedAt: new Date(startTs).toISOString(), currency: 'USD'
      });
      toast.success('Meeting saved!');
    } catch {
      toast.error('Failed to save meeting');
    } finally {
      setSaving(false);
    }
  }, [members, title, elapsed, costUSD, startTs]);

  const reset = () => { setPhase('setup'); setTitle(''); setMembers([]); setElapsed(0); setCostUSD(0); };

  const att   = members.filter(m => m.on);
  const burnRate = att.reduce((s, m) => s + m.rateUSD, 0);

  return (
    <div className="live-wrap">
      <div className="page-header">
        <div className="page-title">
          {phase === 'running' ? <><span className="live-dot" /> Live Meeting</> : phase === 'ended' ? 'Meeting Ended' : 'New Meeting'}
        </div>
        <div className="page-sub">
          {phase === 'setup' ? 'Configure your meeting and start the cost tracker' :
           phase === 'running' ? `Tracking costs for "${title}"` : 'Meeting saved to history'}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

              {/* Left: Meeting info */}
              <div className="card">
                <div className="section-title">Meeting Details</div>
                <div className="field">
                  <label className="label">Meeting Title</label>
                  <input className="input" placeholder="e.g. Q4 Strategy Review" value={title} onChange={e => setTitle(e.target.value)} />
                </div>

                <div className="divider" />
                <div className="section-title">Add Attendee</div>

                <div style={{ background:'rgba(167,139,250,0.05)', border:'1px solid rgba(167,139,250,0.15)', borderRadius:9, padding:'8px 12px', marginBottom:12, fontSize:11, color:'var(--muted)' }}>
                  💱 Enter rate in <strong style={{ color:'var(--accent)' }}>{sym} {currency}</strong> per minute
                </div>

                <div className="row" style={{ marginBottom:12 }}>
                  <div className="field">
                    <label className="label">Name</label>
                    <input className="input" placeholder="Member name" value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addMember()} />
                  </div>
                  <div className="field" style={{ maxWidth:120 }}>
                    <label className="label">{sym}/min</label>
                    <input className="input" type="number" min="0" step="0.01" placeholder="2.50" value={newRate}
                      onChange={e => setNewRate(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addMember()} />
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-end', height:40 }} onClick={addMember}>+ Add</button>
                </div>

                {att.length > 0 && (
                  <div className="rate-preview">
                    <span style={{ fontSize:11, color:'var(--muted)' }}>Attending: {att.length} · Burn rate</span>
                    <span style={{ fontFamily:'var(--font-mono)', color:'var(--accent3)', fontSize:13 }}>{fmt(burnRate)}/min</span>
                  </div>
                )}

                <button className="btn btn-primary btn-full" style={{ marginTop:14 }}
                  disabled={!title.trim() || att.length === 0} onClick={startMeeting}>
                  ▶ Start Meeting
                </button>
              </div>

              {/* Right: Members list */}
              <div className="card">
                <div className="section-title">Attendees ({members.length})</div>
                {members.length === 0 ? (
                  <div className="empty" style={{ padding:'50px 0' }}>
                    <div className="empty-icon">👥</div>
                    <div className="empty-sub">Add members to get started</div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <AnimatePresence>
                      {members.map((m, i) => (
                        <motion.div key={m.id} className={`member-card ${m.on ? 'on' : 'off'}`}
                          initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
                          transition={{ duration:0.2 }}>
                          <div className="member-av" style={{ background:`linear-gradient(135deg,${COLORS[i%COLORS.length]},${COLORS[(i+2)%COLORS.length]})` }}>
                            {ini(m.name)}
                          </div>
                          <div className="member-info">
                            <div className="member-name">{m.name}</div>
                            <div className="member-rate">{fmt(m.rateUSD)}/min</div>
                          </div>
                          <button className={`toggle-btn ${m.on ? 'on' : ''}`} onClick={() => toggleMember(m.id)}>
                            {m.on ? '●' : '○'}
                          </button>
                          <button className="remove-btn" onClick={() => removeMember(m.id)}>✕</button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── RUNNING ── */}
        {phase === 'running' && (
          <motion.div key="running" initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

              {/* Ticker */}
              <div className="card ticker-card">
                <div className="ticker-label">Total Meeting Cost</div>
                <motion.div
                  className="ticker-value"
                  key={Math.floor(costUSD * 100)}
                  animate={{ scale:[1.02, 1] }}
                  transition={{ duration:0.15 }}
                >
                  {fmt(costUSD)}
                </motion.div>
                <div className="ticker-time">⏱ {clk(elapsed)}</div>
                <div className="ticker-bar">
                  <div className="ticker-fill" style={{ width:`${Math.min((elapsed/3600)*100,100)}%` }} />
                </div>
                <div className="ticker-burn">{fmt(burnRate)}/min burning</div>

                <div className="ticker-chips">
                  <div className="chip"><div className="chip-v" style={{ color:'var(--accent)' }}>{att.length}</div><div className="chip-l">People</div></div>
                  <div className="chip"><div className="chip-v" style={{ color:'var(--warn)', fontSize:13 }}>{clk(elapsed)}</div><div className="chip-l">Elapsed</div></div>
                  <div className="chip"><div className="chip-v" style={{ color:'var(--accent3)', fontSize:12 }}>{fmt(costUSD/Math.max(elapsed/60,0.01))}<span style={{ fontSize:9 }}>/m</span></div><div className="chip-l">Avg/min</div></div>
                </div>

                <button className="btn btn-danger btn-full" style={{ marginTop:16 }} onClick={endMeeting}>
                  ■ End Meeting
                </button>
              </div>

              {/* Per member */}
              <div className="card">
                <div className="section-title">Per Attendee</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {att.map((m, i) => {
                    const mc = (m.rateUSD / 60) * elapsed;
                    const pct = costUSD > 0 ? (mc / costUSD) * 100 : 0;
                    return (
                      <div key={m.id} className="member-card on">
                        <div className="member-av" style={{ background:`linear-gradient(135deg,${COLORS[i%COLORS.length]},${COLORS[(i+2)%COLORS.length]})`, fontSize:11 }}>
                          {ini(m.name)}
                        </div>
                        <div className="member-info">
                          <div className="member-name">{m.name}</div>
                          <div className="member-rate">{fmt(m.rateUSD)}/min</div>
                          <div className="mini-bar"><div style={{ width:`${pct}%`, background:COLORS[i%COLORS.length] }} /></div>
                        </div>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:COLORS[i%COLORS.length], fontWeight:500 }}>
                          {fmt(mc)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ENDED ── */}
        {phase === 'ended' && (
          <motion.div key="ended" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="card" style={{ maxWidth:520, margin:'0 auto', textAlign:'center', padding:'48px 40px' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, marginBottom:6 }}>{title}</div>
            <div style={{ color:'var(--muted)', marginBottom:24, fontSize:13 }}>Meeting ended and saved</div>
            <div style={{ display:'flex', justifyContent:'center', gap:24, marginBottom:28 }}>
              <div><div style={{ fontFamily:'var(--font-mono)', fontSize:22, color:'var(--accent3)' }}>{fmt(costUSD)}</div><div style={{ fontSize:11, color:'var(--muted)' }}>Total Cost</div></div>
              <div><div style={{ fontFamily:'var(--font-mono)', fontSize:22, color:'var(--warn)' }}>{clk(elapsed)}</div><div style={{ fontSize:11, color:'var(--muted)' }}>Duration</div></div>
              <div><div style={{ fontFamily:'var(--font-mono)', fontSize:22, color:'var(--accent)' }}>{att.length}</div><div style={{ fontSize:11, color:'var(--muted)' }}>Attendees</div></div>
            </div>
            {saving ? <div className="spinner" style={{ margin:'0 auto' }} /> :
              <button className="btn btn-primary" onClick={reset}>Start Another Meeting</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
