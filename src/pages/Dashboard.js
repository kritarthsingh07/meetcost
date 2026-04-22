import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import { format, subDays, isSameDay } from 'date-fns';

const PALETTE = ['#1a8a7a','#e8630a','#3d6b4f','#c9840a','#6355b8','#2eb89a'];

const stagger = (i) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay: i * 0.07, ease: [0.4,0,0.2,1] }
});

const fmtDur = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border2)',
      borderRadius: 10, padding: '9px 13px',
      boxShadow: 'var(--shadow)', fontFamily: 'var(--font-body)'
    }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--accent)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
        {payload[0].value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user }         = useAuth();
  const { fmt, toDisp }  = useCurrency();
  const [meetings, setMeetings] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    axios.get('/api/meetings')
      .then(r => setMeetings(r.data.meetings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalCost = meetings.reduce((s, m) => s + m.totalCost, 0);
  const totalTime = meetings.reduce((s, m) => s + m.duration, 0);
  const avgCost   = meetings.length ? totalCost / meetings.length : 0;
  const thisWeek  = meetings.filter(m => new Date(m.startedAt) > subDays(new Date(), 7));

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayM = meetings.filter(m => isSameDay(new Date(m.startedAt), day));
    return {
      date: format(day, 'MMM d'),
      cost: parseFloat(toDisp(dayM.reduce((s, m) => s + m.totalCost, 0)).toFixed(2)),
      count: dayM.length,
    };
  });

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Header */}
      <motion.div className="page-header" {...stagger(0)}>
        <div className="page-title">
          {greeting},{' '}
          <span style={{ color: 'var(--accent)' }}>
            {user?.name?.split(' ')[0]}
          </span>
        </div>
        <div className="page-sub">Here's how your meetings have been spending your budget</div>
      </motion.div>

      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: 'Total Spent',  value: fmt(totalCost),                                          sub: `across ${meetings.length} meetings`, glow: '#1a8a7a' },
          { label: 'This Week',    value: fmt(thisWeek.reduce((s,m)=>s+m.totalCost,0)),             sub: `${thisWeek.length} meetings`,         glow: '#e8630a' },
          { label: 'Avg Per Meet', value: fmt(avgCost),                                             sub: 'per meeting',                          glow: '#3d6b4f' },
          { label: 'Time Invested',value: fmtDur(totalTime),                                        sub: 'total duration',                       glow: '#c9840a' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" style={{ '--glow': s.glow }} {...stagger(i + 1)}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: loading ? 'var(--muted2)' : 'var(--text)' }}>
              {loading ? '—' : s.value}
            </div>
            <div className="stat-sub">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        <motion.div className="card" {...stagger(5)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div className="section-heading" style={{ margin: 0, fontSize: 15 }}>Daily Cost</div>
            <span className="badge badge-teal">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1a8a7a" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#1a8a7a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="cost"
                stroke="#1a8a7a" strokeWidth={2.5}
                fill="url(#areaGrad)"
                dot={{ fill: '#1a8a7a', r: 3.5, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#1a8a7a' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div className="card" {...stagger(6)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div className="section-heading" style={{ margin: 0, fontSize: 15 }}>Cost by Member</div>
            <span className="badge badge-warm">Top spenders</span>
          </div>
          {memberData.length === 0 ? (
            <div className="empty" style={{ padding: '38px 0' }}>
              <div className="empty-icon">👥</div>
              <div className="empty-sub">No member data yet</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={memberData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cost" radius={[6,6,0,0]}>
                  {memberData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Recent meetings table */}
      <motion.div className="card" {...stagger(7)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="section-heading" style={{ margin: 0 }}>Recent Meetings</div>
          <Link to="/history" style={{ textDecoration: 'none' }}>
            <button className="btn btn-soft btn-sm">View all →</button>
          </Link>
        </div>

        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : meetings.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-text">No meetings recorded yet</div>
            <div className="empty-sub">Start tracking from the New Meeting tab</div>
            <Link to="/live" style={{ marginTop: 12 }}>
              <button className="btn btn-primary btn-sm">⊕ Start a Meeting</button>
            </Link>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 90px 80px',
              gap: 12, padding: '6px 14px',
              fontSize: 10, fontWeight: 700, letterSpacing: '1.2px',
              textTransform: 'uppercase', color: 'var(--muted)',
              fontFamily: 'var(--font-mono)',
              borderBottom: '1px solid var(--border)',
              marginBottom: 6
            }}>
              <span>Meeting</span>
              <span>Date</span>
              <span style={{ textAlign:'right' }}>Duration</span>
              <span style={{ textAlign:'right' }}>Cost</span>
            </div>

            {meetings.slice(0, 6).map((m, i) => (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 90px 80px',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 10,
                  alignItems: 'center',
                  transition: 'background 0.15s',
                  cursor: 'default',
                  borderBottom: i < Math.min(meetings.length,6) - 1 ? '1px solid var(--border)' : 'none'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Title + members */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    background: PALETTE[i % PALETTE.length],
                    opacity: 0.85,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'white',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {m.title?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                      {m.members?.length} {m.members?.length === 1 ? 'person' : 'people'}
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  {format(new Date(m.startedAt), 'MMM d, yyyy')}
                </div>

                {/* Duration */}
                <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {fmtDur(m.duration)}
                </div>

                {/* Cost */}
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14, fontWeight: 700,
                  color: 'var(--accent)', textAlign: 'right'
                }}>
                  {fmt(m.totalCost)}
                </div>
              </motion.div>
            ))}
          </>
        )}
      </motion.div>
    </div>
  );
}
