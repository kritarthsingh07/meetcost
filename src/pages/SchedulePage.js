import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format, isPast, differenceInMinutes } from 'date-fns';
import { useCurrency, CURRENCIES } from '../hooks/useCurrency';
const API_URL = process.env.REACT_APP_API_URL;



export default function SchedulePage() {
  const { fmt, toUSD, currency } = useCurrency();
  const [scheduled, setScheduled] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({ title:'', date:'', time:'', dur:'30' });
  const [members, setMembers] = useState([]);
  const [mn, setMn] = useState('');
  const [mr, setMr] = useState('');
  const sym = CURRENCIES[currency]?.symbol || '$';

  useEffect(() => {
    axios.get(`${API_URL}/api/schedule`)
      .then(r => setScheduled(r.data.scheduled || []))
      .catch(() => toast.error('Failed to load schedule'))
      .finally(() => setLoading(false));
  }, []);

  const addMember = () => {
    if (!mn.trim() || !mr) return;
    setMembers(ms => [...ms, { name: mn.trim(), rateUSD: toUSD(parseFloat(mr)) }]);
    setMn(''); setMr('');
  };

  const save = async () => {
  if (!form.title.trim() || !form.date || !form.time) {
    toast.error('Fill title, date and time');
    return;
  }

  const dt = new Date(`${form.date}T${form.time}`);
  if (isNaN(dt.getTime())) {
    toast.error('Invalid date/time');
    return;
  }

  setSaving(true);

  try {
    const r = await axios.post(`${API_URL}/api/schedule`, {
      title: form.title.trim(),
      date: dt.toISOString(),
      duration: parseInt(form.dur) || 30,
      members: members.map(m => ({
        name: m.name,
        ratePerMin: m.rateUSD
      }))
    });

    setScheduled(ss =>
      [...ss, r.data.scheduled].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      )
    );

    setForm({ title: '', date: '', time: '', dur: '30' });
    setMembers([]);
    setShowForm(false);

    toast.success('Meeting scheduled!');
  } catch (e) {
    toast.error(e.response?.data?.message || 'Failed to save');
  } finally {
    setSaving(false);
  }
};

  const remove = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/schedule/${id}`);
      setScheduled(ss => ss.filter(s => s._id !== id));
      toast.success('Removed');
    } catch { toast.error('Failed to remove'); }
  };

  const upcoming = scheduled.filter(s => !isPast(new Date(s.date)));
  const past     = scheduled.filter(s =>  isPast(new Date(s.date)));

  const MeetingCard = ({ s, i }) => {
    const dt       = new Date(s.date);
    const gone     = isPast(dt);
    const soon     = !gone && differenceInMinutes(dt, new Date()) < 60;
    const estCost  = s.members?.reduce((a,m) => a + m.ratePerMin, 0) * (s.duration || 30);

    return (
      <motion.div
        initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
        style={{
          display:'flex', gap:16, padding:'16px 18px',
          background:'var(--surface)', border:`1px solid ${soon ? 'rgba(251,191,36,0.35)' : gone ? 'var(--border)' : 'rgba(167,139,250,0.2)'}`,
          borderRadius:'var(--radius)', borderLeft:`3px solid ${soon ? 'var(--warn)' : gone ? 'var(--muted)' : 'var(--accent)'}`,
          opacity: gone ? 0.6 : 1
        }}
      >
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <div style={{ fontWeight:600, fontSize:14, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.title}</div>
            {soon && <span className="badge badge-yellow">⚡ Soon</span>}
            {!gone && !soon && <span className="badge badge-purple">Upcoming</span>}
            {gone && <span className="badge" style={{ background:'rgba(107,107,138,0.1)', color:'var(--muted)', border:'1px solid var(--border)' }}>Past</span>}
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>
            📅 {format(dt, 'MMM d, yyyy · h:mm a')}
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', display:'flex', gap:14 }}>
            <span>⏱ {s.duration}min</span>
            <span>👥 {s.members?.length || 0} people</span>
            <span style={{ color:'var(--accent3)' }}>Est. {fmt(estCost || 0)}</span>
          </div>
          {s.members?.length > 0 && (
            <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
              {s.members.map(m => <span key={m.name} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:5, padding:'2px 7px', fontSize:10, color:'var(--muted)' }}>{m.name}</span>)}
            </div>
          )}
        </div>
        {!gone && (
          <button className="btn btn-danger btn-sm" style={{ alignSelf:'flex-start', flexShrink:0 }} onClick={() => remove(s._id)}>✕</button>
        )}
      </motion.div>
    );
  };

  return (
    <div style={{ maxWidth:700 }}>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div className="page-title">Schedule</div>
            <div className="page-sub">{upcoming.length} upcoming · {past.length} past</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(f => !f)}>
            {showForm ? '✕ Cancel' : '+ Schedule Meeting'}
          </button>
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            style={{ overflow:'hidden', marginBottom:20 }}
          >
            <div className="card" style={{ marginBottom:0 }}>
              <div className="section-title">New Scheduled Meeting</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="field" style={{ gridColumn:'1/-1' }}>
                  <label className="label">Title</label>
                  <input className="input" placeholder="Weekly Standup" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
                </div>
                <div className="field">
                  <label className="label">Date</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} />
                </div>
                <div className="field">
                  <label className="label">Time</label>
                  <input className="input" type="time" value={form.time} onChange={e => setForm(f=>({...f,time:e.target.value}))} />
                </div>
                <div className="field">
                  <label className="label">Duration (min)</label>
                  <input className="input" type="number" min="1" value={form.dur} onChange={e => setForm(f=>({...f,dur:e.target.value}))} />
                </div>
              </div>

              <div className="divider" />
              <div className="section-title">Add Members (optional)</div>
              <div className="row" style={{ marginBottom:10 }}>
                <div className="field">
                  <label className="label">Name</label>
                  <input className="input" placeholder="Member name" value={mn} onChange={e=>setMn(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addMember()} />
                </div>
                <div className="field" style={{ maxWidth:120 }}>
                  <label className="label">{sym}/min</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="2.50" value={mr} onChange={e=>setMr(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addMember()} />
                </div>
                <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-end', height:40 }} onClick={addMember}>+ Add</button>
              </div>
              {members.length > 0 && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                  {members.map((m,i) => (
                    <span key={i} style={{ background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.25)', borderRadius:20, padding:'4px 10px', fontSize:11, color:'var(--accent)', display:'flex', alignItems:'center', gap:6 }}>
                      {m.name} · {fmt(m.rateUSD)}/min
                      <button style={{ background:'none', border:'none', color:'inherit', cursor:'pointer', padding:0, fontSize:11 }} onClick={()=>setMembers(ms=>ms.filter((_,j)=>j!==i))}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>
                {saving ? <span className="spinner-sm" /> : '📅 Save Schedule'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="empty"><div className="spinner" /></div>
      ) : scheduled.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📅</div>
          <div className="empty-text">No meetings scheduled</div>
          <div className="empty-sub">Schedule a meeting to see it here</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {upcoming.length > 0 && <>
            <div className="section-title">Upcoming</div>
            {upcoming.map((s,i) => <MeetingCard key={s._id} s={s} i={i} />)}
          </>}
          {past.length > 0 && <>
            <div className="section-title" style={{ marginTop:14 }}>Past</div>
            {past.map((s,i) => <MeetingCard key={s._id} s={s} i={i} />)}
          </>}
        </div>
      )}
    </div>
  );
}
