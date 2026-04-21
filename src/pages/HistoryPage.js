import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useCurrency } from '../hooks/useCurrency';
import './HistoryPage.css';

const COLORS = ['#a78bfa','#f472b6','#34d399','#fbbf24','#f87171','#60a5fa'];
const ini = (n) => n.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2);
const clk = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; return [h>0?pad(h):null,pad(m),pad(sc)].filter(Boolean).join(':'); };
const pad = (n) => String(n).padStart(2,'0');

export default function HistoryPage() {
  const { fmt }         = useCurrency();
  const [meetings, setMeetings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState('');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    axios.get('/api/meetings')
      .then(r => setMeetings(r.data.meetings || []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const deleteMeeting = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`/api/meetings/${id}`);
      setMeetings(ms => ms.filter(m => m._id !== id));
      if (selected?._id === id) setSelected(null);
      toast.success('Meeting deleted');
    } catch { toast.error('Delete failed'); }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear all meeting history?')) return;
    setClearing(true);
    try {
      await axios.delete('/api/meetings');
      setMeetings([]); setSelected(null);
      toast.success('History cleared');
    } catch { toast.error('Failed to clear'); }
    finally { setClearing(false); }
  };

  const filtered = meetings.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));
  const totalCost = meetings.reduce((s, m) => s + m.totalCost, 0);
  const totalTime = meetings.reduce((s, m) => s + m.duration, 0);

  return (
    <div>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div className="page-title">Meeting History</div>
            <div className="page-sub">{meetings.length} meetings · {fmt(totalCost)} total · {clk(totalTime)} total time</div>
          </div>
          {meetings.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={clearAll} disabled={clearing}>
              {clearing ? <span className="spinner-sm" /> : '🗑'} Clear All
            </button>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap:20 }}>
        {/* List */}
        <div>
          <div className="field" style={{ marginBottom:16 }}>
            <input className="input" placeholder="🔍  Search meetings..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="empty"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📊</div>
              <div className="empty-text">{search ? 'No results found' : 'No meetings yet'}</div>
              <div className="empty-sub">{!search && 'Start a meeting from the Live tab'}</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <AnimatePresence>
                {filtered.map((m, i) => (
                  <motion.div
                    key={m._id}
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    exit={{ opacity:0, x:-20 }}
                    transition={{ delay: i * 0.03 }}
                    className={`history-row ${selected?._id === m._id ? 'active' : ''}`}
                    onClick={() => setSelected(s => s?._id === m._id ? null : m)}
                  >
                    <div className="hist-av" style={{ background:`linear-gradient(135deg,${COLORS[i%COLORS.length]},${COLORS[(i+2)%COLORS.length]})` }}>
                      {m.title?.[0]?.toUpperCase()}
                    </div>
                    <div className="hist-info">
                      <div className="hist-title">{m.title}</div>
                      <div className="hist-meta">
                        📅 {format(new Date(m.startedAt), 'MMM d, yyyy')}
                        <span className="dot" />
                        ⏱ {clk(m.duration)}
                        <span className="dot" />
                        👥 {m.members?.length}
                      </div>
                      <div className="hist-tags">
                        {m.members?.slice(0,3).map(mem => (
                          <span key={mem.name} className="hist-tag">{mem.name}</span>
                        ))}
                        {(m.members?.length || 0) > 3 && <span className="hist-tag">+{m.members.length - 3}</span>}
                      </div>
                    </div>
                    <div className="hist-right">
                      <div className="hist-cost">{fmt(m.totalCost)}</div>
                      <div className="hist-dur">{clk(m.duration)}</div>
                      <button className="hist-del" onClick={e => deleteMeeting(m._id, e)}>✕</button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Detail drawer */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="drawer"
              initial={{ opacity:0, x:30 }}
              animate={{ opacity:1, x:0 }}
              exit={{ opacity:0, x:30 }}
              transition={{ duration:0.25 }}
              className="card"
              style={{ alignSelf:'flex-start', position:'sticky', top:0 }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:800 }}>{selected.title}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
              </div>

              <div style={{ fontSize:12, color:'var(--muted)', marginBottom:16 }}>
                {format(new Date(selected.startedAt), 'MMMM d, yyyy · h:mm a')}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
                {[
                  { l:'Total Cost', v: fmt(selected.totalCost), c:'var(--accent3)' },
                  { l:'Duration',   v: clk(selected.duration),   c:'var(--warn)' },
                  { l:'Attendees',  v: selected.members?.length,  c:'var(--accent)' },
                  { l:'Avg/Person', v: fmt(selected.totalCost / Math.max(selected.members?.length,1)), c:'var(--accent2)' },
                ].map(s => (
                  <div key={s.l} className="card card-sm" style={{ background:'var(--surface2)' }}>
                    <div style={{ fontSize:10, color:'var(--muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'1px', fontWeight:700 }}>{s.l}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:16, color:s.c, fontWeight:500 }}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="section-title">Per Attendee</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {selected.members?.map((m, i) => {
                  const mc = (m.ratePerMin * selected.duration) / 60;
                  const pct = selected.totalCost > 0 ? (mc / selected.totalCost) * 100 : 0;
                  return (
                    <div key={m.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--surface2)', borderRadius:9, border:'1px solid var(--border)' }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${COLORS[i%COLORS.length]},${COLORS[(i+2)%COLORS.length]})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'white', fontFamily:'var(--font-display)', flexShrink:0 }}>
                        {ini(m.name)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:600 }}>{m.name}</div>
                        <div style={{ height:3, background:'var(--border)', borderRadius:2, marginTop:5, overflow:'hidden' }}>
                          <div style={{ width:`${pct}%`, height:'100%', background:COLORS[i%COLORS.length], borderRadius:2 }} />
                        </div>
                      </div>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:COLORS[i%COLORS.length], flexShrink:0 }}>{fmt(mc)}</div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
