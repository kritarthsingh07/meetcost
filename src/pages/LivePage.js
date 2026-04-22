import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
import './LivePage.css';

const COLORS = ['#1a8a7a','#e8630a','#3d6b4f','#c9840a','#6355b8','#2eb89a'];
const ini = (n) => n.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
const clk = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60;
  return [h > 0 ? pad(h) : null, pad(m), pad(sc)].filter(Boolean).join(':');
};
const pad = (n) => String(n).padStart(2, '0');

export default function LivePage() {
  const { fmt, toUSD, currency } = useCurrency();

  const [phase,   setPhase]   = useState('setup');
  const [title,   setTitle]   = useState('');
  const [members, setMembers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');
  const [saving,  setSaving]  = useState(false);

  // Use refs for live timer values so endMeeting always reads current numbers
  const elapsedRef  = useRef(0);
  const costUSDRef  = useRef(0);
  const startTsRef  = useRef(null);
  const timerRef    = useRef(null);
  const membersRef  = useRef([]);  // mirror of members state for use inside callbacks
  const titleRef    = useRef('');

  // Keep display state for rendering
  const [elapsed,  setElapsed]  = useState(0);
  const [costUSD,  setCostUSD]  = useState(0);

  // Mirror state into refs every render
  useEffect(() => { membersRef.current = members; }, [members]);
  useEffect(() => { titleRef.current   = title;   }, [title]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const sym = CURRENCIES[currency]?.symbol || '$';

  const addMember = () => {
    if (!newName.trim() || !newRate) return;
    setMembers(ms => [...ms, {
      id: Date.now(),
      name: newName.trim(),
      rateUSD: toUSD(parseFloat(newRate)),
      on: true
    }]);
    setNewName(''); setNewRate('');
  };

  const toggleMember = (id) =>
    setMembers(ms => ms.map(m => m.id === id ? { ...m, on: !m.on } : m));

  const removeMember = (id) =>
    setMembers(ms => ms.filter(m => m.id !== id));

  const startMeeting = () => {
    const att = members.filter(m => m.on);
    if (!title.trim() || !att.length) return;

    // Reset refs
    elapsedRef.current  = 0;
    costUSDRef.current  = 0;
    startTsRef.current  = Date.now();
    setElapsed(0);
    setCostUSD(0);
    setPhase('running');

    timerRef.current = setInterval(() => {
      const activeMems = membersRef.current.filter(m => m.on);
      const burnPerSec = activeMems.reduce((s, m) => s + m.rateUSD / 60, 0);

      elapsedRef.current  += 1;
      costUSDRef.current  += burnPerSec;

      setElapsed(elapsedRef.current);
      setCostUSD(costUSDRef.current);
    }, 1000);

    toast.success(`"${title}" started!`);
  };

  const endMeeting = async () => {
    // Stop timer immediately
    clearInterval(timerRef.current);

    // Read final values from refs — NOT from state (avoids stale closure)
    const finalElapsed  = elapsedRef.current;
    const finalCost     = costUSDRef.current;
    const finalStartTs  = startTsRef.current;
    const finalMembers  = membersRef.current.filter(m => m.on);
    const finalTitle    = titleRef.current;

    setSaving(true);

    try {
      await axios.post('/api/meetings', {
        title:     finalTitle,
        members:   finalMembers.map(m => ({ name: m.name, ratePerMin: m.rateUSD })),
        duration:  finalElapsed,
        totalCost: finalCost,
        startedAt: new Date(finalStartTs).toISOString(),
        currency:  'USD'
      });

      toast.success('Meeting saved!');
      setPhase('ended');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unknown error';
      toast.error(`Save failed: ${msg}`);
      // Don't change phase — let user try again or stay on running screen
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    clearInterval(timerRef.current);
    elapsedRef.current = 0;
    costUSDRef.current = 0;
    setPhase('setup');
    setTitle('');
    setMembers([]);
    setElapsed(0);
    setCostUSD(0);
  };

  const att      = members.filter(m => m.on);
  const burnRate = att.reduce((s, m) => s + m.rateUSD, 0);

  return (
    <div className="live-wrap">
      <div className="page-header">
        <div className="page-title">
          {phase === 'running'
            ? <><span className="live-dot" /> Live Meeting</>
            : phase === 'ended'
            ? 'Meeting Ended'
            : 'New Meeting'}
        </div>
        <div className="page-sub">
          {phase === 'setup'   && 'Configure your meeting and start the cost tracker'}
          {phase === 'running' && `Tracking costs for "${title}"`}
          {phase === 'ended'   && 'Meeting saved to history'}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <motion.div key="setup"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Left — meeting details */}
              <div className="card">
                <div className="section-title">Meeting Details</div>
                <div className="field">
                  <label className="label">Meeting Title</label>
                  <input
                    className="input"
                    placeholder="e.g. Q4 Strategy Review"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>

                <div className="divider" />
                <div className="section-title">Add Attendee</div>

                <div style={{
                  background: 'rgba(26,138,122,0.05)',
                  border: '1px solid rgba(26,138,122,0.15)',
                  borderRadius: 8, padding: '8px 12px',
                  marginBottom: 12, fontSize: 11, color: 'var(--muted)'
                }}>
                  💱 Rate in <strong style={{ color: 'var(--accent)' }}>{sym} {currency}</strong> per minute
                </div>

                <div className="row" style={{ marginBottom: 12 }}>
                  <div className="field">
                    <label className="label">Name</label>
                    <input
                      className="input" placeholder="Member name"
                      value={newName} onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addMember()}
                    />
                  </div>
                  <div className="field" style={{ maxWidth: 120 }}>
                    <label className="label">{sym}/min</label>
                    <input
                      className="input" type="number" min="0" step="0.01" placeholder="2.50"
                      value={newRate} onChange={e => setNewRate(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addMember()}
                    />
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ alignSelf: 'flex-end', height: 40 }}
                    onClick={addMember}
                  >+ Add</button>
                </div>

                {att.length > 0 && (
                  <div className="rate-preview">
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Attending: {att.length} · Burn rate
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                      {fmt(burnRate)}/min
                    </span>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-full"
                  style={{ marginTop: 14 }}
                  disabled={!title.trim() || att.length === 0}
                  onClick={startMeeting}
                >
                  ▶ Start Meeting
                </button>
              </div>

              {/* Right — members list */}
              <div className="card">
                <div className="section-title">Attendees ({members.length})</div>
                {members.length === 0 ? (
                  <div className="empty" style={{ padding: '50px 0' }}>
                    <div className="empty-icon">👥</div>
                    <div className="empty-sub">Add members to get started</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <AnimatePresence>
                      {members.map((m, i) => (
                        <motion.div
                          key={m.id}
                          className={`member-card ${m.on ? 'on' : 'off'}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="member-av"
                            style={{ background: `linear-gradient(135deg,${COLORS[i % COLORS.length]},${COLORS[(i + 2) % COLORS.length]})` }}>
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
          <motion.div key="running"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Ticker */}
              <div className="card ticker-card">
                <div className="ticker-label">Total Meeting Cost</div>
                <div className="ticker-value">{fmt(costUSD)}</div>
                <div className="ticker-time">⏱ {clk(elapsed)}</div>
                <div className="ticker-bar">
                  <div className="ticker-fill" style={{ width: `${Math.min((elapsed / 3600) * 100, 100)}%` }} />
                </div>
                <div className="ticker-burn">{fmt(burnRate)}/min burning</div>

                <div className="ticker-chips">
                  <div className="chip">
                    <div className="chip-v" style={{ color: 'var(--accent)' }}>{att.length}</div>
                    <div className="chip-l">People</div>
                  </div>
                  <div className="chip">
                    <div className="chip-v" style={{ color: 'var(--warn)', fontSize: 13 }}>{clk(elapsed)}</div>
                    <div className="chip-l">Elapsed</div>
                  </div>
                  <div className="chip">
                    <div className="chip-v" style={{ color: 'var(--accent)', fontSize: 12 }}>
                      {fmt(costUSD / Math.max(elapsed / 60, 0.01))}
                      <span style={{ fontSize: 9 }}>/m</span>
                    </div>
                    <div className="chip-l">Avg/min</div>
                  </div>
                </div>

                <button
                  className="btn btn-danger btn-full"
                  style={{ marginTop: 16 }}
                  onClick={endMeeting}
                  disabled={saving}
                >
                  {saving ? <><span className="spinner-sm" style={{ borderTopColor: 'var(--danger)' }} /> Saving...</> : '■ End Meeting'}
                </button>
              </div>

              {/* Per member */}
              <div className="card">
                <div className="section-title">Per Attendee</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {att.map((m, i) => {
                    const mc  = (m.rateUSD / 60) * elapsed;
                    const pct = costUSD > 0 ? (mc / costUSD) * 100 : 0;
                    return (
                      <div key={m.id} className="member-card on">
                        <div className="member-av"
                          style={{ background: `linear-gradient(135deg,${COLORS[i % COLORS.length]},${COLORS[(i + 2) % COLORS.length]})`, fontSize: 11 }}>
                          {ini(m.name)}
                        </div>
                        <div className="member-info">
                          <div className="member-name">{m.name}</div>
                          <div className="member-rate">{fmt(m.rateUSD)}/min</div>
                          <div className="mini-bar">
                            <div style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: COLORS[i % COLORS.length], fontWeight: 600 }}>
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
          <motion.div key="ended"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
            style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '48px 40px' }}
          >
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, fontStyle: 'italic', marginBottom: 6 }}>
              {titleRef.current}
            </div>
            <div style={{ color: 'var(--muted)', marginBottom: 28, fontSize: 13 }}>
              Meeting ended and saved to history
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 32 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--accent)', fontWeight: 700 }}>
                  {fmt(costUSDRef.current)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Total Cost</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--warn)', fontWeight: 500 }}>
                  {clk(elapsedRef.current)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Duration</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--text)', fontWeight: 500 }}>
                  {membersRef.current.filter(m => m.on).length}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Attendees</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={reset}>
              ⊕ Start Another Meeting
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}