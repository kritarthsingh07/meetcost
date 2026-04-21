import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import { format, subDays, isSameDay } from 'date-fns';

const COLORS = ['#a78bfa','#f472b6','#34d399','#fbbf24','#f87171','#60a5fa'];

const card = (i) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: i * 0.06, ease: [0.4,0,0.2,1] }
});

export default function Dashboard() {
  const { user }        = useAuth();
  const { fmt, toDisp } = useCurrency();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    axios.get('/api/meetings')
      .then(r => setMeetings(r.data.meetings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalCost   = meetings.reduce((s, m) => s + m.totalCost, 0);
  const totalTime   = meetings.reduce((s, m) => s + m.duration, 0);
  const avgCost     = meetings.length ? totalCost / meetings.length : 0;
  const thisWeek    = meetings.filter(m => new Date(m.startedAt) > subDays(new Date(), 7));

  // Last 7 days chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayMeetings = meetings.filter(m => isSameDay(new Date(m.startedAt), day));
    return {
      date: format(day, 'MMM d'),
      cost: parseFloat(toDisp(dayMeetings.reduce((s, m) => s + m.totalCost, 0)).toFixed(2)),
      count: dayMeetings.length,
    };
  });

  // Per-member cost aggregation
  const memberMap = {};
  meetings.slice(0, 20).forEach(m => {
    m.members?.forEach(mem => {
      if (!memberMap[mem.name]) memberMap[mem.name] = 0;
      memberMap[mem.name] += (mem.ratePerMin * m.duration) / 60;
    });
  });
  const memberData = Object.entries(memberMap)
    .map(([name, cost]) => ({ name, cost: parseFloat(toDisp(cost).toFixed(2)) }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 6);

  const fmtDuration = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
        <div style={{ color:'var(--muted)', marginBottom:3 }}>{label}</div>
        <div style={{ color:'var(--accent)', fontFamily:'var(--font-mono)', fontWeight:500 }}>{payload[0].value}</div>
      </div>
    );
  };

  return (
    <div>
      <motion.div className="page-header" {...card(0)}>
        <div className="page-title">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},&nbsp;
          <span style={{ background:'linear-gradient(135deg,var(--accent),var(--accent2))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            {user?.name?.split(' ')[0]}
          </span>
        </div>
        <div className="page-sub">Here's your meeting cost overview</div>
      </motion.div>

      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Total Spent', value: fmt(totalCost), sub: `${meetings.length} meetings`, glow: '#a78bfa' },
          { label: 'This Week',   value: fmt(thisWeek.reduce((s,m)=>s+m.totalCost,0)), sub: `${thisWeek.length} meetings`, glow: '#f472b6' },
          { label: 'Avg Cost',    value: fmt(avgCost), sub: 'per meeting', glow: '#34d399' },
          { label: 'Time Spent',  value: fmtDuration(totalTime), sub: 'total duration', glow: '#fbbf24' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" style={{ '--glow': s.glow }} {...card(i + 1)}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{loading ? '—' : s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        <motion.div className="card" {...card(5)}>
          <div className="section-title" style={{ marginBottom:16 }}>Daily Cost — Last 7 Days</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cost" stroke="#a78bfa" strokeWidth={2} fill="url(#cg)" dot={{ fill:'#a78bfa', r:3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="card" {...card(6)}>
          <div className="section-title" style={{ marginBottom:16 }}>Cost by Member</div>
          {memberData.length === 0 ? (
            <div className="empty" style={{ padding:'40px 0' }}>
              <div className="empty-icon">👥</div>
              <div className="empty-sub">No member data yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={memberData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                <XAxis dataKey="name" tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:'var(--muted)', fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cost" radius={[5,5,0,0]}>
                  {memberData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Recent meetings */}
      <motion.div className="card" {...card(7)}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div className="section-title" style={{ margin:0 }}>Recent Meetings</div>
          <Link to="/history" style={{ fontSize:12, color:'var(--accent)', textDecoration:'none', fontWeight:600 }}>View all →</Link>
        </div>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : meetings.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📊</div>
            <div className="empty-text">No meetings recorded yet</div>
            <Link to="/live"><button className="btn btn-primary btn-sm" style={{ marginTop:10 }}>Start a Meeting</button></Link>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {meetings.slice(0, 5).map((m, i) => (
              <motion.div
                key={m._id}
                initial={{ opacity:0, x:-10 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display:'flex', alignItems:'center', gap:14,
                  padding:'12px 14px', background:'var(--surface2)',
                  borderRadius:10, border:'1px solid var(--border)'
                }}
              >
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background:`linear-gradient(135deg,${COLORS[i%COLORS.length]},${COLORS[(i+2)%COLORS.length]})`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:800, color:'white', fontFamily:'var(--font-display)'
                }}>
                  {m.title?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                    {format(new Date(m.startedAt), 'MMM d, yyyy')} · {m.members?.length} people
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--accent3)', fontWeight:500 }}>{fmt(m.totalCost)}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{fmtDuration(m.duration)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
